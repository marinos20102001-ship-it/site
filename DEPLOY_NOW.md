# 🚀 DM Accounting — Live Deployment (Personalized Quickstart)

**Stack**: Vercel (frontend) + Fly.io (backend + persistent disk) + MongoDB Atlas + papaki.gr (domain)  
**Κόστος**: μόνο το domain (~10€/έτος) — όλα τα υπόλοιπα είναι στο free tier

Ακολουθήστε τα βήματα με σειρά. Όσο κόκκινο βλέπετε είναι τα **δικά σας δεδομένα** που έχω ήδη προετοιμάσει.

---

## 📌 Τα δικά σας secrets (φυλάξτε αυτό το αρχείο ασφαλές)

```
ADMIN_EMAIL      = admin@dmaccounting.gr
ADMIN_PASSWORD   = sagapaoeygenia12
SENDER_EMAIL     = noreply@dm-accounting.gr
OWNER_EMAIL      = marinos20102001@gmail.com
JWT_SECRET       = fliHKwYwI8OSTqMc_JudP7M8MtvcCtaTWUdKs4DWAxwiGnHgP2QCnFXvSQBfCdjl
RESEND_API_KEY   = (αυτό που έχετε ήδη σε /app/backend/.env)
```

Το `RESEND_API_KEY` θα το πάρετε από το `/app/backend/.env` όπου είναι ήδη.

---

## ΒΗΜΑ 1️⃣ — MongoDB Atlas (5 λεπτά, δωρεάν)

1. https://www.mongodb.com/cloud/atlas/register → κάντε account
2. **Create Cluster** → **M0 FREE** → Region: **Frankfurt (eu-central-1)** → Cluster Name: `DM-Accounting`
3. **Database Access** → Add New Database User:
   - Username: `dmadmin`
   - Password: κάντε **Autogenerate** και **αντιγράψτε** τον
   - Built-in Role: **Read and write to any database**
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
5. **Database** → Connect → **Drivers** → **Python** → αντιγράψτε το connection string.
6. Αντικαταστήστε `<password>` και προσθέστε `/dm_accounting` πριν το `?`. Πρέπει να μοιάζει έτσι:
   ```
   mongodb+srv://dmadmin:YOUR_PASSWORD@dm-accounting.xxxxx.mongodb.net/dm_accounting?retryWrites=true&w=majority
   ```
   ✏️ **Σημειώστε το αλλού** — θα το χρησιμοποιήσετε στο Βήμα 3E.

---

## ΒΗΜΑ 2️⃣ — Push κώδικα στο GitHub

Στο chat, πατήστε το κουμπί **"Save to GitHub"** (πάνω δεξιά στο input). Επιλέξτε repo name π.χ. `dm-accounting`. Ο Emergent θα κάνει auto-push όλο τον κώδικα.

Αφού ολοκληρωθεί, θα έχετε: `https://github.com/YOUR_USER/dm-accounting`

---

## ΒΗΜΑ 3️⃣ — Fly.io Backend (10 λεπτά)

### A. Εγκατάσταση Fly CLI (στον υπολογιστή σας)

**Windows (PowerShell)**:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac**:
```bash
brew install flyctl
```

**Linux**:
```bash
curl -L https://fly.io/install.sh | sh
```

### B. Sign up + Login

```bash
flyctl auth signup
```
Θα σας ζητήσει credit card **μόνο για verification** — δεν χρεώνει τίποτα στο free tier.

### C. Clone το repo σας τοπικά

```bash
git clone https://github.com/YOUR_USER/dm-accounting.git
cd dm-accounting
```

### D. Launch app (χωρίς deploy ακόμα)

```bash
flyctl launch --copy-config --no-deploy
```
- **App name**: `dm-accounting` (ή δικό σας)
- **Region**: `fra` (Frankfurt)
- **Postgres**: `No`
- **Redis**: `No`

### E. Δημιουργία persistent volume 1GB

```bash
flyctl volumes create dm_data --region fra --size 1 --yes
```

### F. Καταχώρηση όλων των secrets

**Αντιγράψτε πρώτα το `RESEND_API_KEY`** από το `/app/backend/.env` του αρχικού κώδικα. Μετά τρέξτε (αντικαταστήστε `YOUR_MONGO_URL` και `YOUR_RESEND_KEY`):

```bash
flyctl secrets set \
  MONGO_URL='mongodb+srv://dmadmin:YOUR_PASS@dm-accounting.xxxxx.mongodb.net/dm_accounting?retryWrites=true&w=majority' \
  DB_NAME='dm_accounting' \
  JWT_SECRET='fliHKwYwI8OSTqMc_JudP7M8MtvcCtaTWUdKs4DWAxwiGnHgP2QCnFXvSQBfCdjl' \
  ADMIN_EMAIL='admin@dmaccounting.gr' \
  ADMIN_PASSWORD='sagapaoeygenia12' \
  SENDER_EMAIL='noreply@dm-accounting.gr' \
  OWNER_EMAIL='marinos20102001@gmail.com' \
  RESEND_API_KEY='YOUR_RESEND_KEY_HERE' \
  FRONTEND_URL='https://dm-accounting.gr' \
  CORS_ORIGINS='https://dm-accounting.gr,https://www.dm-accounting.gr'
```

