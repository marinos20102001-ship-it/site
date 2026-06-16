# DM Accounting — PRD

## Original Problem Statement
Δημιουργία premium professional website για το λογιστικό γραφείο DM Accounting (Greek).
Stack: React + FastAPI + MongoDB. Custom JWT auth (bcrypt). Colors: #1E3A8A / #FFF / #F5F5F5.
Logo "DM" (serif blue + underline) στο header/footer. Client portal με admin & client roles.
Auto file processing από /clients-data/{customer-id}/ για .xlsx, .csv, .pdf.

## User Personas
- **Λογιστής/Admin** — διαχειρίζεται πελάτες, ανεβάζει αρχεία, βλέπει στατιστικά.
- **Πελάτης** — βλέπει μόνο τα δικά του οικονομικά δεδομένα σε dashboard.
- **Επισκέπτης** — βλέπει υπηρεσίες, σχετικά, επικοινωνία.

## Core Requirements (static)
1. Public pages: Home, Services, About, Contact (info + Google Maps, χωρίς φόρμα).
2. Client portal με ασφαλές JWT login (admin / client roles).
3. Auto-parse .xlsx/.csv/.pdf αρχείων ανά πελάτη με Greek-aware columns.
4. Dashboards με γραφήματα: Revenue, Expense, Profit Trend, VAT Analysis.
5. Premium minimal corporate design (Playfair Display + Manrope).

## Implemented (12 Ιουν 2026)
- Backend: FastAPI auth (login/logout/me), admin CRUD πελατών, file upload/delete/download,
  client/admin dashboards, audit logs, demo seed (client με sample CSV).
- File processing: .xlsx (openpyxl), .csv, .pdf (pypdf) με Greek+English keyword matching
  (έσοδα/expense/φπα/οφειλή/πληρωμή) και amount parsing (Greek 1.234,56 decimal).
- Frontend: Home/Services/About/Contact με Greek copy, premium hero με dark blue overlay,
  asymmetric service grid, Google Maps embed για Πατέλες Μιλτιάδου 9.
- Auth: AuthContext + ProtectedRoute, login redirect via useEffect.
- Client Dashboard: KPIs (income/expense/profit/obligations), Recharts (Area, Pie, Line, Bar),
  files list με downloads, recent transactions.
- Admin Dashboard: stats, clients table, create-client modal, client detail modal με file upload.
- **Tax Calculator** (νέα σελίδα 13 Ιουν 2026): πλήρης λογική υπολογισμού φόρου εισοδήματος
  2025/2026 με age-based brackets (under25, 25-30), rent income tax, dependents relief,
  withholding, Recharts breakdown. Premium UI διαφορετικό από το original του χρήστη.
- **Νέες υπηρεσίες (16 Φεβ 2026)**: Προστέθηκαν "Κατασκευή Site" (Globe icon) και
  "Μηχανογράφηση Λογιστηρίου" (MonitorCog icon) στις σελίδες Home, Services και ως
  επιλογές στη φόρμα Quote.

## Tech Notes
- httpOnly cookies (SameSite=None, Secure) + Bearer token fallback (localStorage).
- MongoDB collections: users (unique email index), audit_logs.
- Admin seed: idempotent (updates password if .env changed).

## Test Credentials
- Admin: admin@dmaccounting.gr / DMAdmin2026!
- Client: client@dmaccounting.gr / Client2026!

## Backlog (P1/P2)
- P1: Ειδοποιήσεις φορολογικών προθεσμιών, Export Excel/PDF reports.
- P2: Dark mode, EN/GR language toggle, password reset, brute-force lockout,
  email notifications (Resend), audit log viewer UI.
