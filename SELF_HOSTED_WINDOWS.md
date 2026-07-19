# 🖥️ DM Accounting — Self-Hosted στο PC σας (Windows)

**Στόχος:** Να τρέχει όλο το site (MongoDB + Backend + Frontend) στον υπολογιστή σας και να είναι προσβάσιμο εξωτερικά μέσω `https://dm-accounting.gr` — **χωρίς port forwarding, χωρίς static IP, χωρίς κόστος**.

**Πώς θα το πετύχουμε:**
- **Docker Desktop** — τρέχει όλες τις υπηρεσίες απομονωμένα
- **Docker Compose** — μια εντολή σηκώνει τα πάντα
- **Cloudflare Tunnel** — δωρεάν, εκθέτει το site στο internet χωρίς άνοιγμα ports στο router σας

**Χρόνος setup:** ~1 ώρα την πρώτη φορά. Μετά είναι one-command startup.

---

## 📋 Prerequisites (κάντε τα ΜΙΑ φορά)

### 1. Ενεργοποίηση WSL2 στα Windows
Το Docker Desktop χρειάζεται WSL2. Ανοίξτε **PowerShell ως Administrator** και τρέξτε:

```powershell
wsl --install
```

Θα σας ζητήσει επανεκκίνηση. Κάντε restart.

### 2. Εγκατάσταση Docker Desktop
1. Κατεβάστε: https://www.docker.com/products/docker-desktop/
2. Τρέξτε τον installer — αφήστε τα defaults (WSL 2 backend on)
3. Restart όταν το ζητήσει
4. Ανοίξτε Docker Desktop, δεχτείτε το EULA, αγνοήστε το prompt για sign-in
5. Επιβεβαιώστε ότι δουλεύει: ανοίξτε PowerShell και τρέξτε:
   ```powershell
   docker --version
   docker compose version
   ```
   Πρέπει να δείτε versions χωρίς error.

### 3. Εγκατάσταση Git for Windows
1. Κατεβάστε: https://git-scm.com/download/win
2. Επόμενο-επόμενο-Install (defaults ΟΚ)

---

## 🚀 Setup του site (κάντε τα ΜΙΑ φορά)

### Βήμα 1 — Clone το repo σας

Πρώτα κάντε "Save to GitHub" από το Emergent chat. Μετά:

```powershell
# Ανοίξτε PowerShell και μπείτε σε φάκελο της επιλογής σας
cd C:\
mkdir dm-accounting-site
cd dm-accounting-site

git clone https://github.com/YOUR_USER/dm-accounting.git .
```

### Βήμα 2 — Δημιουργία `.env` file

Στον ίδιο φάκελο δημιουργήστε αρχείο `.env` (ολόκληρο, όχι `.env.txt` — το Notepad συχνά προσθέτει `.txt`). Ευκολότερος τρόπος από PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Στο notepad, ελέγξτε ότι έχει τα σωστά values (θα πρέπει να είναι ήδη prefilled από εμένα):
```
JWT_SECRET=fliHKwYwI8OSTqMc_JudP7M8MtvcCtaTWUdKs4DWAxwiGnHgP2QCnFXvSQBfCdjl
ADMIN_EMAIL=admin@dmaccounting.gr
ADMIN_PASSWORD=sagapaoeygenia12
SENDER_EMAIL=noreply@dm-accounting.gr
OWNER_EMAIL=marinos20102001@gmail.com
RESEND_API_KEY=re_HbrC9BsS_JQ4eHTJiG249V1oRNKW5QvcB
FRONTEND_URL=https://dm-accounting.gr
CORS_ORIGINS=https://dm-accounting.gr,https://www.dm-accounting.gr
CF_TUNNEL_TOKEN=WILL_FILL_IN_STEP_4
```

Αφήστε προς το παρόν το `CF_TUNNEL_TOKEN` όπως είναι. Θα το γεμίσουμε στο Βήμα 4.

### Βήμα 3 — Πρώτο τρέξιμο (χωρίς tunnel ακόμα)

Στο PowerShell (μέσα στον φάκελο του project):

```powershell
# Comment-out προσωρινά το tunnel service για να δοκιμάσουμε πρώτα localhost
docker compose up -d mongo backend frontend
```

