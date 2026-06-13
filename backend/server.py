from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import re
import csv
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from openpyxl import load_workbook
from pypdf import PdfReader

# ------------ Setup ------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

CLIENTS_DATA_DIR = Path(os.environ.get('CLIENTS_DATA_DIR', '/app/clients-data'))
CLIENTS_DATA_DIR.mkdir(parents=True, exist_ok=True)

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

app = FastAPI(title="DM Accounting API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("dm")


# ------------ Helpers ------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=8), "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=28800, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ------------ Models ------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ClientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: Optional[str] = ""
    phone: Optional[str] = ""
    afm: Optional[str] = ""  # ΑΦΜ
    books_type: Optional[str] = "simple"  # "simple" (απλογραφικά) | "double" (διπλογραφικά)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company: Optional[str] = ""
    phone: Optional[str] = ""
    afm: Optional[str] = ""


# ------------ File Parsing ------------
TYPE_KEYWORDS = {
    "income": ["εσοδα", "έσοδα", "income", "revenue", "πωληση", "πώληση", "sales"],
    "expense": ["εξοδα", "έξοδα", "expense", "expenses", "αγορα", "αγορά", "purchase"],
    "vat": ["φπα", "φπα", "vat"],
    "payment": ["πληρωμη", "πληρωμή", "payment", "paid"],
    "obligation": ["οφειλη", "οφειλή", "obligation", "due", "εκκρεμη", "εκκρεμή"],
}


def classify_type(s: str) -> Optional[str]:
    if not s:
        return None
    s = str(s).strip().lower()
    for t, words in TYPE_KEYWORDS.items():
        for w in words:
            if w in s:
                return t
    return None


def parse_amount(v) -> Optional[float]:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace("€", "").replace(" ", "")
    # Greek decimal: 1.234,56
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(re.sub(r"[^0-9\.\-]", "", s))
    except Exception:
        return None


def parse_date(v) -> Optional[str]:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except Exception:
            continue
    return s[:10] if len(s) >= 10 else None


def normalize_row(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Lowercase keys
    lr = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
    # find fields
    date_val = lr.get("date") or lr.get("ημερομηνια") or lr.get("ημερομηνία")
    type_val = lr.get("type") or lr.get("κατηγορια") or lr.get("κατηγορία") or lr.get("τυπος") or lr.get("τύπος")
    amt_val = lr.get("amount") or lr.get("ποσο") or lr.get("ποσό") or lr.get("αξια") or lr.get("αξία")
    desc_val = lr.get("description") or lr.get("περιγραφη") or lr.get("περιγραφή") or ""
    t = classify_type(type_val)
    a = parse_amount(amt_val)
    if t is None or a is None:
        return None
    return {"date": parse_date(date_val) or "", "type": t, "amount": a, "description": str(desc_val)[:200]}


def parse_xlsx(path: Path) -> List[Dict[str, Any]]:
    out = []
    try:
        wb = load_workbook(filename=str(path), data_only=True, read_only=True)
        for ws in wb.worksheets:
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                continue
            headers = [str(h).strip() if h is not None else "" for h in rows[0]]
            for r in rows[1:]:
                if not r:
                    continue
                row_dict = {headers[i]: r[i] for i in range(min(len(headers), len(r)))}
                norm = normalize_row(row_dict)
                if norm:
                    out.append(norm)
    except Exception as e:
        logger.error(f"xlsx parse error {path}: {e}")
    return out


def parse_csv(path: Path) -> List[Dict[str, Any]]:
    out = []
    try:
        with open(path, "r", encoding="utf-8-sig", errors="ignore") as f:
            sample = f.read(2048)
            f.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            except Exception:
                dialect = csv.excel
            reader = csv.DictReader(f, dialect=dialect)
            for row in reader:
                norm = normalize_row(row)
                if norm:
                    out.append(norm)
    except Exception as e:
        logger.error(f"csv parse error {path}: {e}")
    return out


def parse_pdf(path: Path) -> List[Dict[str, Any]]:
    out = []
    try:
        reader = PdfReader(str(path))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
        # Find lines like: <label> <amount>
        for line in text.splitlines():
            line_lower = line.lower()
            t = classify_type(line_lower)
            if not t:
                continue
            amounts = re.findall(r"[-+]?\d[\d\.\,]*", line)
            if not amounts:
                continue
            amt = parse_amount(amounts[-1])
            if amt is None:
                continue
            out.append({"date": "", "type": t, "amount": amt, "description": line.strip()[:200]})
    except Exception as e:
        logger.error(f"pdf parse error {path}: {e}")
    return out


def aggregate_records(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_income = sum(r["amount"] for r in records if r["type"] == "income")
    total_expense = sum(r["amount"] for r in records if r["type"] == "expense")
    total_vat = sum(r["amount"] for r in records if r["type"] == "vat")
    total_obligations = sum(r["amount"] for r in records if r["type"] == "obligation")
    total_payments = sum(r["amount"] for r in records if r["type"] == "payment")
    profit = total_income - total_expense

    # monthly aggregation
    monthly: Dict[str, Dict[str, float]] = {}
    for r in records:
        d = r.get("date") or ""
        month = d[:7] if len(d) >= 7 else "Άγνωστο"
        m = monthly.setdefault(month, {"month": month, "income": 0.0, "expense": 0.0, "profit": 0.0, "vat": 0.0})
        if r["type"] == "income":
            m["income"] += r["amount"]
        elif r["type"] == "expense":
            m["expense"] += r["amount"]
        elif r["type"] == "vat":
            m["vat"] += r["amount"]
        m["profit"] = m["income"] - m["expense"]
    monthly_list = sorted(monthly.values(), key=lambda x: x["month"])

    return {
        "totals": {
            "income": round(total_income, 2),
            "expense": round(total_expense, 2),
            "profit": round(profit, 2),
            "vat": round(total_vat, 2),
            "obligations": round(total_obligations, 2),
            "payments": round(total_payments, 2),
        },
        "monthly": monthly_list,
        "records_count": len(records),
    }


def scan_client_folder(client_id: str) -> Dict[str, Any]:
    folder = CLIENTS_DATA_DIR / client_id
    folder.mkdir(parents=True, exist_ok=True)
    records: List[Dict[str, Any]] = []
    files_info = []
    for f in sorted(folder.iterdir()):
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        size = f.stat().st_size
        files_info.append({"name": f.name, "size": size, "ext": ext,
                           "modified": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat()})
        if ext == ".xlsx":
            records.extend(parse_xlsx(f))
        elif ext == ".csv":
            records.extend(parse_csv(f))
        elif ext == ".pdf":
            records.extend(parse_pdf(f))
    agg = aggregate_records(records)
    agg["files"] = files_info
    agg["recent"] = sorted(records, key=lambda r: r.get("date") or "", reverse=True)[:20]
    return agg


# ------------ Trial Balance (Απλογραφικά Βιβλία) ------------
GREEK_MONTHS = [
    "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
    "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
]
GREEK_MONTHS_GEN = [  # genitive forms sometimes found in headers
    "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
    "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"
]

CATEGORY_LABELS = {
    "1": "Πάγια",
    "2": "Αγορές / Εμπορεύματα / Πρώτες Ύλες",
    "54": "ΦΠΑ",
    "6": "Έξοδα",
    "7": "Έσοδα",
}


def _is_primary_code(code: str) -> bool:
    """Primary account: no '-' separator (e.g. '54' yes, '54-0087' no)."""
    c = str(code or "").strip()
    return bool(c) and "-" not in c and "." not in c


def _category_for(code: str) -> Optional[str]:
    c = str(code or "").strip()
    if c == "54":
        return "54"
    if not c:
        return None
    first = c[0]
    if first in ("1", "2", "6", "7"):
        return first
    return None


def _detect_month_columns(headers: List[str]) -> Dict[int, Dict[str, int]]:
    """Map month index (1-12) -> {"debit": col_idx, "credit": col_idx, "balance": col_idx}, year detected."""
    mapping: Dict[int, Dict[str, int]] = {}
    for idx, h in enumerate(headers):
        if not h:
            continue
        h_str = str(h)
        h_lower = h_str.lower()
        kind = None
        if "χρέωση" in h_lower or "χρεωση" in h_lower:
            kind = "debit"
        elif "πίστωση" in h_lower or "πιστωση" in h_lower:
            kind = "credit"
        elif "υπόλοιπο" in h_lower or "υπολοιπο" in h_lower:
            kind = "balance"
        if not kind:
            continue
        # find month
        month_idx = None
        for i, name in enumerate(GREEK_MONTHS, start=1):
            if name.lower() in h_lower or GREEK_MONTHS_GEN[i - 1].lower() in h_lower:
                month_idx = i
                break
        if month_idx is None:
            continue
        mapping.setdefault(month_idx, {})[kind] = idx
    return mapping


def _read_workbook_rows(path: Path) -> Optional[List[List[Any]]]:
    """Return list of rows (each a list of cell values). Supports .xlsx and .xls."""
    ext = path.suffix.lower()
    try:
        if ext == ".xlsx":
            wb = load_workbook(filename=str(path), data_only=True, read_only=True)
            ws = wb.worksheets[0]
            return [list(r) for r in ws.iter_rows(values_only=True)]
        if ext == ".xls":
            import xlrd
            wb = xlrd.open_workbook(str(path))
            s = wb.sheet_by_index(0)
            return [[s.cell_value(r, c) for c in range(s.ncols)] for r in range(s.nrows)]
    except Exception as e:
        logger.error(f"workbook open error {path}: {e}")
    return None


def parse_trial_balance(path: Path) -> Optional[Dict[str, Any]]:
    """Parse a Greek trial-balance workbook. Returns {year, months, accounts} or None."""
    rows = _read_workbook_rows(path)
    if not rows or len(rows) < 2:
        return None
    headers = [("" if c is None else str(c)).strip() for c in rows[0]]
    # Must include "Λογαριασμός" or first row clearly looks like header
    if not any("λογαριασμ" in h.lower() for h in headers):
        return None
    month_cols = _detect_month_columns(headers)
    if not month_cols:
        return None

    # detect year from headers
    year = None
    for h in headers:
        m = re.search(r"(20\d{2})", h)
        if m:
            year = int(m.group(1))
            break

    # iterate data rows
    accounts: List[Dict[str, Any]] = []
    for r in rows[1:]:
        if not r or all(c is None or str(c).strip() == "" for c in r):
            continue
        code = str(r[0] if len(r) > 0 else "").strip()
        if not code or not _is_primary_code(code):
            continue
        category = _category_for(code)
        if category is None:
            continue
        desc = str(r[1] if len(r) > 1 else "").strip()
        monthly = {}
        for m_idx, cols in month_cols.items():
            debit = parse_amount(r[cols["debit"]]) if "debit" in cols and cols["debit"] < len(r) else None
            credit = parse_amount(r[cols["credit"]]) if "credit" in cols and cols["credit"] < len(r) else None
            monthly[m_idx] = {"debit": debit or 0.0, "credit": credit or 0.0}
        accounts.append({
            "code": code,
            "description": desc,
            "category": category,
            "category_label": CATEGORY_LABELS.get(category, category),
            "monthly": monthly,
        })

    return {
        "year": year,
        "months_available": sorted(month_cols.keys()),
        "accounts": accounts,
    }


def latest_trial_balance(client_id: str) -> Optional[Dict[str, Any]]:
    """Return the most recently uploaded trial balance for a client, with upload timestamp."""
    folder = CLIENTS_DATA_DIR / client_id
    if not folder.exists():
        return None
    candidates = []
    for f in folder.iterdir():
        if f.is_file() and f.suffix.lower() in (".xls", ".xlsx"):
            candidates.append(f)
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    for f in candidates:
        parsed = parse_trial_balance(f)
        if parsed and parsed.get("accounts"):
            mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
            parsed["source_file"] = f.name
            parsed["uploaded_at"] = mtime.isoformat()
            return parsed
    return None


def build_simple_books(client_id: str) -> Dict[str, Any]:
    """Build display data for απλογραφικά: target month = current_month - 3."""
    today = datetime.now(timezone.utc)
    # target month = current - 3 (e.g. June -> March)
    target_month = today.month - 3
    target_year = today.year
    while target_month <= 0:
        target_month += 12
        target_year -= 1

    tb = latest_trial_balance(client_id)
    if not tb:
        return {
            "has_data": False,
            "target_month": target_month,
            "target_year": target_year,
            "target_month_name": GREEK_MONTHS[target_month - 1],
        }

    # If target month has no data, fall back to the latest month with data
    months_with_data = set()
    for acc in tb["accounts"]:
        for m_idx, vals in acc["monthly"].items():
            if vals["debit"] or vals["credit"]:
                months_with_data.add(m_idx)

    display_month = target_month
    fallback_used = False
    if target_month not in months_with_data and months_with_data:
        display_month = max(months_with_data)
        fallback_used = True

    # build category groups for display month
    groups: Dict[str, Dict[str, Any]] = {}
    for cat_key, cat_label in CATEGORY_LABELS.items():
        groups[cat_key] = {"key": cat_key, "label": cat_label, "rows": [], "total_debit": 0.0, "total_credit": 0.0}

    for acc in tb["accounts"]:
        vals = acc["monthly"].get(display_month, {"debit": 0.0, "credit": 0.0})
        if vals["debit"] == 0 and vals["credit"] == 0:
            continue
        g = groups[acc["category"]]
        g["rows"].append({
            "code": acc["code"],
            "description": acc["description"],
            "debit": round(vals["debit"], 2),
            "credit": round(vals["credit"], 2),
        })
        g["total_debit"] += vals["debit"]
        g["total_credit"] += vals["credit"]

    for g in groups.values():
        g["total_debit"] = round(g["total_debit"], 2)
        g["total_credit"] = round(g["total_credit"], 2)

    return {
        "has_data": True,
        "year": tb.get("year") or display_month and target_year,
        "source_file": tb["source_file"],
        "uploaded_at": tb["uploaded_at"],
        "target_month": target_month,
        "target_year": target_year,
        "target_month_name": GREEK_MONTHS[target_month - 1],
        "display_month": display_month,
        "display_month_name": GREEK_MONTHS[display_month - 1],
        "fallback_used": fallback_used,
        "groups": list(groups.values()),
    }


# ------------ Routes: Auth ------------
@api.get("/")
async def root():
    return {"app": "DM Accounting", "status": "ok"}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Λάθος email ή κωδικός")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "company": user.get("company", ""),
            "phone": user.get("phone", ""), "afm": user.get("afm", ""),
            "books_type": user.get("books_type", "simple"),
            "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ------------ Routes: Admin - Clients ------------
@api.get("/admin/clients")
async def list_clients(admin: dict = Depends(require_admin)):
    cursor = db.users.find({"role": "client"}, {"password_hash": 0, "_id": 0})
    clients = await cursor.to_list(length=1000)
    return clients


@api.post("/admin/clients")
async def create_client(payload: ClientCreate, admin: dict = Depends(require_admin)):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ήδη υπάρχει")
    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "company": payload.company or "",
        "phone": payload.phone or "",
        "afm": payload.afm or "",
        "books_type": payload.books_type if payload.books_type in ("simple", "double") else "simple",
        "role": "client",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    # create folder
    (CLIENTS_DATA_DIR / new_id).mkdir(parents=True, exist_ok=True)
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "actor": admin["email"],
        "action": "create_client",
        "target": email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": new_id, "email": email, "name": payload.name, "role": "client",
            "company": doc["company"], "phone": doc["phone"], "afm": doc["afm"],
            "books_type": doc["books_type"]}


@api.delete("/admin/clients/{client_id}")
async def delete_client(client_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"id": client_id, "role": "client"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "actor": admin["email"],
        "action": "delete_client",
        "target": client_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


# ------------ Routes: Files ------------
ALLOWED_EXT = {".xlsx", ".xls", ".csv", ".pdf"}


@api.post("/admin/clients/{client_id}/files")
async def upload_file(client_id: str, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Επιτρέπονται μόνο .xlsx, .xls, .csv, .pdf")
    folder = CLIENTS_DATA_DIR / client_id
    folder.mkdir(parents=True, exist_ok=True)
    # sanitize filename
    safe_name = re.sub(r"[^A-Za-z0-9_.\-]", "_", file.filename)
    dest = folder / safe_name
    content = await file.read()
    dest.write_bytes(content)
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "actor": admin["email"],
        "action": "upload_file",
        "target": f"{client_id}/{safe_name}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"name": safe_name, "size": len(content)}


@api.get("/admin/clients/{client_id}/files/{filename}")
async def admin_download(client_id: str, filename: str, admin: dict = Depends(require_admin)):
    path = CLIENTS_DATA_DIR / client_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Δε βρέθηκε")
    return FileResponse(str(path), filename=filename)


@api.delete("/admin/clients/{client_id}/files/{filename}")
async def admin_delete_file(client_id: str, filename: str, admin: dict = Depends(require_admin)):
    path = CLIENTS_DATA_DIR / client_id / filename
    if path.exists():
        path.unlink()
    return {"ok": True}


@api.get("/client/files/{filename}")
async def client_download(filename: str, user: dict = Depends(get_current_user)):
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Forbidden")
    path = CLIENTS_DATA_DIR / user["id"] / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Δε βρέθηκε")
    return FileResponse(str(path), filename=filename)


# ------------ Routes: Simple Books (Απλογραφικά) ------------
@api.get("/client/books/simple")
async def client_simple_books(user: dict = Depends(get_current_user)):
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Μόνο για πελάτες")
    if user.get("books_type", "simple") != "simple":
        return {"books_type": user.get("books_type"), "has_data": False, "message": "Διπλογραφικά βιβλία — δε διαβάζονται από αυτή τη ροή ακόμα."}
    data = build_simple_books(user["id"])
    data["books_type"] = "simple"
    return data


@api.get("/admin/clients/{client_id}/books/simple")
async def admin_client_simple_books(client_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    if user.get("books_type", "simple") != "simple":
        return {"books_type": user.get("books_type"), "has_data": False, "message": "Διπλογραφικά βιβλία."}
    data = build_simple_books(client_id)
    data["books_type"] = "simple"
    data["client"] = {"id": user["id"], "name": user["name"], "company": user.get("company", "")}
    return data


@api.patch("/admin/clients/{client_id}")
async def update_client(client_id: str, payload: dict, admin: dict = Depends(require_admin)):
    allowed = {"name", "company", "phone", "afm", "books_type"}
    update_doc = {k: v for k, v in payload.items() if k in allowed}
    if "books_type" in update_doc and update_doc["books_type"] not in ("simple", "double"):
        raise HTTPException(status_code=400, detail="books_type invalid")
    if not update_doc:
        raise HTTPException(status_code=400, detail="Χωρίς αλλαγές")
    result = await db.users.update_one({"id": client_id, "role": "client"}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    return {"ok": True}


# ------------ Routes: Dashboards ------------
@api.get("/client/dashboard")
async def client_dashboard(user: dict = Depends(get_current_user)):
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Μόνο για πελάτες")
    return scan_client_folder(user["id"])


@api.get("/admin/clients/{client_id}/dashboard")
async def admin_client_dashboard(client_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    data = scan_client_folder(client_id)
    data["client"] = {"id": user["id"], "name": user["name"], "email": user["email"],
                      "company": user.get("company", ""), "afm": user.get("afm", "")}
    return data


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_clients = await db.users.count_documents({"role": "client"})
    total_income = 0.0
    total_expense = 0.0
    total_vat = 0.0
    total_files = 0
    cursor = db.users.find({"role": "client"}, {"id": 1})
    async for c in cursor:
        agg = scan_client_folder(c["id"])
        total_income += agg["totals"]["income"]
        total_expense += agg["totals"]["expense"]
        total_vat += agg["totals"]["vat"]
        total_files += len(agg["files"])
    recent_logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(length=10)
    return {
        "total_clients": total_clients,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "total_profit": round(total_income - total_expense, 2),
        "total_vat": round(total_vat, 2),
        "total_files": total_files,
        "recent_logs": recent_logs,
    }


# ------------ Mount ------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------ Startup ------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.audit_logs.create_index("timestamp")
    # backfill books_type default for existing clients
    await db.users.update_many(
        {"role": "client", "books_type": {"$exists": False}},
        {"$set": {"books_type": "simple"}},
    )
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@dmaccounting.gr").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Διαχειριστής",
            "role": "admin",
            "company": "DM Accounting",
            "phone": "",
            "afm": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})
        logger.info("Admin password updated")

    # Seed demo client + sample data
    demo_email = "client@dmaccounting.gr"
    demo = await db.users.find_one({"email": demo_email})
    if not demo:
        demo_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": demo_id,
            "email": demo_email,
            "password_hash": hash_password("Client2026!"),
            "name": "Δοκιμαστικός Πελάτης",
            "role": "client",
            "company": "Demo Επιχείρηση Α.Ε.",
            "phone": "210 1234567",
            "afm": "123456789",
            "books_type": "simple",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        folder = CLIENTS_DATA_DIR / demo_id
        folder.mkdir(parents=True, exist_ok=True)
        # copy bundled sample trial balance xls if available
        sample_tb = Path("/app/sample_data/eikona.xls")
        if sample_tb.exists():
            (folder / "isozygio_2026.xls").write_bytes(sample_tb.read_bytes())
        # Sample CSV with Greek headers
        sample = folder / "synolika_2025.csv"
        sample.write_text(
            "Ημερομηνία,Κατηγορία,Ποσό,Περιγραφή\n"
            "2025-01-15,Έσοδα,12500.00,Πώληση Α' Τρίμηνο\n"
            "2025-01-20,Έξοδα,3200.50,Προμηθευτές\n"
            "2025-02-10,Έσοδα,9800.00,Παροχή υπηρεσιών\n"
            "2025-02-15,ΦΠΑ,2350.00,ΦΠΑ Α' διμήνου\n"
            "2025-03-05,Έξοδα,4100.75,Μισθοδοσία\n"
            "2025-03-25,Έσοδα,15200.00,Πώληση Β' τριμήνου\n"
            "2025-04-15,Οφειλή,1800.00,Εκκρεμή ΦΠΑ\n"
            "2025-04-20,Πληρωμή,3200.50,Εξόφληση προμηθευτή\n"
            "2025-05-12,Έσοδα,11400.00,Νέοι πελάτες\n"
            "2025-05-30,Έξοδα,2800.00,Ενοίκιο γραφείου\n"
            "2025-06-15,ΦΠΑ,2700.00,ΦΠΑ Β' διμήνου\n"
            "2025-06-28,Έσοδα,13900.00,Συμβόλαια συντήρησης\n",
            encoding="utf-8",
        )
        logger.info(f"Demo client seeded: {demo_email}")

    # Write test credentials
    creds = Path("/app/memory/test_credentials.md")
    creds.parent.mkdir(parents=True, exist_ok=True)
    creds.write_text(
        f"""# DM Accounting Test Credentials

## Admin
- Email: `{admin_email}`
- Password: `{admin_pw}`
- Role: admin

## Demo Client
- Email: `client@dmaccounting.gr`
- Password: `Client2026!`
- Role: client
- Has sample CSV data pre-loaded in /app/clients-data/<id>/

## Auth Endpoints
- POST /api/auth/login   (body: email, password)
- POST /api/auth/logout
- GET  /api/auth/me
- Cookies: access_token (httpOnly, SameSite=None, Secure)
""",
        encoding="utf-8",
    )


@app.on_event("shutdown")
async def shutdown():
    client.close()