### G. Deploy!

```bash
flyctl deploy
```

Θα πάρει ~3 λεπτά. Μόλις τελειώσει θα δείτε το URL: `https://dm-accounting.fly.dev`

### H. Δοκιμή

Ανοίξτε στον browser: `https://dm-accounting.fly.dev/api/`  
Πρέπει να δείτε: `{"app":"DM Accounting","status":"ok"}`

---

## ΒΗΜΑ 4️⃣ — Vercel Frontend (5 λεπτά)

1. https://vercel.com/signup → **Continue with GitHub**
2. **Add New** → **Project** → επιλέξτε το repo `dm-accounting`
3. **Configure Project**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App (auto-detect)
4. **Environment Variables**:
   - Name: `REACT_APP_BACKEND_URL`
   - Value: `https://dm-accounting.fly.dev`
5. **Deploy** → περιμένετε ~2 λεπτά
6. Το URL: `https://dm-accounting.vercel.app` (δοκιμάστε — πρέπει να δουλεύει όλο το site)

---

## ΒΗΜΑ 5️⃣ — Σύνδεση custom domain dm-accounting.gr

### 5A. Στο Vercel
1. Project → **Settings** → **Domains** → **Add**
2. Γράψτε: `dm-accounting.gr` → Add
3. Επαναλάβετε για: `www.dm-accounting.gr`
4. Το Vercel θα σας δείξει τα DNS records:
   - `dm-accounting.gr` → **A** → `76.76.21.21`
   - `www.dm-accounting.gr` → **CNAME** → `cname.vercel-dns.com`

### 5B. Στο papaki.gr
1. Login → **Τα Domain μου** → κάντε κλικ στο `dm-accounting.gr`
2. **Διαχείριση DNS** (ή "Zone Records")
3. **Διαγράψτε** όλα τα παλιά A records (αν υπάρχουν)
4. **Προσθέστε**:

| Τύπος | Host | Value |
|---|---|---|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

5. Αποθήκευση. Propagation ~10–30 λεπτά (μπορεί και μία ώρα).

### 5C. Επιβεβαίωση
Ανοίξτε: `https://dm-accounting.gr` → πρέπει να φορτώνει το site σας με πράσινο SSL padlock.

---

## ΒΗΜΑ 6️⃣ — Post-Deployment Checks

### ✅ Δοκιμή Login
1. `https://dm-accounting.gr/login`
2. Email: `admin@dmaccounting.gr`  
   Password: `sagapaoeygenia12`
3. Θα φορτώσει το Admin Dashboard

### ✅ Δοκιμή αποστολής email
1. Anonymous browser (incognito) → `/quote`
2. Συμπληρώστε φόρμα → Submit
3. Πρέπει να λάβετε email στο `marinos20102001@gmail.com`

### ✅ Δημιουργία πρώτου πραγματικού πελάτη
1. Admin Dashboard → **Πελάτες** → **Νέος Πελάτης**
2. Δώστε τα στοιχεία, θα δημιουργηθεί με τυχαίο κωδικό — θα του σταλεί email

---

## 🔒 Post-Deploy Security

Μετά το πρώτο successful deploy:

1. **MongoDB Atlas → Network Access**: Αντικαταστήστε το `0.0.0.0/0` με τα Fly.io IPs για μεγαλύτερη ασφάλεια (προαιρετικό αλλά προτείνεται).

2. **Ενεργοποιήστε 2FA** σε:
   - GitHub account
   - Vercel account
   - Fly.io account
   - MongoDB Atlas account

3. **Backup βάσης** ανά τακτά διαστήματα:
   ```bash
   mongodump --uri="ΤΟ MONGO_URL ΣΑΣ" --out=./backup-$(date +%F)
   ```

---

## 🆘 Troubleshooting

**Backend δεν ξεκινά (Fly.io)**  
```bash
flyctl logs        # δείτε τα errors
flyctl status      # status της VM
```

**Frontend λέει "Cannot connect to backend"**  
Ελέγξτε ότι το `REACT_APP_BACKEND_URL` στο Vercel δείχνει στο σωστό `https://dm-accounting.fly.dev`

**Emails δεν φτάνουν**  
- Ελέγξτε ότι το domain `dm-accounting.gr` είναι verified στο Resend Dashboard
- Ελέγξτε το `SENDER_EMAIL=noreply@dm-accounting.gr` στα Fly.io secrets

**"CORS blocked"**  
Ενημερώστε το `CORS_ORIGINS` στο Fly.io:
```bash
flyctl secrets set CORS_ORIGINS='https://dm-accounting.gr,https://www.dm-accounting.gr,https://dm-accounting.vercel.app'
```

**Domain δεν δουλεύει μετά από 1 ώρα**  
- Ελέγξτε DNS propagation: https://dnschecker.org → βάλτε `dm-accounting.gr`
- Επαληθεύστε ότι τα papaki DNS records ταιριάζουν ακριβώς με αυτά που ζητάει το Vercel

---

## 🎉 Συνολικό Κόστος: 10€/έτος (μόνο papaki domain)
