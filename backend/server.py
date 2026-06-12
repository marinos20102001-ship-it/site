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
            "phone": user.get("phone", ""), "afm": user.get("afm", ""), "access_token": access}


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
            "company": doc["company"], "phone": doc["phone"], "afm": doc["afm"]}


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
ALLOWED_EXT = {".xlsx", ".csv", ".pdf"}


@api.post("/admin/clients/{client_id}/files")
async def upload_file(client_id: str, file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": client_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Πελάτης δε βρέθηκε")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Επιτρέπονται μόνο .xlsx, .csv, .pdf")
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
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        folder = CLIENTS_DATA_DIR / demo_id
        folder.mkdir(parents=True, exist_ok=True)
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
