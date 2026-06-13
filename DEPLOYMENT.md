# DM Accounting — Πλήρης οδηγός Deployment (χωρίς Emergent)

## Αρχιτεκτονική
- **Frontend** (React) → Vercel (δωρεάν)
- **Backend** (FastAPI) → Render.com (`$7/μήνα`, με persistent disk για uploaded αρχεία)
- **MongoDB** → MongoDB Atlas (δωρεάν 512 MB)
- **Domain** → papaki.gr ή namecheap.com (~`10-20€/έτος`)

---

## 1. MongoDB Atlas (δωρεάν)

1. https://www.mongodb.com/cloud/atlas/register
2. Create deployment → **M0 Free** στο Frankfurt
3. Username/Password — αποθηκεύστε τα!
4. Network Access → Allow from anywhere (`0.0.0.0/0`)
5. Connect → Drivers → αντιγράψτε το connection string:
   ```
   mongodb+srv://USER:PASS@cluster.xxx.mongodb.net/dm_accounting?retryWrites=true&w=majority
   ```

## 2. Backend στο Render.com

1. Push τον κώδικα στο GitHub (αν δεν έχει γίνει)
2. https://render.com → Sign up με GitHub
3. **New +** → **Web Service** → επιλέξτε το repo σας
4. Render διαβάζει αυτόματα το `render.yaml`
5. **Δώστε τιμές στα ENV VARS** στο dashboard:
   - `MONGO_URL` = το connection string από Atlas
   - `ADMIN_PASSWORD` = δυνατός κωδικός (12+ chars)
   - `FRONTEND_URL` = θα δωθεί μετά (Βήμα 3)
   - `CORS_ORIGINS` = ίδιο με FRONTEND_URL
6. **Deploy!** Σε ~5 λεπτά θα δείτε π.χ. `https://dm-accounting-backend.onrender.com`
7. Δοκιμάστε: `https://dm-accounting-backend.onrender.com/api/` → πρέπει να γυρίσει `{"app":"DM Accounting","status":"ok"}`

## 3. Frontend στο Vercel

1. https://vercel.com → Sign up με GitHub
2. **Add New** → **Project** → επιλέξτε το repo σας
3. **Root Directory**: `frontend`
4. **Framework**: Create React App
5. **Environment Variables**:
   - `REACT_APP_BACKEND_URL` = το URL του Render (π.χ. `https://dm-accounting-backend.onrender.com`)
6. **Deploy!**
7. Θα πάρετε URL π.χ. `https://dm-accounting.vercel.app`
8. **Επιστρέψτε στο Render** και βάλτε αυτό το URL στα `FRONTEND_URL` και `CORS_ORIGINS` → "Save changes" (αυτό θα κάνει redeploy το backend)

## 4. Domain Connection

### Στο Vercel (frontend)
1. Project → Settings → **Domains**
2. Add → πληκτρολογήστε `dmaccounting.gr` και `www.dmaccounting.gr`
3. Το Vercel θα σας δώσει DNS records (A και CNAME) να βάλετε στον registrar (papaki)

### Στον registrar (papaki/namecheap)
1. Domain → Manage → DNS Records
2. Διαγράψτε όλα τα παλιά A/CNAME records
3. Προσθέστε αυτά που σας έδωσε το Vercel
4. Αναμονή 5–30 λεπτά για propagation

### Backend custom domain (προαιρετικά)
Αν θέλετε το backend σε `api.dmaccounting.gr`:
1. Render → Settings → **Custom Domains** → `api.dmaccounting.gr`
2. Στον registrar: CNAME `api` → το onrender.com URL
3. Στο Vercel ENV: βάλτε `REACT_APP_BACKEND_URL=https://api.dmaccounting.gr`

## 5. Έλεγχος Παραγωγής

- Πηγαίνετε στο `https://dmaccounting.gr`
- Login με admin (`marinosgr@yahoo.gr` + ADMIN_PASSWORD)
- Δημιουργήστε πελάτη, ανεβάστε excel, ελέγξτε ισοζύγιο
- Επιβεβαιώστε ότι το λουκέτο (HTTPS 🔒) είναι πράσινο

## 6. Backup MongoDB

### Manual backup (Mac/Linux)
```bash
# Εγκαταστήστε mongodump
brew install mongodb-database-tools   # Mac
# ή κατεβάστε από https://www.mongodb.com/try/download/database-tools

# Export
mongodump --uri="mongodb+srv://USER:PASS@cluster.xxx.mongodb.net/dm_accounting" --out=./backup

# Restore
mongorestore --uri="mongodb+srv://USER:PASS@..." ./backup
```

### Auto backup
Στο Atlas → Cluster → Backup → ενεργοποιήστε **Continuous Cloud Backup** (~$2/μήνα για 2GB).

## 7. Συντήρηση

### Update κώδικα
- Κάντε commit στο GitHub → push
- Render και Vercel αυτόματα κάνουν redeploy

### Logs
- **Render**: Dashboard → Service → Logs (real-time)
- **Vercel**: Dashboard → Project → Logs / Functions

### Παρακολούθηση
- Render Health Checks → ενεργοποιημένα by default
- UptimeRobot.com → δωρεάν εξωτερικό monitoring

---

## Συνολικό Κόστος Παραγωγής
- Domain `.gr`: ~10€/έτος
- Render Starter: $7/μήνα (~7€)
- MongoDB Atlas M0: δωρεάν
- Vercel Hobby: δωρεάν
- **Σύνολο: ~84€/έτος**

## Επιπλέον Tips Ασφαλείας
1. Αλλάξτε `ADMIN_PASSWORD` στο πρώτο login
2. Διαγράψτε τον demo client `client@dmaccounting.gr`
3. Στο MongoDB Atlas περιορίστε IP access ΜΟΝΟ στα Render IPs (όχι 0.0.0.0/0) — μετά το deploy
4. Ενεργοποιήστε 2FA στους λογαριασμούς Vercel/Render/Atlas/GitHub/papaki
