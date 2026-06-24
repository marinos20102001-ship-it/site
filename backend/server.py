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
import asyncio
import bcrypt
import jwt
import resend
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

# Resend (email)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "marinosgr@yahoo.gr")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Brute-force protection
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

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


# ------------ Email Helpers ------------
async def send_email_safe(to: str, subject: str, html: str) -> bool:
    """Non-blocking email send. Logs errors but never raises (won't break flows)."""
    if not RESEND_API_KEY:
        logger.warning(f"[email-skip] {subject} -> {to} (no RESEND_API_KEY)")
        return False
    try:
        params = {"from": f"DM Accounting <{SENDER_EMAIL}>",
                  "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"[email-sent] {subject} -> {to} id={result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.error(f"[email-fail] {subject} -> {to}: {e}")
        return False


def _email_wrapper(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:30px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFF;border:1px solid #E2E8F0;">
  <tr><td style="background:#1E3A8A;padding:24px;color:#fff;">
    <div style="font-family:Georgia,serif;font-size:24px;font-weight:bold;">DM Accounting</div>
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#BFDBFE;margin-top:4px;">Λογιστικό Γραφείο</div>
  </td></tr>
  <tr><td style="padding:32px 28px;color:#0F172A;">
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#1E3A8A;">{title}</h2>
    {body_html}
  </td></tr>
  <tr><td style="background:#F5F5F5;padding:16px 28px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;">
    Δελημιχάλης Μαρίνος Φώτιος · Πατέλες Μιλτιάδου 9 · <a href="mailto:marinosgr@yahoo.gr" style="color:#1E3A8A;">marinosgr@yahoo.gr</a>
  </td></tr>
</table>
</td></tr></table></body></html>"""


# ------------ Brute-force protection ------------
# ------------ Brute-force protection ------------
MAX_LOGIN_ATTEMPTS_DUPE = MAX_LOGIN_ATTEMPTS  # alias unused


def make_captcha() -> Dict[str, Any]:
    """Stateless math captcha. Returns question + signed token."""
    import secrets
    a = secrets.randbelow(9) + 1
    b = secrets.randbelow(9) + 1
    op = secrets.choice(["+", "-"])
    if op == "-" and b > a:
        a, b = b, a
    answer = a + b if op == "+" else a - b
    token = jwt.encode(
        {"a": answer, "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )
    return {"question": f"{a} {op} {b}", "token": token}


def verify_captcha(token: str, answer: int) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload.get("a")) == int(answer)
    except Exception:
        return False


async def check_lockout(email: str) -> Optional[int]:
    """Returns minutes remaining if locked; None if allowed."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
    count = await db.login_attempts.count_documents({
        "email": email, "success": False, "timestamp": {"$gte": cutoff.isoformat()}
    })
    if count >= MAX_LOGIN_ATTEMPTS:
        oldest = await db.login_attempts.find_one(
            {"email": email, "success": False, "timestamp": {"$gte": cutoff.isoformat()}},
            sort=[("timestamp", 1)],
        )
        if oldest:
            unlock = datetime.fromisoformat(oldest["timestamp"]) + timedelta(minutes=LOCKOUT_MINUTES)
            remaining = max(1, int((unlock - datetime.now(timezone.utc)).total_seconds() // 60) + 1)
            return remaining
    return None


async def record_login_attempt(email: str, success: bool, ip: str = ""):
    await db.login_attempts.insert_one({
        "email": email, "success": success, "ip": ip,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if success:
        # purge prior failed attempts on success
        await db.login_attempts.delete_many({"email": email, "success": False})


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


class QuoteIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    company: Optional[str] = ""
    business_type: Optional[str] = ""
    books_type: Optional[str] = ""
    employees: Optional[str] = ""
    services: Optional[List[str]] = []
    message: Optional[str] = ""
    captcha_token: Optional[str] = ""
    captcha_answer: Optional[str] = ""
    website: Optional[str] = ""  # honeypot — must stay empty


class BillingEntryIn(BaseModel):
    type: str  # 'charge' | 'payment'
    amount: float
    date: Optional[str] = ""
    description: Optional[str] = ""


class FirmTransactionIn(BaseModel):
    type: str  # 'income' | 'expense'
    amount: float
    date: Optional[str] = ""
    description: Optional[str] = ""
    client_id: Optional[str] = ""


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
    tb_data: Optional[Dict[str, Any]] = None
    tb_file_mtime = 0.0

    for f in sorted(folder.iterdir()):
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        size = f.stat().st_size
        files_info.append({"name": f.name, "size": size, "ext": ext,
                           "modified": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat()})
        if ext in (".xlsx", ".xls"):
            # Try trial balance first
            parsed = parse_trial_balance(f)
            if parsed and parsed.get("accounts"):
                if f.stat().st_mtime > tb_file_mtime:
                    tb_data = parsed
                    tb_file_mtime = f.stat().st_mtime
                continue  # skip date/type/amount parsing for TB files
            # Fall back to row-based parser
            if ext == ".xlsx":
                records.extend(parse_xlsx(f))
        elif ext == ".csv":
            records.extend(parse_csv(f))
        elif ext == ".pdf":
            records.extend(parse_pdf(f))

    # Merge trial balance into records as synthetic monthly entries
    if tb_data:
        year = tb_data.get("year") or datetime.now(timezone.utc).year
        for acc in tb_data["accounts"]:
            cat = acc["category"]
            for m_idx, vals in acc["monthly"].items():
                debit = vals.get("debit") or 0.0
                credit = vals.get("credit") or 0.0
                if debit == 0 and credit == 0:
                    continue
                date_str = f"{year:04d}-{m_idx:02d}-01"
                if cat == "7":  # income - credit side
                    if credit:
                        records.append({"date": date_str, "type": "income", "amount": credit,
                                        "description": f"{acc['code']} {acc['description']}"})
                elif cat in ("6", "2"):  # expense: 6=έξοδα, 2=αγορές
                    if debit:
                        records.append({"date": date_str, "type": "expense", "amount": debit,
                                        "description": f"{acc['code']} {acc['description']}"})

    agg = aggregate_records(records)
    agg["files"] = files_info
    agg["recent"] = sorted(records, key=lambda r: r.get("date") or "", reverse=True)[:20]
    agg["has_trial_balance"] = tb_data is not None
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
    "2": "Αγορές (Έξοδο)",
    "6": "Έξοδα",
    "7": "Έσοδα",
}


def _is_primary_code(code: str) -> bool:
    """Primary account: no '-' separator (e.g. '54' yes, '54-0087' no)."""
    c = str(code or "").strip()
    return bool(c) and "-" not in c and "." not in c


def _category_for(code: str) -> Optional[str]:
    """Return category key for primary code. Excludes 54 (ΦΠΑ) per user request."""
    c = str(code or "").strip()
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


def _detect_total_columns(headers: List[str]) -> Dict[str, int]:
    """Find 'Σύνολο Χρέωσης', 'Σύνολο Πίστωσης', 'Σύνολο Υπολοίπου' columns."""
    out: Dict[str, int] = {}
    for idx, h in enumerate(headers):
        if not h:
            continue
        h_lower = str(h).lower()
        if "σύνολο" not in h_lower and "συνολο" not in h_lower:
            continue
        if "χρέωση" in h_lower or "χρεωση" in h_lower:
            out["debit"] = idx
        elif "πίστωση" in h_lower or "πιστωση" in h_lower:
            out["credit"] = idx
        elif "υπόλοιπο" in h_lower or "υπολοιπο" in h_lower:
            out["balance"] = idx
    return out


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
    total_cols = _detect_total_columns(headers)

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
            balance = parse_amount(r[cols["balance"]]) if "balance" in cols and cols["balance"] < len(r) else None
            monthly[m_idx] = {"debit": debit or 0.0, "credit": credit or 0.0, "balance": balance or 0.0}

        # Total columns (prefer explicit; else compute from monthly)
        if total_cols:
            t_debit = parse_amount(r[total_cols["debit"]]) if "debit" in total_cols and total_cols["debit"] < len(r) else None
            t_credit = parse_amount(r[total_cols["credit"]]) if "credit" in total_cols and total_cols["credit"] < len(r) else None
            t_balance = parse_amount(r[total_cols["balance"]]) if "balance" in total_cols and total_cols["balance"] < len(r) else None
        else:
            t_debit = t_credit = t_balance = None
        if t_debit is None:
            t_debit = sum(v["debit"] for v in monthly.values())
        if t_credit is None:
            t_credit = sum(v["credit"] for v in monthly.values())
        if t_balance is None:
            t_balance = t_debit - t_credit

        accounts.append({
            "code": code,
            "description": desc,
            "category": category,
            "category_label": CATEGORY_LABELS.get(category, category),
            "monthly": monthly,
            "total_debit": round(t_debit, 2),
            "total_credit": round(t_credit, 2),
            "total_balance": round(t_balance, 2),
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


DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def _last_day_of(year: int, month: int) -> int:
    if month == 2:
        # leap year check
        return 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
    return DAYS_IN_MONTH[month - 1]


def build_simple_books(client_id: str) -> Dict[str, Any]:
    """Build display data for απλογραφικά: monthly balances per account up to last month with data."""
    tb = latest_trial_balance(client_id)
    today = datetime.now(timezone.utc)
    if not tb:
        return {
            "has_data": False,
            "as_of": None,
            "year": today.year,
        }

    # find the latest month that has any data (debit or credit) across all primary accounts
    months_with_data = set()
    for acc in tb["accounts"]:
        for m_idx, vals in acc["monthly"].items():
            if (vals.get("debit") or 0) or (vals.get("credit") or 0):
                months_with_data.add(m_idx)

    year = tb.get("year") or today.year
    last_month = max(months_with_data) if months_with_data else 1
    as_of_date = f"{year:04d}-{last_month:02d}-{_last_day_of(year, last_month):02d}"

    # Months to display = 1..last_month
    months_list = [{"index": m, "name": GREEK_MONTHS[m - 1]} for m in range(1, last_month + 1)]

    # Build category groups (excluding 54 — ΦΠΑ removed per user request)
    groups: Dict[str, Dict[str, Any]] = {}
    for cat_key, cat_label in CATEGORY_LABELS.items():
        groups[cat_key] = {
            "key": cat_key,
            "label": cat_label,
            "rows": [],
            "monthly_balance": {m: 0.0 for m in range(1, last_month + 1)},
            "total_balance": 0.0,
        }

    for acc in tb["accounts"]:
        cat = acc["category"]
        if cat not in groups:
            continue
        # Only include accounts that had any movement up to last_month
        had_movement = any(
            (acc["monthly"].get(m, {}).get("debit") or 0) or (acc["monthly"].get(m, {}).get("credit") or 0)
            for m in range(1, last_month + 1)
        )
        if not had_movement:
            continue
        row_monthly = {}
        for m in range(1, last_month + 1):
            bal = acc["monthly"].get(m, {}).get("balance") or 0.0
            row_monthly[m] = round(bal, 2)
            groups[cat]["monthly_balance"][m] += bal
        groups[cat]["rows"].append({
            "code": acc["code"],
            "description": acc["description"],
            "monthly_balance": row_monthly,
            "total_balance": acc["total_balance"],
        })
        groups[cat]["total_balance"] += acc["total_balance"]

    # Round group totals
    for g in groups.values():
        g["total_balance"] = round(g["total_balance"], 2)
        g["monthly_balance"] = {m: round(v, 2) for m, v in g["monthly_balance"].items()}

    # Top-level monthly summary (per group key per month) for chart
    monthly_summary = []
    for m in range(1, last_month + 1):
        entry = {"month": m, "month_name": GREEK_MONTHS[m - 1]}
        for cat_key in CATEGORY_LABELS:
            entry[cat_key] = groups[cat_key]["monthly_balance"][m]
        monthly_summary.append(entry)

    return {
        "has_data": True,
        "year": year,
        "source_file": tb["source_file"],
        "uploaded_at": tb["uploaded_at"],
        "last_month": last_month,
        "last_month_name": GREEK_MONTHS[last_month - 1],
        "as_of": as_of_date,
        "months": months_list,
        "groups": list(groups.values()),
        "monthly_summary": monthly_summary,
    }


# ------------ Routes: Auth ------------
@api.get("/")
async def root():
    return {"app": "DM Accounting", "status": "ok"}


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else ""
    # Check lockout BEFORE checking password
    locked = await check_lockout(email)
    if locked is not None:
        raise HTTPException(status_code=429,
                            detail=f"Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε {locked} λεπτά.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await record_login_attempt(email, success=False, ip=ip)
        raise HTTPException(status_code=401, detail="Λάθος email ή κωδικός")
    await record_login_attempt(email, success=True, ip=ip)
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

    # Try to detect last month from trial balance (for nicer email)
    last_month_label = ""
    if ext in (".xls", ".xlsx"):
        try:
            tb = parse_trial_balance(dest)
            if tb and tb.get("accounts"):
                months_with_data = set()
                for acc in tb["accounts"]:
                    for m_idx, vals in acc["monthly"].items():
                        if (vals.get("debit") or 0) or (vals.get("credit") or 0):
                            months_with_data.add(m_idx)
                if months_with_data:
                    lm = max(months_with_data)
                    last_month_label = f"{GREEK_MONTHS[lm - 1]} {tb.get('year') or ''}".strip()
        except Exception:
            pass

    # Notify client by email
    period = f"μέχρι τον μήνα {last_month_label}" if last_month_label else "με νέα στοιχεία"
    body = f"""<p>Αγαπητέ/ή <strong>{user.get('name','')}</strong>,</p>
<p>Σας ενημερώνουμε ότι η εικόνα σας στο portal της <strong>DM Accounting</strong> ενημερώθηκε {period}.</p>
<p>Μπορείτε να συνδεθείτε στο πελατειακό σας portal για να δείτε αναλυτικά τα οικονομικά σας στοιχεία:</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{os.environ.get('FRONTEND_URL','#')}/login"
     style="background:#1E3A8A;color:#fff;padding:12px 24px;text-decoration:none;font-weight:bold;display:inline-block;">
    Σύνδεση στο Portal
  </a>
</p>
<p style="color:#64748B;font-size:13px;">Αρχείο: {safe_name}</p>"""
    asyncio.create_task(send_email_safe(user["email"],
                                        f"Ενημέρωση εικόνας — DM Accounting{(' · ' + last_month_label) if last_month_label else ''}",
                                        _email_wrapper("Η εικόνα σας ενημερώθηκε", body)))

    return {"name": safe_name, "size": len(content), "notification_sent": True}


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


# ------------ Routes: Quote Requests ------------
@api.get("/captcha")
async def get_captcha():
    return make_captcha()


@api.post("/quotes")
async def create_quote(payload: QuoteIn, request: Request):
    # Honeypot: bots fill hidden field
    if payload.website:
        logger.warning(f"Spam quote blocked (honeypot): {payload.email}")
        return {"ok": True, "id": "blocked"}  # silently accept (don't tip off bots)
    # Captcha
    try:
        ans = int(str(payload.captcha_answer).strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Παρακαλώ απαντήστε την ερώτηση επαλήθευσης")
    if not verify_captcha(payload.captcha_token or "", ans):
        raise HTTPException(status_code=400, detail="Λάθος απάντηση στην επαλήθευση. Δοκιμάστε ξανά.")

    qid = str(uuid.uuid4())
    doc = {
        "id": qid,
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "phone": (payload.phone or "").strip(),
        "company": (payload.company or "").strip(),
        "business_type": (payload.business_type or "").strip(),
        "books_type": (payload.books_type or "").strip(),
        "employees": (payload.employees or "").strip(),
        "services": payload.services or [],
        "message": (payload.message or "").strip(),
        "status": "new",
        "ip": request.client.host if request.client else "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quote_requests.insert_one(doc)

    services_html = "".join(f"<li>{s}</li>" for s in (payload.services or [])) or "<li>—</li>"
    body = f"""<p><strong>Νέο αίτημα προσφοράς</strong> από το site σας.</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
  <tr><td style="color:#64748B;">Όνομα:</td><td><strong>{doc['name']}</strong></td></tr>
  <tr><td style="color:#64748B;">Email:</td><td><a href="mailto:{doc['email']}">{doc['email']}</a></td></tr>
  <tr><td style="color:#64748B;">Τηλέφωνο:</td><td>{doc['phone'] or '—'}</td></tr>
  <tr><td style="color:#64748B;">Εταιρεία:</td><td>{doc['company'] or '—'}</td></tr>
  <tr><td style="color:#64748B;">Νομική μορφή:</td><td>{doc['business_type'] or '—'}</td></tr>
  <tr><td style="color:#64748B;">Βιβλία:</td><td>{doc['books_type'] or '—'}</td></tr>
  <tr><td style="color:#64748B;">Εργαζόμενοι:</td><td>{doc['employees'] or '—'}</td></tr>
  <tr><td style="color:#64748B;vertical-align:top;">Υπηρεσίες:</td><td><ul style="margin:0;padding-left:18px;">{services_html}</ul></td></tr>
</table>
<p style="margin-top:16px;padding:12px;background:#F5F5F5;border-left:3px solid #1E3A8A;">{(doc['message'] or '—').replace(chr(10),'<br>')}</p>"""
    asyncio.create_task(send_email_safe(OWNER_EMAIL,
                                        f"Νέο αίτημα προσφοράς · {doc['name']}",
                                        _email_wrapper("Νέο αίτημα προσφοράς", body)))
    return {"id": qid, "ok": True}


@api.get("/admin/quotes")
async def list_quotes(admin: dict = Depends(require_admin)):
    cursor = db.quote_requests.find({}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=500)


@api.patch("/admin/quotes/{qid}")
async def update_quote_status(qid: str, payload: dict, admin: dict = Depends(require_admin)):
    status = payload.get("status")
    if status not in ("new", "contacted", "won", "lost"):
        raise HTTPException(status_code=400, detail="Άκυρη κατάσταση")
    result = await db.quote_requests.update_one({"id": qid}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Δε βρέθηκε")
    return {"ok": True}


@api.delete("/admin/quotes/{qid}")
async def delete_quote(qid: str, admin: dict = Depends(require_admin)):
    await db.quote_requests.delete_one({"id": qid})
    return {"ok": True}


# ------------ Routes: Client Billing (Καρτέλα Πελάτη) ------------
@api.get("/admin/clients/{client_id}/billing")
async def list_billing(client_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    cursor = db.client_billing.find({"client_id": client_id}, {"_id": 0}).sort("date", -1)
    entries = await cursor.to_list(length=500)
    total_charges = sum(e["amount"] for e in entries if e["type"] == "charge")
    total_payments = sum(e["amount"] for e in entries if e["type"] == "payment")
    return {
        "entries": entries,
        "total_charges": round(total_charges, 2),
        "total_payments": round(total_payments, 2),
        "balance": round(total_charges - total_payments, 2),
    }


@api.post("/admin/clients/{client_id}/billing")
async def add_billing(client_id: str, payload: BillingEntryIn, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    if payload.type not in ("charge", "payment"):
        raise HTTPException(status_code=400, detail="Λάθος τύπος")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Ποσό > 0 παρακαλώ")
    entry = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "type": payload.type,
        "amount": float(payload.amount),
        "date": (payload.date or datetime.now(timezone.utc).date().isoformat()),
        "description": (payload.description or "").strip(),
        "created_by": admin["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_billing.insert_one(entry)
    # Auto-mirror payments as firm income
    if payload.type == "payment":
        await db.firm_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "income",
            "amount": float(payload.amount),
            "date": entry["date"],
            "description": f"Πληρωμή: {user['name']} — {entry['description'] or 'Λογιστικά'}",
            "client_id": client_id,
            "source": "client_payment",
            "created_at": entry["created_at"],
        })
    return {"ok": True, "id": entry["id"]}


@api.delete("/admin/clients/{client_id}/billing/{entry_id}")
async def delete_billing(client_id: str, entry_id: str, admin: dict = Depends(require_admin)):
    await db.client_billing.delete_one({"id": entry_id, "client_id": client_id})
    # also remove the linked firm transaction if any
    await db.firm_transactions.delete_many({"client_id": client_id, "source": "client_payment"})
    # re-insert remaining payments as firm income
    cursor = db.client_billing.find({"client_id": client_id, "type": "payment"})
    user = await db.users.find_one({"id": client_id, "role": "client"})
    name = user["name"] if user else "—"
    async for p in cursor:
        await db.firm_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "type": "income", "amount": p["amount"], "date": p["date"],
            "description": f"Πληρωμή: {name} — {p.get('description') or 'Λογιστικά'}",
            "client_id": client_id, "source": "client_payment",
            "created_at": p["created_at"],
        })
    return {"ok": True}


# ------------ Routes: Firm Transactions (Οικονομικά Γραφείου) ------------
@api.get("/admin/firm/transactions")
async def list_firm_transactions(admin: dict = Depends(require_admin)):
    cursor = db.firm_transactions.find({}, {"_id": 0}).sort("date", -1)
    items = await cursor.to_list(length=1000)
    total_income = sum(t["amount"] for t in items if t["type"] == "income")
    total_expense = sum(t["amount"] for t in items if t["type"] == "expense")
    # Outstanding receivables across all clients
    billing_cursor = db.client_billing.find({})
    receivables = 0.0
    async for b in billing_cursor:
        receivables += (b["amount"] if b["type"] == "charge" else -b["amount"])
    return {
        "items": items,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_profit": round(total_income - total_expense, 2),
        "receivables": round(receivables, 2),
    }


@api.post("/admin/firm/transactions")
async def add_firm_transaction(payload: FirmTransactionIn, admin: dict = Depends(require_admin)):
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Λάθος τύπος")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Ποσό > 0 παρακαλώ")
    entry = {
        "id": str(uuid.uuid4()),
        "type": payload.type,
        "amount": float(payload.amount),
        "date": (payload.date or datetime.now(timezone.utc).date().isoformat()),
        "description": (payload.description or "").strip(),
        "client_id": payload.client_id or None,
        "source": "manual",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.firm_transactions.insert_one(entry)
    return {"ok": True, "id": entry["id"]}


@api.delete("/admin/firm/transactions/{entry_id}")
async def delete_firm_transaction(entry_id: str, admin: dict = Depends(require_admin)):
    # Don't allow deleting auto-mirrored payments (they should be deleted via billing)
    entry = await db.firm_transactions.find_one({"id": entry_id})
    if not entry:
        return {"ok": True}
    if entry.get("source") == "client_payment":
        raise HTTPException(status_code=400, detail="Διαγράψτε την αντίστοιχη πληρωμή από την καρτέλα του πελάτη.")
    await db.firm_transactions.delete_one({"id": entry_id})
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
    new_quotes = await db.quote_requests.count_documents({"status": "new"})
    return {
        "total_clients": total_clients,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "total_profit": round(total_income - total_expense, 2),
        "total_vat": round(total_vat, 2),
        "total_files": total_files,
        "new_quotes": new_quotes,
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
    await db.login_attempts.create_index("timestamp")
    await db.quote_requests.create_index("created_at")
    # Purge old login attempts (>30 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    await db.login_attempts.delete_many({"timestamp": {"$lt": cutoff}})
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


# ------------ Blog / Taxheaven RSS ------------
import feedparser
import httpx

TAXHEAVEN_FEEDS = {
    "news": {
        "label": "Νέα & Ειδήσεις",
        "url": "https://www.taxheaven.gr/bibliothiki/soft/xml/soft_new.xml",
    },
    "decisions": {
        "label": "Πρόσφατες Αποφάσεις",
        "url": "https://www.taxheaven.gr/bibliothiki/soft/xml/soft_law.xml",
    },
    "laws": {
        "label": "Πρόσφατοι Νόμοι",
        "url": "https://www.taxheaven.gr/bibliothiki/soft/xml/soft_lawl.xml",
    },
    "deadlines": {
        "label": "Προθεσμίες Μηνός",
        "url": "https://www.taxheaven.gr/bibliothiki/soft/xml/soft_dat.xml",
    },
    "articles": {
        "label": "Άρθρα & Μελέτες",
        "url": "https://www.taxheaven.gr/bibliothiki/soft/xml/soft_art.xml",
    },
}

# In-memory cache: {category: (timestamp, items)}
_feed_cache: Dict[str, Any] = {}
FEED_CACHE_TTL_SECONDS = 30 * 60  # 30 minutes


async def _fetch_feed(category: str) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc).timestamp()
    cached = _feed_cache.get(category)
    if cached and now - cached[0] < FEED_CACHE_TTL_SECONDS:
        return cached[1]

    cfg = TAXHEAVEN_FEEDS[category]
    try:
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "Mozilla/5.0 DM-Accounting-Blog"}) as cx:
            r = await cx.get(cfg["url"])
            r.raise_for_status()
            parsed = feedparser.parse(r.content)
    except Exception as e:
        logger.warning(f"RSS fetch failed for {category}: {e}")
        if cached:
            return cached[1]
        return []

    items = []
    for entry in parsed.entries[:30]:
        desc = (entry.get("description") or "").strip()
        # Strip CDATA / basic HTML
        desc = re.sub(r"<[^>]+>", "", desc)
        items.append({
            "title": (entry.get("title") or "").strip(),
            "description": desc,
            "link": entry.get("link") or "",
            "pub_date": entry.get("published") or "",
            "author": entry.get("author") or "",
        })

    _feed_cache[category] = (now, items)
    return items


@api.get("/blog/categories")
async def blog_categories():
    return [{"key": k, "label": v["label"]} for k, v in TAXHEAVEN_FEEDS.items()]


@api.get("/blog/feed")
async def blog_feed(category: str = "news"):
    if category not in TAXHEAVEN_FEEDS:
        raise HTTPException(status_code=400, detail="Άγνωστη κατηγορία")
    items = await _fetch_feed(category)
    return {
        "category": category,
        "label": TAXHEAVEN_FEEDS[category]["label"],
        "source": "taxheaven.gr",
        "items": items,
    }


# Re-mount router to pick up routes defined above
app.include_router(api)


@app.on_event("shutdown")
async def shutdown():
    client.close()
