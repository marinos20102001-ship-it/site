# DM Accounting — 100% ΔΩΡΕΑΝ Deployment Guide (Μόνο το domain πληρώνεται)

## Στόχος
Να τρέξετε όλο το site χωρίς να πληρώνετε τίποτα παραπάνω από το domain (~10€/έτος).

## Αρχιτεκτονική
- **Frontend** (React) → **Vercel** (δωρεάν)
- **Backend** (FastAPI + persistent disk) → **Fly.io** (δωρεάν - 3GB)
- **MongoDB** → **MongoDB Atlas M0** (δωρεάν - 512MB)
- **Domain** → papaki.gr (~10€/έτος)

> ⚠️ Το Fly.io ζητάει πιστωτική κάρτα ΜΟΝΟ για επαλήθευση. Δεν χρεώνει τίποτα όσο μένετε στο free tier (3GB storage, 3 VMs).

---

## ΒΗΜΑ 1 — Domain
1. **papaki.gr** → αγοράστε `dmaccounting.gr` (~10€/έτος)

## ΒΗΜΑ 2 — MongoDB Atlas (δωρεάν)
1. https://www.mongodb.com/cloud/atlas/register
2. Create cluster → **M0 Free** στο **Frankfurt**
3. Username `dmadmin` + δυνατός κωδικός (αποθηκεύστε!)
4. Network Access → **Allow from anywhere** (0.0.0.0/0)
5. Database → Connect → Drivers → αντιγράψτε connection string
6. Αλλάξτε `<password>` και προσθέστε `/dm_accounting` πριν το `?`:
   ```
   mongodb+srv://dmadmin:YOUR_PASS@cluster.xxx.mongodb.net/dm_accounting?retryWrites=true&w=majority
   ```

## ΒΗΜΑ 3 — Push κώδικα στο GitHub
```bash
cd /your/local/folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOURUSER/dm-accounting.git
git push -u origin main
```

## ΒΗΜΑ 4 — Backend στο Fly.io (δωρεάν με persistent disk)

### A. Εγκατάσταση Fly CLI
```bash
# Mac
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### B. Login
```bash
flyctl auth signup     # ή flyctl auth login αν έχετε ήδη
```
(Θα ζητήσει credit card ΜΟΝΟ για verification — δεν χρεώνει στο free tier.)

### Γ. Launch app (από το repo σας)
```bash
cd /path/to/dm-accounting
flyctl launch --copy-config --no-deploy
```
- Όταν ρωτήσει `App name?` → `dm-accounting` (ή δικό σας μοναδικό)
- Region → `fra` (Frankfurt)
- Postgres? → **No**
- Redis? → **No**

### Δ. Δημιουργία persistent volume (δωρεάν 3GB)
```bash
flyctl volumes create dm_data --region fra --size 1
```

### E. Καταχώρηση secrets (environment variables)
```bash
flyctl secrets set \
  MONGO_URL="mongodb+srv://dmadmin:YOUR_PASS@cluster.xxx.mongodb.net/dm_accounting?retryWrites=true&w=majority" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ADMIN_EMAIL="marinosgr@yahoo.gr" \
  ADMIN_PASSWORD="ΒΑΛΤΕ_ΔΥΝΑΤΟ_ΚΩΔΙΚΟ_ΕΔΩ" \
  FRONTEND_URL="https://dmaccounting.gr" \
  CORS_ORIGINS="https://dmaccounting.gr,https://www.dmaccounting.gr"
```

### Στ. Deploy!
```bash
flyctl deploy
```
Περιμένετε ~3 λεπτά. Όταν τελειώσει, το URL είναι:
```
https://dm-accounting.fly.dev
```

### Z. Δοκιμή
Ανοίξτε `https://dm-accounting.fly.dev/api/` — πρέπει να δείτε `{"app":"DM Accounting","status":"ok"}`

## ΒΗΜΑ 5 — Frontend στο Vercel (δωρεάν)

1. https://vercel.com/signup → Continue with GitHub
2. **Add New** → **Project** → επιλέξτε το repo σας
3. **Root Directory**: `frontend`
4. **Framework Preset**: Create React App
5. **Environment Variables**:
   - `REACT_APP_BACKEND_URL` = `https://dm-accounting.fly.dev`
6. **Deploy** → URL: `https://dm-accounting.vercel.app`

