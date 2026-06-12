"""DM Accounting backend API tests"""
import os
import io
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://accounting-workspace.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@dmaccounting.gr"
ADMIN_PW = "DMAdmin2026!"
CLIENT_EMAIL = "client@dmaccounting.gr"
CLIENT_PW = "Client2026!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def client_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PW})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# --- Health ---
def test_root_ok():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Auth ---
def test_login_admin():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200
    d = r.json()
    assert d["role"] == "admin"
    assert "access_token" in d and len(d["access_token"]) > 20


def test_login_client():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PW})
    assert r.status_code == 200
    assert r.json()["role"] == "client"


def test_login_wrong_creds():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_returns_user(admin_token):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_dashboard_no_auth():
    r = requests.get(f"{BASE_URL}/api/client/dashboard")
    assert r.status_code == 401


def test_client_cannot_access_admin(client_token):
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {client_token}"})
    assert r.status_code == 403


# --- Admin ---
def test_admin_stats(admin_token):
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    d = r.json()
    for k in ("total_clients", "total_income", "total_profit", "total_expense", "total_vat", "total_files", "recent_logs"):
        assert k in d
    assert d["total_clients"] >= 1


def test_admin_list_clients(admin_token):
    r = requests.get(f"{BASE_URL}/api/admin/clients", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    clients = r.json()
    assert isinstance(clients, list)
    emails = [c["email"] for c in clients]
    assert CLIENT_EMAIL in emails


def test_admin_create_upload_delete_client(admin_token):
    email = f"test_{uuid.uuid4().hex[:8]}@dmtest.gr"
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Create
    r = requests.post(f"{BASE_URL}/api/admin/clients", headers=headers,
                      json={"email": email, "password": "Test2026!", "name": "TEST User", "company": "TestCo", "afm": "999"})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]

    # Upload csv
    csv_content = "Ημερομηνία,Κατηγορία,Ποσό,Περιγραφή\n2025-01-01,Έσοδα,100.00,Test\n"
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/admin/clients/{cid}/files", headers=headers, files=files)
    assert r.status_code == 200, r.text
    assert r.json()["name"].endswith(".csv")

    # Verify audit log via stats recent_logs
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
    actions = [l.get("action") for l in r.json().get("recent_logs", [])]
    assert "create_client" in actions or "upload_file" in actions

    # Delete
    r = requests.delete(f"{BASE_URL}/api/admin/clients/{cid}", headers=headers)
    assert r.status_code == 200


# --- Client dashboard data ---
def test_client_dashboard_totals(client_token):
    r = requests.get(f"{BASE_URL}/api/client/dashboard", headers={"Authorization": f"Bearer {client_token}"})
    assert r.status_code == 200
    d = r.json()
    assert "totals" in d and "monthly" in d and "files" in d and "recent" in d
    t = d["totals"]
    for k in ("income", "expense", "profit", "vat", "obligations", "payments"):
        assert k in t
    # Seeded: 12500+9800+15200+11400+13900 = 62800; expense 3200.50+4100.75+2800 = 10101.25
    assert abs(t["income"] - 62800.0) < 1, f"income={t['income']}"
    assert abs(t["expense"] - 10101.25) < 1, f"expense={t['expense']}"
    assert len(d["files"]) >= 1