Θα κατεβάσει τις εικόνες και θα ξεκινήσει τα containers. Την πρώτη φορά αργεί ~5-10 λεπτά (κατέβασμα Docker images + build React).

Όταν τελειώσει, ελέγξτε:
- Ανοίξτε browser: **http://localhost:8080**
- Πρέπει να δείτε το site σας!
- Δοκιμή admin login: `admin@dmaccounting.gr` / `sagapaoeygenia12`

**Αν δεν φορτώνει**, δείτε τα logs:
```powershell
docker compose logs backend
docker compose logs frontend
```

### Βήμα 4 — Cloudflare Tunnel (για dm-accounting.gr)

Τώρα θα εκθέσουμε το site στο internet **δωρεάν και ασφαλώς**.

#### 4a. Δημιουργία Cloudflare account
1. https://dash.cloudflare.com/sign-up → δωρεάν
2. **Add site** → βάλτε `dm-accounting.gr` → **Free plan**
3. Το Cloudflare θα σας δώσει **2 nameservers** (π.χ. `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
4. **Σημειώστε τα** — θα τα βάλετε στο papaki

#### 4b. Αλλαγή nameservers στο papaki.gr
1. Login στο papaki.gr → **Τα Domain μου** → `dm-accounting.gr`
2. **Διαχείριση Nameservers** (ή "DNS Servers")
3. Διαγράψτε τα default nameservers και βάλτε τα 2 του Cloudflare
4. Save

Propagation: 15 λεπτά έως 24 ώρες (συνήθως 30 λεπτά). Επιστρέψτε στο Cloudflare dashboard — θα δείτε "Great news! Cloudflare is now protecting your site" όταν ενεργοποιηθεί.

#### 4c. Δημιουργία Tunnel
1. Cloudflare Dashboard → **Zero Trust** (αριστερά κάτω)
2. **Networks → Tunnels → Create a tunnel**
3. Connector: **Cloudflared**
4. Name: `dm-accounting-home` → Save
5. **Choose your environment: Docker** — θα δείτε ένα token τύπου:
   ```
   eyJhIjoiXXXXXXXXX...
   ```
6. **Αντιγράψτε ΟΛΟΚΛΗΡΟ το token**

#### 4d. Βάλτε το token στο `.env`
```powershell
notepad .env
```
Αντικαταστήστε τη γραμμή:
```
CF_TUNNEL_TOKEN=WILL_FILL_IN_STEP_4
```
με:
```
CF_TUNNEL_TOKEN=eyJhIjoiXXXXXXXXX... (το ολόκληρο)
```

Save + close.

#### 4e. Route το tunnel στο domain σας
Πίσω στο Cloudflare Zero Trust → Tunnel `dm-accounting-home` → **Next**:

**Public Hostname** section:
- Subdomain: (κενό)
- Domain: `dm-accounting.gr`
- Type: `HTTP`
- URL: `frontend:80`

Add:
- Subdomain: `www`
- Domain: `dm-accounting.gr`
- Type: `HTTP`
- URL: `frontend:80`

Save.

#### 4f. Ξεκινήστε ΟΛΑ τα containers με tunnel

```powershell
docker compose up -d
```

Μετά από ~1 λεπτό, ανοίξτε στον browser: **https://dm-accounting.gr**

🎉 **Πρέπει να δουλεύει με πράσινο SSL padlock!**

---

## 📌 Daily Operations

### Ξεκίνημα του site (κάθε φορά που ανοίγετε το PC)

Το Docker Desktop είναι configured να ξεκινά με τα Windows. Τα containers έχουν `restart: unless-stopped` — ξεκινούν αυτόματα.

**Έλεγχος status:**
```powershell
docker compose ps
```
Όλα πρέπει να είναι **running**.

### Stop / restart

```powershell
docker compose down          # Σταματάει τα πάντα
docker compose up -d         # Ξεκινάει
docker compose restart       # Restart όλα
docker compose restart backend   # Restart μόνο ένα service
```

### Logs (για troubleshooting)

```powershell
docker compose logs -f              # Live όλα
docker compose logs -f backend      # Live μόνο backend
docker compose logs --tail=100 backend
```

### Updates κώδικα

Όταν σας δώσω νέο κώδικα:
```powershell
cd C:\dm-accounting-site
git pull
docker compose up -d --build       # Rebuild + restart όσα άλλαξαν
```

### Backup MongoDB

Χωρίς εργαλεία που κατεβάζετε:
```powershell
docker exec dm-mongo mongodump --db dm_accounting --archive=/data/db/backup.gz --gzip
docker cp dm-mongo:/data/db/backup.gz .\backup-$(Get-Date -Format 'yyyy-MM-dd').gz
```

Αποθηκεύστε το `.gz` σε external drive / Google Drive.

**Restore:**
```powershell
docker cp .\backup-2026-02-17.gz dm-mongo:/data/db/backup.gz
docker exec dm-mongo mongorestore --archive=/data/db/backup.gz --gzip
```

---

## ⚠️ Σημαντικές Παρατηρήσεις

### PC Restart / Σβήσιμο
- Αν κλείσετε το PC → **το site πέφτει** (dm-accounting.gr θα δείχνει "Error 1033 tunnel offline")
- Το Cloudflare εμφανίζει professional error page αντί για blank
- Μόλις ξανα-ανοίξετε PC + Docker Desktop → auto-recovers σε ~1 λεπτό

### Ρεύμα
Το PC 24/7 καταναλώνει ρεύμα. Ανάλογα με το configuration:
- Απλός laptop: ~10€/μήνα
- Desktop gaming: 20-40€/μήνα
- Για μια πραγματική **οικονομική λύση 24/7**, σκεφτείτε Raspberry Pi 5 (~90€ one-time, ~2€/μήνα ρεύμα)

### Ασφάλεια
- **Windows Defender**: κρατήστε το ενεργό
- **Windows updates**: εγκατάσταση όταν σας ζητά
- **Cloudflare** ήδη σας δίνει DDoS protection και WAF δωρεάν
- Ο κωδικός admin είναι μακρύς — μη τον μοιράζεστε

### Uptime
Αν είναι δυνατό, βάλτε UPS (~50€) για να μη πέφτει το site σε διακοπές ρεύματος.

---

## 🆘 Troubleshooting

### `docker compose up` βγάζει "Cannot connect to Docker daemon"
Docker Desktop δεν τρέχει. Ανοίξτε το από το Start Menu.

### Το site δείχνει "Error 1033" ή "Tunnel offline"
```powershell
docker compose logs tunnel
```
Ελέγξτε ότι το `CF_TUNNEL_TOKEN` είναι σωστό στο `.env`.

### Backend crash — 500 error στη σελίδα
```powershell
docker compose logs backend --tail=200
```

### Δεν λαμβάνω emails
- Ελέγξτε τα Fly.io/local logs για μηνύματα Resend
- Επαληθεύστε ότι το `dm-accounting.gr` παραμένει verified στο Resend dashboard (μη διαγράψετε τα DNS records)
- **Προσοχή**: Μετά την αλλαγή nameservers σε Cloudflare, τα DNS records που είχε ζητήσει το Resend πρέπει να **ξαναμπούν** στο Cloudflare DNS! Πηγαίνετε στο Cloudflare → DNS → Add records τα ίδια που είχατε στο papaki.

### Frontend δεν βλέπει backend
Verify: `docker network inspect dm-accounting-site_default` — και τα δύο πρέπει να είναι στο ίδιο network (auto από Compose).

---

## 💰 Συνολικό Κόστος

- Domain (papaki): ~10€/έτος
- Ρεύμα PC: ~5-20€/μήνα
- Cloudflare + Docker + MongoDB: **0€**

**Πρώτος χρόνος: ~130-260€ (κυρίως ρεύμα)**

Vs. Fly.io: 10€/έτος. Αλλά έχετε τον απόλυτο έλεγχο.

---

## 🚀 Επόμενα Βήματα

1. ✅ Ολοκληρώστε τα Prerequisites (Docker Desktop, Git)
2. ✅ Clone repo → docker compose up (Βήμα 3) → testarε localhost
3. ✅ Cloudflare account + nameserver switch στο papaki (Βήμα 4a-b)
4. ✅ Δημιουργία tunnel + token (Βήμα 4c-d)
5. ✅ Route hostnames (Βήμα 4e)
6. ✅ Live στο dm-accounting.gr

Όποτε κολλήσετε, στείλτε μου screenshot ή error message.