## ΒΗΜΑ 6 — Σύνδεση Domain (papaki.gr → Vercel)

### Στο Vercel
1. Project Settings → **Domains** → Add
2. Πληκτρολογήστε `dmaccounting.gr`
3. Επαναλάβετε για `www.dmaccounting.gr`
4. Σημειώστε τα DNS records που σας δίνει (συνήθως):
   - `dmaccounting.gr` → **A** record → `76.76.21.21`
   - `www.dmaccounting.gr` → **CNAME** → `cname.vercel-dns.com`

### Στο papaki.gr
1. Login → Τα Domain μου → **dmaccounting.gr** → DNS Records
2. Διαγράψτε ΟΛΑ τα παλιά A records
3. Προσθέστε:
   - Type `A`, Host `@`, Value `76.76.21.21`
   - Type `CNAME`, Host `www`, Value `cname.vercel-dns.com`
4. Save → ~30 λεπτά propagation

## ΒΗΜΑ 7 — Επιστροφή στο Fly.io για ενημέρωση CORS
Μόλις το domain ενεργοποιηθεί:
```bash
flyctl secrets set \
  FRONTEND_URL="https://dmaccounting.gr" \
  CORS_ORIGINS="https://dmaccounting.gr,https://www.dmaccounting.gr,https://dm-accounting.vercel.app"
```

## ΒΗΜΑ 8 — Πρώτη χρήση
1. Πηγαίνετε στο `https://dmaccounting.gr`
2. Login: `marinosgr@yahoo.gr` + το `ADMIN_PASSWORD` που βάλατε
3. **Διαγράψτε** τον demo client `client@dmaccounting.gr` από το admin panel
4. Δημιουργήστε τους πραγματικούς πελάτες

---

## 🔒 Ασφάλεια Production

✅ HTTPS αυτόματα (Vercel & Fly.io)
✅ Bcrypt passwords + JWT + httpOnly cookies
✅ Client data isolation με JWT subject filtering
✅ Audit logs σε όλες τις admin ενέργειες

**Μετά το deploy, κάντε:**
- MongoDB Atlas → Network Access → περιορίστε στα Fly.io IPs ([λίστα](https://fly.io/docs/reference/network-services/))
- Ενεργοποιήστε 2FA σε όλους τους λογαριασμούς

## 💾 Backup MongoDB

**Εγκατάσταση mongodump:**
- Mac: `brew install mongodb-database-tools`
- Win/Linux: https://www.mongodb.com/try/download/database-tools

**Backup:**
```bash
mongodump --uri="mongodb+srv://USER:PASS@cluster.xxx.mongodb.net/dm_accounting" --out=./backup-$(date +%F)
```

**Restore:**
```bash
mongorestore --uri="mongodb+srv://..." ./backup-2026-06-13
```

**MongoDB Compass** (γραφικός browser της βάσης — δωρεάν):
https://www.mongodb.com/products/compass

## 🔧 Συντήρηση

### Update κώδικα
- Frontend: commit & push στο GitHub → Vercel auto-deploy
- Backend: `flyctl deploy` από τοπικά

### Logs
- Backend: `flyctl logs`
- Frontend: Vercel Dashboard → Project → Logs

### Monitoring
- Fly.io: `flyctl status`
- UptimeRobot.com → δωρεάν εξωτερικό monitoring

---

## ⚠️ Όρια Free Tier

| Πάροχος | Όριο | Τι σημαίνει για εσάς |
|---|---|---|
| **Fly.io** | 3 shared VMs (256MB→512MB), 3GB disk, 160GB bandwidth/μήνα | Αρκεί άνετα για 50–100 πελάτες |
| **MongoDB Atlas M0** | 512MB | ~500.000 records — πολλά χρόνια δεδομένων |
| **Vercel Hobby** | 100GB bandwidth/μήνα | Αρκεί για χιλιάδες επισκέπτες |

**Αν ξεπεράσετε όρια:**
- Fly.io: $0.15/GB extra storage, ή upgrade σε $5/μήνα
- Atlas: upgrade σε M2 ($9/μήνα) για 2GB
- Vercel: Pro ($20/μήνα) — απίθανο να χρειαστείτε

## 💰 Συνολικό Κόστος = 10€/έτος (μόνο domain) 🎉
