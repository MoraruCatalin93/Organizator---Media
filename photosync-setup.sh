#!/usr/bin/env bash
# PhotoSync SETUP complet (auto-continut). Modelele .bin nu sunt atinse.
set -e

echo "========================================"
echo "  PhotoSync - reconstructie completa"
echo "========================================"
echo ""

if [ ! -d "server/models" ]; then
  echo "EROARE: Nu gasesc server/models/. Ruleaza din radacina proiectului."
  exit 1
fi
echo "Modele binare: $(ls server/models/*.bin 2>/dev/null | wc -l | tr -d " ") fisiere (pastrate)"
echo ""

echo "[1/4] Scriu fisierele sursa..."

mkdir -p "$(dirname ".gitignore")"
cat > ".gitignore" << 'PHOTOSYNC_FILE_END_MARKER'
# ──────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────
node_modules/
*/node_modules/

# ──────────────────────────────────────────────
# Build output
# ──────────────────────────────────────────────
dist/
dist-ssr/
build/
*.local

# ──────────────────────────────────────────────
# Environment & secrets  (NICIODATĂ în git)
# ──────────────────────────────────────────────
.env
.env.*
!.env.example
credentials.json
token.json
server/credentials.json
server/token.json

# ──────────────────────────────────────────────
# App runtime data  (NICIODATĂ în git)
# ──────────────────────────────────────────────
server/uploads/
server/output/
server/data/db.json

# ──────────────────────────────────────────────
# OS files
# ──────────────────────────────────────────────
.DS_Store
Thumbs.db

# ──────────────────────────────────────────────
# Logs
# ──────────────────────────────────────────────
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# ──────────────────────────────────────────────
# Editors
# ──────────────────────────────────────────────
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# ──────────────────────────────────────────────
# Misc
# ──────────────────────────────────────────────
coverage/
.cache/
*.tsbuildinfo
PHOTOSYNC_FILE_END_MARKER
echo "  ok: .gitignore"

mkdir -p "$(dirname "README.md")"
cat > "README.md" << 'PHOTOSYNC_FILE_END_MARKER'
# 📸 Organizator-Media (PhotoSync)

> Organizează-ți automat fotografiile (și video-urile) folosind **recunoașterea facială AI**.
> Scanează un folder, detectează fețele, le compară cu persoanele cunoscute și le
> sortează automat în subfoldere pe nume.

## ✨ Funcționalități
- 🔍 Recunoaștere facială pe server (face-api.js + TensorFlow.js)
- 👤 Bază de date de persoane (înregistrezi o poză de referință per persoană)
- 📁 Scanare folder local **sau** upload multiplu (cu bară de progres)
- 🗂️ Organizare automată în `server/output/<NumePersoană>/`
- 🔗 Integrare Google Drive (în dezvoltare)

## 🏗️ Arhitectură
```
client/   → React 19 + Vite + Tailwind  (front-end)
server/   → Express 5 + face-api.js + tfjs-node  (API + AI)
```

## 🚀 Instalare rapidă

### Cerințe
- Node.js 20+
- Fișierele model (deja incluse în `server/models/`)

### 1. Server
```bash
cd server
cp .env.example .env      # apoi editează dacă e nevoie
npm install
npm run dev               # pornește pe http://localhost:5001
```

### 2. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev               # pornește pe http://localhost:5173
```

Deschide http://localhost:5173

## 🔐 Securitate & confidențialitate
- Procesarea fețelor = **date biometrice**. Respectă GDPR (consimțământ, drept la ștergere).
- `ALLOWED_SCAN_ROOT` (server/.env) restrânge folderele ce pot fi scanate.
- Nu lăsa `credentials.json`, `token.json`, `db.json` sau `uploads/` în git.

## 📋 Roadmap
Vezi [`REVIEW.md`](./REVIEW.md) pentru planul complet de îmbunătățiri.

## 📄 Licență
MIT
PHOTOSYNC_FILE_END_MARKER
echo "  ok: README.md"

mkdir -p "$(dirname "REVIEW.md")"
cat > "REVIEW.md" << 'PHOTOSYNC_FILE_END_MARKER'
# 🔍 Review & Roadmap — Organizator-Media (PhotoSync)

Review realizat pe `main` (commit `eb22839`). Proiect: organizator de media bazat pe
recunoaștere facială. Stack: **React 19 + Vite** (client) / **Express 5 + face-api.js + tfjs-node** (server).

> Conceptul e excelent. Problemele de mai jos sunt majoritatea „igienă de repo + MVP"
> și se repară repede. Nu e nevoie să le faci pe toate odată.

---

## 🔴 Critic (rezolvă primul)

### 1. `node_modules` comis în git — 11.892 fișiere, 91 MB!
Nu există `.gitignore` la rădăcină. Repo-ul e umflat, clone lent, GitHub îl poate refuza.
- [ ] adaugă `.gitignore` la root care ignoră `node_modules/`, `uploads/`, `output/`,
      `data/db.json`, `credentials.json`, `token.json`, `.DS_Store`, `dist/`, `*.local`
- [ ] `git rm -r --cached server/node_modules client/node_modules`
- [ ] `git rm --cached server/uploads/* server/data/db.json .DS_Store`

### 2. Date sensibile comise
- `server/data/db.json` conține **descriptori faciali** (date biometrice!) pentru persoana „cata".
- `server/uploads/93fa48c2...` — fișier încărcat de test (1.7 MB), nu trebuie în repo.
- `.DS_Store` (macOS) comis.
- Verifică că `credentials.json` / `token.json` (Google) **nu** ajung în git.

### 3. Vulnerabilitate de securitate — path traversal pe `/api/process/local`
Endpointul primește `folderPath` (cale absolută oarecare) și citește + copiază fișiere.
Oricine poate accesa **orice** de pe server. Pe lângă asta: fără rate-limiting, fără `helmet`,
fără validare de tip MIME / mărime maximă pe upload-uri.

---

## 🟡 Important (funcționalitate & corectitudine)

### 4. URL-ul API hardcodat peste tot
`const API_BASE = 'http://localhost:5001/api'` în Dashboard, ManagePersons, ProcessImages.
- [ ] folosește `import.meta.env.VITE_API_URL` + fișier `.env.example`.

### 5. Butonul de „Ștergere persoană" e mort
`ManagePersons.jsx` are un buton `Trash2` fără `onClick`, iar `personRoutes.js` nu are
rută `DELETE`. Trebuie conectat cap-coadă.

### 6. Video-urile NU sunt suportate (deși titlul zice „poze și video-uri")
Regexul acceptă doar `jpg|jpeg|png|webp`. Lipsesc:
- [ ] `.heic` / `.heif` (iPhone! — cea mai mare sursă de poze)
- [ ] `.mp4`, `.mov` (video)
- [ ] `.gif`, `.bmp`, `.tiff`, `.raw`
- [ ] orientarea EXIF (pozele de telefon apar întoarse)

### 7. Integrarea Google Drive e pe jumătate
`driveService.js` expune `getDriveClient()` dar **niciodată nu e folosit** în rute.
Nu există endpoint care să tragă/push-eze fișiere din Drive. E doar auth-ul.

### 8. Progres lipsă la scanarea folderului local
`/api/process/local` procesează tot într-un singur request sincron → clientul nu vede
niciun progres (doar flow-ul de upload are progress bar). Pentru foldere mari pare blocat.
- [ ] streaming / chunking, sau cel puțin `current/total` prin SSE.

### 9. „Baza de date" = `db.json` (read-modify-write sincron)
Risc de race condition la cereri concurente; refactor urechile-n sus: un `sqlite`/`lowdb`
cu locking, sau măcar un mutex simplu pe scriere.

---

## 🟢 Nice-to-have (calitate & performanță)

### 10. `FaceMatcher` reconstruit pentru FIECARE față
În `processImageFile`, `findBestMatch` creează `LabeledFaceDescriptors` + `FaceMatcher`
la fiecare detecție din imagine. Pentru poze de grup cu multe fețe → muncă repetată masivă.
Construiește matcher-ul **o dată** pe lot.

### 11. `getFaceDescriptor` ia o singură față (cea „prominentă")
La înregistrarea unei persoane, dacă poza de referință are mai mulți oameni, poate alege
greșit. Permite selecție/crop sau cel puțin avertizează.

### 12. Lipsă deduplicare în `output`
Refolosirea copiază din nou; poze de grup sunt multiplicate în fiecare folder de persoană.

### 13. Pragul de potrivire `0.55` hardcodat
face-api: distanță mică = potrivire bună. 0.55 e destul de lax; merită configurabil + UI
pentru a-l ajusta.

### 14. Fără teste, fără Docker, fără `concurrently`
- [ ] `concurrently` pentru `npm run dev` (client + server odată)
- [ ] `Dockerfile` / `docker-compose` pentru deployment
- [ ] teste minimale pentru `faceService.findBestMatch` și `storageService`

### 15. Microrufături
- CORS hardcodat `http://localhost:5173` (trebuie env-based pt. producție).
- `setInterval(() => {}, 1h)` în `index.js` — hack inutil de keep-alive.
- `multer` fără `limits` (DoS prin fișiere uriașe).
- Nu există `README` la root cu instrucțiuni de instalare/rulare.

---

## ✅ Ce e deja bine
- Arhitectură curată: separare `routes` / `services` / `models`.
- Patch pentru Node.js 24 + tfjs (bun catch).
- UI frumos, dark theme, React Router, iconițe lucide.
- Flow-ul de upload cu progress bar e bine gândit.
- Tratare de erori pe rute (try/catch + cleanup multer).
PHOTOSYNC_FILE_END_MARKER
echo "  ok: REVIEW.md"

mkdir -p "$(dirname "AUDIT.md")"
cat > "AUDIT.md" << 'PHOTOSYNC_FILE_END_MARKER'
# 📋 AUDIT — de la „funcțional" la „produs ok"

> Context: **single-user**, **multi-storage** (local + Drive + S3),
> **local-first acum, pregătit pentru viitor cloud**.
> Frontend deja React 19. Obiectiv: produs complet, polisat, ușor de întreținut.

Status legend: ✅ există | 🟡 parțial | ❌ lipsește

---

## 1. GAP-URI FUNCȚIONALE (ce NU face încă produsul)

### A. Suport media incomplet
| Funcționalitate | Status | Notă |
|---|---|---|
| Poze JPG/PNG/WEBP | ✅ | OK |
| **HEIC/HEIF (iPhone)** | ❌ | Cea mai mare sursă de poze azi. Necesită `sharp` sau `heic-convert`. |
| **Orientare EXIF** | ❌ | Pozele de telefon apar întoarse. `sharp` cu `rotate()` (auto-orientare). |
| **Video (MP4/MOV)** | ❌ | Promis în titlu, dar inexistent. Necesită `ffmpeg` → extragere cadru → detectare față pe cadru. |
| GIF/BMP/TIFF | 🟡 | Am permis extensia în multer, dar nu e testat/convertit. |

### B. Recunoaștere facială — lipsuri majore
| Funcționalitate | Status | Notă |
|---|---|---|
| Detectare + potrivire | ✅ | Funcționează de bază |
| **Clustere de fețe necunoscute** | ❌ | 🔥 Killer-feature: grupează fețele fără nume ca să le poți numi (ca Google/Apple Photos). Acum totul merge în „Unknown". |
| Mai multe poze de referință/personă | 🟡 | Codul suportă array, dar UI permite doar 1 la adăugare. |
| **Scor de încredere afișat** | ❌ | Utilizatorul nu vede cât de sigur e match-ul (avem `distance`, nu-l afișăm). |
| **Dry-run / preview** | ❌ | Acum copiază direct, distructiv, fără previzualizare. Periculos pentru un produs. |
| Prag de potrivire configurabil din UI | ❌ | Hardcodat 0.55 (acum în env, dar fără UI). |

### C. Rezultate & navigare
| Funcționalitate | Status | Notă |
|---|---|---|
| **Galerie de rezultate** | ❌ | 🔥 După organizare NU poți VEDE pozele în app — doar un jurnal text. Fără galerie produsul nu e complet. |
| Previzualizare poze de referință | ❌ | Vedeți doar inițiala numelui, nu poza persoanei înregistrate. |
| Progres la scanare folder local | ❌ | Server-Sent Events (SSE) sau polling. |
| Re-scan incremental | ❌ | Re-rularea copiază din nou tot; fără dedup. |

### D. Setări & storage
| Funcționalitate | Status | Notă |
|---|---|---|
| **Pagină „Setări"** | ❌ | Item de nav dezactivat. Trebuie: alegere destinație (local/Drive/S3), prag, conectare Drive. |
| **Abstractizare storage (multi-storage)** | ❌ | Acum doar `fs` hardcodat. Vezi §3 — necesar pentru Drive+S3. |
| Integrare Google Drive | 🟡 | Doar auth-ul. Lipsesc pull/push/listare. |

### E. UX & polisare
| Funcționalitate | Status | Notă |
|---|---|---|
| Responsive / mobil | ❌ | Sidebar `w-64` fix; se rupe pe mobil. |
| Empty states / loading | 🟡 | Există unele, inconsistent. |
| Error boundaries | ❌ | React; o eroare prăbușește toată pagina. |
| Onboarding (primă rulare) | ❌ | Fără ghid; un user nou nu știe ce să facă. |

---

## 2. „CUM SĂ-L ÎMPĂRTIM" — structură propusă

Problema actuală: paginile client sunt fișiere uriașe monolit
(`ProcessImages.jsx` = 279 linii cu totul inline) și nu există client API centralizat.
Serverul e ok dar storage-ul e cuplat la `fs`.

### Frontend (client/src) propus
```
src/
├── api/                       # ← NOU: client API centralizat
│   ├── client.js              #   instanță axios (baseURL din env, interceptori)
│   ├── persons.js             #   getPersons / addPerson / deletePerson
│   └── process.js             #   scanLocal / upload / driveStatus
├── components/                # ← NOU: componente reutilizabile
│   ├── layout/                #   Sidebar, Layout, PageHeader
│   ├── ui/                    #   Button, Card, ProgressBar, Spinner, EmptyState
│   ├── persons/               #   PersonCard, AddPersonForm, PersonGallery
│   └── media/                 #   Dropzone, ImageGrid, ResultBadge
├── pages/                     # pagini subțiate (doar orchestrare)
│   ├── Dashboard.jsx
│   ├── ManagePersons.jsx
│   ├── ProcessImages.jsx
│   ├── Gallery.jsx            # ← NOU
│   └── Settings.jsx           # ← NOU
├── hooks/                     # ← NOU: usePersons, useProcess, useStorageTargets
├── context/                   # ← NOU: SettingsContext (prag, destinație)
└── utils/                     # ← NOU: formatBytes, fileTypes, classNames
```
**Beneficiu:** fiecare pagină devine ~50-80 linii; logica reutilizabilă; testabil.

### Backend (server) propus
```
server/
├── index.js                   # bootstrap Express (slim)
├── config/
│   └── index.js               # ← NOU: tot ce vine din env, centralizat + validat
├── routes/                    # http-only, subțiri
├── services/
│   ├── faceService.js         # AI (există)
│   ├── storageService.js      # orchestrare organizare (există, refactor)
│   └── db/                    # ← NOU: repository pattern (swap db.json → SQLite)
│       ├── repository.js
│       └── jsonRepository.js
├── storage/                   # ← NOU: providers multi-storage
│   ├── Provider.js            #   interfața (list/read/write/mkdir/exists)
│   ├── LocalProvider.js
│   ├── DriveProvider.js
│   └── S3Provider.js
├── jobs/                      # ← NOU (mai târziu): coadă procesare (bullmq)
└── models/                    # face-api (există)
```

---

## 3. ABSTRACTIZARE STORAGE (pentru multi-storage)

Inima schimbării „local + Drive + S3". Definim o interfață unică:

```js
// server/storage/Provider.js
class StorageProvider {
  async list(dirPath)        {}   // → [{ name, isDir, size, modified }]
  async read(filePath)       {}   // → Buffer / Stream
  async write(filePath, buf) {}
  async ensureDir(dirPath)   {}
  async exists(target)       {}
  async remove(target)       {}
}

// fabrică: alege provider după config
function getStorageProvider(target = 'local') {
  switch (target) {
    case 'drive': return new DriveProvider(/* creds */);
    case 's3':    return new S3Provider(/* bucket */);
    case 'local':
    default:      return new LocalProvider(config.outputDir);
  }
}
```
Apoi `storageService.js` NU mai atinge `fs` direct — cheamă `provider.write(...)`.
Asta permite: local acum, Drive/S3 mai târziu, **fără** să refaci logica de organizare.

---

## 4. CLUSTERE DE FEȚE NECUNOSCUTE (killer-feature)

Acum: fețele fără match → bucket „Unknown" (inutil).
Produs adevarat:
1. La scanare, fiecare față fără match primește un **descriptor**.
2. Grupezi descriptorii prin distanță (ex: average-linkage clustering cu prag 0.5).
3. Rezulți „Persoană necunoscută #1, #2, ...".
4. UI: galerie cu o poză reprezentativă per cluster + „Cine e aceasta? [input nume]".
5. La numire, muți clusterul în folderul persoanei + îl adaugi în baza de fețe cunoscute.
→ Transformă produsul din „filtru" în „asistent de organizare".

---

## 5. PLAN DE EXECUȚIE (secvențiat, câte un obiectiv clar)

### 🟢 Sprint A — „funcțional de bază corect" (cea mai mare valoare acum)
1. `sharp` pentru HEIC + auto-orientare EXIF (1 fișier, impact uriaș).
2. **Abstractizare StorageProvider** + LocalProvider (pregătește Drive/S3).
3. **Galerie de rezultate** (să poți VEDE ce ai organizat).
4. Progres la scanare locală (SSE).

### 🟡 Sprint B — „produs polisat"
5. Client API centralizat + refactor pagini în componente.
6. Pagină Setări (destinație, prag, conectare Drive).
7. Mai multe poze de referință + scor încredere afișat.
8. Dry-run / preview înainte de copiere.

### 🟠 Sprint C — „diferențiere"
9. Clustere fețe necunoscute (killer-feature).
10. Suport video (ffmpeg → cadru → față).
11. Completare Google Drive (pull/push/listare) prin StorageProvider.
12. S3 provider.

### 🔵 Sprint D — „pregătit pentru viitor"
13. DB: db.json → SQLite (repository pattern deja la punct).
14. Docker + docker-compose.
15. Logging structurat + teste.
16. Responsive mobil + onboarding.

---

## 6. CE E DEJA BINE (păstrăm)
✅ Arhitectură routes/services/models · Stack modern (React 19, Vite, Express 5, tfjs-node)
✅ UI frumos dark · Fluxul de upload cu progress bar · Patch Node 24+ tfjs
✅ Tratare erori pe rute · Recunoaștere funcțională end-to-end

---

## Rezumat „must have" pentru a fi produs ok (minimul):
1. HEIC + EXIF (altfel jumătate din poze nu merg corect)
2. Galerie de rezultate (altfel utilizatorul nu vede output-ul)
3. Abstractizare storage (ca să poți adăuga Drive/S3 fără rescrieri)
4. Dry-run (altfel operația e distructivă și periculoasă)
5. Setări (prag + destinație)

**Recomandare:** începem cu **Sprint A** (punctele 1-4). Confirmă și trecem la cod.
PHOTOSYNC_FILE_END_MARKER
echo "  ok: AUDIT.md"

mkdir -p "$(dirname "client/.env.example")"
cat > "client/.env.example" << 'PHOTOSYNC_FILE_END_MARKER'
# ──────────────────────────────────────────────
# Client configuration  (copy to .env)
# ──────────────────────────────────────────────

# Base URL of the backend API (no trailing slash)
VITE_API_URL=http://localhost:5001/api
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/.env.example"

mkdir -p "$(dirname "client/src/App.jsx")"
cat > "client/src/App.jsx" << 'PHOTOSYNC_FILE_END_MARKER'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Camera, Users, FolderSync, Settings, Images } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ManagePersons from './pages/ManagePersons';
import ProcessImages from './pages/ProcessImages';
import Gallery from './pages/Gallery';

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Panou Control', icon: <Camera size={20} /> },
    { path: '/persons', label: 'Persoane', icon: <Users size={20} /> },
    { path: '/process', label: 'Procesare', icon: <FolderSync size={20} /> },
    { path: '/gallery', label: 'Galerie', icon: <Images size={20} /> },
  ];

  return (
    <nav className="w-64 bg-slate-800 h-screen fixed left-0 top-0 border-r border-slate-700 flex flex-col shadow-2xl z-10">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <Camera className="text-blue-500" /> PhotoSync
        </h1>
      </div>
      <div className="flex-1 flex flex-col gap-2 px-4 mt-8">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-6 text-slate-500 text-sm flex items-center gap-2 cursor-not-allowed hover:text-slate-400 transition-colors">
        <Settings size={16} />
        Setări
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
        <Navigation />
        <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
          <div className="relative z-0 max-w-5xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/persons" element={<ManagePersons />} />
              <Route path="/process" element={<ProcessImages />} />
              <Route path="/gallery" element={<Gallery />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/src/App.jsx"

mkdir -p "$(dirname "client/src/pages/Dashboard.jsx")"
cat > "client/src/pages/Dashboard.jsx" << 'PHOTOSYNC_FILE_END_MARKER'
import { useState, useEffect } from 'react';
import { Users, FolderCheck, HardDrive } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ personsCount: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/persons`)
      .then(res => {
        setStats({ personsCount: res.data.persons.length });
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-100">Panou Control</h2>
        <p className="text-slate-400 mt-2">Prezentare generală a sistemului de recunoaștere facială.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users size={24} className="text-blue-400" />}
          title="Persoane Cunoscute"
          value={stats.personsCount}
          bgClass="bg-blue-900/20 border-blue-800/30"
        />
        <StatCard 
          icon={<FolderCheck size={24} className="text-emerald-400" />}
          title="Imagini Procesate"
          value="-"
          bgClass="bg-emerald-900/20 border-emerald-800/30"
        />
        <StatCard 
          icon={<HardDrive size={24} className="text-purple-400" />}
          title="Drive Conectat"
          value="Nu"
          bgClass="bg-purple-900/20 border-purple-800/30"
        />
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">Cum funcționează</h3>
        <ol className="list-decimal pl-5 space-y-3 text-slate-400">
          <li>Mergi la secțiunea <span className="text-blue-400 font-medium">Persoane</span> și încarcă o fotografie de referință pentru fiecare persoană pe care vrei să o recunoști.</li>
          <li>Mergi la <span className="text-blue-400 font-medium">Procesare</span> și introdu calea unui folder local sau încarcă fișiere.</li>
          <li>Sistemul va detecta fețele, le va compara cu persoanele cunoscute și le va organiza automat în foldere în directorul de ieșire al serverului.</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, bgClass }) {
  return (
    <div className={`p-6 rounded-2xl border ${bgClass} backdrop-blur-sm flex items-start gap-4 transition-transform hover:-translate-y-1`}>
      <div className="p-3 bg-slate-800/50 rounded-xl shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
      </div>
    </div>
  );
}
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/src/pages/Dashboard.jsx"

mkdir -p "$(dirname "client/src/pages/Gallery.jsx")"
cat > "client/src/pages/Gallery.jsx" << 'PHOTOSYNC_FILE_END_MARKER'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Images, Loader2, AlertCircle, X, FolderOpen, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
// Media is served by the backend at /media (sibling of /api)
const MEDIA_BASE = (API_BASE).replace(/\/api\/?$/, '');

const Gallery = () => {
  const [persons, setPersons] = useState([]);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // { person, file }

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/gallery`);
      setPersons(data.persons || []);
      setTotalImages(data.totalImages || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la încărcarea galeriei');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const mediaUrl = (personName, filePath) =>
    `${MEDIA_BASE}/media/${filePath.split('/').map(encodeURIComponent).join('/')}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Galerie</h2>
          <p className="text-slate-400 mt-2">
            {totalImages > 0
              ? `${totalImages} imagini organizate în ${persons.length} persoane.`
              : 'Fotografiile organizate vor apărea aici.'}
          </p>
        </div>
        <button
          onClick={fetchGallery}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all"
        >
          <RefreshCw size={16} /> Reîmprospătează
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p>Se încarcă galeria...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} /> {error}
        </div>
      ) : persons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Images className="mb-3 opacity-20" size={48} />
          <p>Nicio imagine organizată încă.</p>
          <p className="text-sm mt-1">Mergi la <span className="text-blue-400">Procesare</span> pentru a organiza poze.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {persons.map(person => (
            <section key={person.name} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-semibold text-white">{person.name}</h3>
                <span className="px-2.5 py-0.5 bg-slate-700 rounded-full text-xs font-medium text-slate-300">
                  {person.count}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {person.files.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setActive({ person: person.name, file })}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 hover:border-blue-500/50 transition-all"
                  >
                    <img
                      src={mediaUrl(person.name, file.path)}
                      alt={file.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setActive(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            onClick={() => setActive(null)}
          >
            <X size={24} />
          </button>
          <div className="max-w-5xl max-h-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={mediaUrl(active.person, active.file.path)}
              alt={active.file.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FolderOpen size={14} />
              <span>{active.person}</span>
              <span className="text-slate-600">/</span>
              <span className="truncate max-w-md">{active.file.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/src/pages/Gallery.jsx"

mkdir -p "$(dirname "client/src/pages/ManagePersons.jsx")"
cat > "client/src/pages/ManagePersons.jsx" << 'PHOTOSYNC_FILE_END_MARKER'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const ManagePersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await axios.get(`${API_BASE}/persons`);
      setPersons(response.data.persons || []);
      setLoading(false);
    } catch (err) {
      setError('Eroare la încărcarea persoanelor');
      setLoading(false);
    }
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newName || !selectedFile) {
      setStatus({ type: 'error', message: 'Vă rugăm să introduceți un nume și o imagine.' });
      return;
    }

    setAdding(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('name', newName);
    formData.append('image', selectedFile);

    try {
      await axios.post(`${API_BASE}/persons`, formData);
      setStatus({ type: 'success', message: `Persoana ${newName} a fost adăugată cu succes` });
      setNewName('');
      setSelectedFile(null);
      // Reset file input
      e.target.reset();
      fetchPersons();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Eroare la adăugarea persoanei' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePerson = async (name) => {
    if (!window.confirm(`Sigur ștergi pe „${name}"? Toți descriptorii săi faciali vor fi șterși.`)) return;
    try {
      await axios.delete(`${API_BASE}/persons/${encodeURIComponent(name)}`);
      setStatus({ type: 'success', message: `Persoana ${name} a fost ștearsă.` });
      fetchPersons();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Eroare la ștergere' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Gestionare Persoane</h2>
        <p className="text-slate-400">Adaugă persoane în baza de date pentru recunoaștere facială.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Person Form */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserPlus className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Adaugă Persoană Nouă</h3>
          </div>

          <form onSubmit={handleAddPerson} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nume Complet</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: Ion Popescu"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Poză de Referință</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
                />
              </div>
            </div>

            {status.message && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm">{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {adding ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Se procesează...
                </>
              ) : (
                'Adaugă Persoană'
              )}
            </button>
          </form>
        </section>

        {/* Persons List */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Users className="text-indigo-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white">Persoane Înregistrate</h3>
            </div>
            <span className="px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-slate-300">
              {persons.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="animate-spin mb-3" size={32} />
                <p>Se încarcă baza de date...</p>
              </div>
            ) : persons.length > 0 ? (
              <div className="space-y-3">
                {persons.map((person) => (
                  <div key={person.name} className="group flex items-center justify-between p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl hover:border-blue-500/30 hover:bg-slate-900/60 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-slate-200 font-medium block">{person.name}</span>
                        {person.samples != null && (
                          <span className="text-xs text-slate-500">{person.samples} eșantioane</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePerson(person.name)}
                      title="Șterge persoana"
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                <Users className="mb-3 opacity-20" size={48} />
                <p>Nicio persoană înregistrată încă.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManagePersons;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/src/pages/ManagePersons.jsx"

mkdir -p "$(dirname "client/src/pages/ProcessImages.jsx")"
cat > "client/src/pages/ProcessImages.jsx" << 'PHOTOSYNC_FILE_END_MARKER'
import React, { useState } from 'react';
import axios from 'axios';
import { FolderSync, FolderOpen, UploadCloud, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const ProcessImages = () => {
  const [folderPath, setFolderPath] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);

  const handleLocalProcess = async (e) => {
    e.preventDefault();
    if (!folderPath) return;

    setProcessing(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentAction('Pornesc scanarea...');

    try {
      const resp = await fetch(`${API_BASE}/process/local/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || 'Eroare la procesarea folderului');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const allResults = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by a blank line
        const messages = buffer.split('\n\n');
        buffer = messages.pop(); // keep incomplete tail

        for (const msg of messages) {
          let eventName = 'message';
          let dataStr = '';
          for (const line of msg.split('\n')) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          const payload = dataStr ? JSON.parse(dataStr) : {};

          if (eventName === 'start') {
            setCurrentAction(`Găsite ${payload.total} imagini. Procesez...`);
          } else if (eventName === 'progress') {
            const pct = payload.total ? (payload.index / payload.total) * 100 : 0;
            setProgress(pct);
            setCurrentAction(`Procesez ${payload.index}/${payload.total}: ${payload.file}`);
            allResults.push({ file: payload.file, matched: payload.matched });
          } else if (eventName === 'done') {
            setProgress(100);
            setResults({
              success: true,
              processed: payload.processed,
              total: payload.total,
              results: payload.results?.length ? payload.results : allResults,
            });
            setCurrentAction('Procesare finalizată!');
          } else if (eventName === 'error') {
            throw new Error(payload.error || 'Eroare server');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Eroare la procesarea folderului');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadProcess = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    setProcessing(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentAction('Se pregătesc fișierele...');

    const total = uploadFiles.length;
    const allResults = [];
    let processedCount = 0;

    try {
      for (let i = 0; i < total; i++) {
        const file = uploadFiles[i];
        setCurrentAction(`Se procesează: ${file.name} (${i + 1} din ${total})`);
        
        const formData = new FormData();
        formData.append('images', file);

        const response = await axios.post(`${API_BASE}/process/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const baseProgress = (i / total) * 100;
            const fileWeight = (1 / total) * 100;
            setProgress(baseProgress + (uploadPercent * fileWeight / 100));
          }
        });

        if (response.data.results) {
          allResults.push(...response.data.results);
        }
        processedCount++;
        setProgress((processedCount / total) * 100);
      }

      setResults({
        success: true,
        processed: processedCount,
        total: total,
        results: allResults
      });
      setCurrentAction('Procesare finalizată!');
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la procesarea fișierelor încărcate');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Procesare Imagini</h2>
        <p className="text-slate-400">Organizează-ți fotografiile folosind recunoașterea facială AI.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local Folder Processing */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FolderOpen className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Folder Local</h3>
          </div>

          <form onSubmit={handleLocalProcess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cale Absolută</label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/Utilizatori/nume/Imagini/Excursie"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <p className="mt-2 text-xs text-slate-500 italic">
                * Serverul va scana acest folder și va crea subfoldere pentru fiecare persoană găsită.
              </p>
            </div>

            <button
              type="submit"
              disabled={processing || !folderPath}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <FolderSync size={20} />}
              Scanează și Organizează
            </button>
          </form>
        </section>

        {/* Upload & Process */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <UploadCloud className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Încarcă Imagini sau Folder</h3>
          </div>

          <form onSubmit={handleUploadProcess} className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500/50 hover:bg-slate-900/30 transition-all cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <ImageIcon className="mx-auto text-slate-600 mb-2 group-hover:text-indigo-400 transition-colors" size={32} />
              <p className="text-slate-300 font-medium">
                {uploadFiles.length > 0 ? `${uploadFiles.length} fișiere selectate` : 'Trage fișierele aici sau click pentru a alege'}
              </p>
              <p className="text-slate-500 text-xs mt-1">Suportă JPG, PNG, WEBP</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="hidden"
                  id="folder-upload"
                />
                <label 
                  htmlFor="folder-upload"
                  className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-dashed"
                >
                  <FolderOpen size={18} />
                  Alege un folder întreg
                </label>
              </div>

              <button
                type="submit"
                disabled={processing || uploadFiles.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <FolderSync size={20} />}
                Încarcă și Procesează
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Progress Bar Area */}
      {processing && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="text-blue-400 animate-spin" size={20} />
              <span className="text-slate-200 font-medium">{currentAction}</span>
            </div>
            <span className="text-blue-400 font-bold">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="mt-3 flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            <span>Inițializare</span>
            <span>Încărcare</span>
            <span>Analiză AI</span>
            <span>Finalizare</span>
          </div>
        </section>
      )}

      {/* Results View */}
      {(results || error) && !processing && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          {error ? (
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle size={24} />
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <CheckCircle2 size={24} />
                <h3 className="text-xl font-semibold">Procesare Finalizată</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Procesate</p>
                  <p className="text-2xl font-bold text-white">{results.processed}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Total Găsite</p>
                  <p className="text-2xl font-bold text-white">{results.total}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Rată Succes</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.round((results.processed / results.total) * 100) || 0}%
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-800/50 border-bottom border-slate-700 font-medium text-slate-300">
                  Jurnal Rezultate
                </div>
                <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar">
                  {results.results?.map((res, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-400 text-sm truncate max-w-[60%]">{res.file}</span>
                      <div className="flex gap-1">
                        {res.matched?.length > 0 ? (
                          res.matched.map(m => (
                            <span key={m} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase">
                            Fără Potrivire
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProcessImages;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: client/src/pages/ProcessImages.jsx"

mkdir -p "$(dirname "server/.env.example")"
cat > "server/.env.example" << 'PHOTOSYNC_FILE_END_MARKER'
# ──────────────────────────────────────────────
# Server configuration  (copy to .env)
# ──────────────────────────────────────────────

# Port for the API server
PORT=5001

# CORS — origin of your frontend client
CORS_ORIGIN=http://localhost:5173

# Allowed root directory that the /local scanner is permitted to read.
# In production, set this to the specific folder you want to allow scanning
# (e.g. /home/user/Pictures). Leave EMPTY to DISABLE local-folder scanning,
# which is the safest setting for a hosted deployment.
ALLOWED_SCAN_ROOT=

# Face matching distance threshold. face-api: LOWER = stricter match.
# Typical range 0.50–0.60. Default 0.55.
FACE_MATCH_THRESHOLD=0.55

# Max upload size per request, in MB.
MAX_UPLOAD_MB=25
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/.env.example"

mkdir -p "$(dirname "server/config/index.js")"
cat > "server/config/index.js" << 'PHOTOSYNC_FILE_END_MARKER'
// Centralized, validated configuration. Loads .env on first require.
require('dotenv').config();
const path = require('path');

const config = {
    port: parseInt(process.env.PORT || '5001', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowedScanRoot: (process.env.ALLOWED_SCAN_ROOT || '').trim(),
    faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.55'),
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
    // Where organized output is written (local provider root)
    outputDir: path.join(__dirname, '..', 'output'),
    // Active storage backend: 'local' | 'drive' | 's3' (drive/s3 added later)
    storageTarget: (process.env.STORAGE_TARGET || 'local').toLowerCase(),
    isProd: process.env.NODE_ENV === 'production',
};

module.exports = config;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/config/index.js"

mkdir -p "$(dirname "server/index.js")"
cat > "server/index.js" << 'PHOTOSYNC_FILE_END_MARKER'
// Patch for Node.js 24+ compatibility with older Tensorflow versions
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
    util.isNullOrUndefined = (val) => val === undefined || val === null;
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const personRoutes = require('./routes/personRoutes');
const processRoutes = require('./routes/processRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const config = require('./config');
const { loadModels } = require('./services/faceService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security headers (relaxed for multipart + cross-origin API)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS driven by env (comma-separated origins allowed)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic rate limiting — protects the (expensive) AI endpoints from abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,                 // max 200 requests / IP / window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Prea multe cereri. Încearcă din nou mai târziu.' }
});
app.use('/api/', limiter);

// Cap JSON body size (protects against oversized payloads)
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/persons', personRoutes);
app.use('/api/process', processRoutes);
app.use('/api/gallery', galleryRoutes);

// Serve organized images (local provider) — efficient streaming
app.use('/media', express.static(config.outputDir));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler — returns clean JSON for multer/validation errors
app.use((err, _req, res, _next) => {
    if (err && err.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? `Fișier prea mare (max ${process.env.MAX_UPLOAD_MB || 25} MB).`
            : err.message;
        return res.status(400).json({ error: msg });
    }
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origine nepermisă (CORS).' });
    }
    console.error('[Unhandled error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Eroare de server.' });
});

const server = app.listen(PORT, async () => {
    console.log(`\x1b[32m%s\x1b[0m`, `[Server] Running on http://localhost:${PORT}`);
    try {
        await loadModels();
        console.log(`\x1b[32m%s\x1b[0m`, `[Server] Face-api models loaded. Ready to process!`);
    } catch (e) {
        console.error("\x1b[31m%s\x1b[0m", `[Server] Failed to load models during startup:`, e);
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error("\x1b[31m%s\x1b[0m", `[Error] Port ${PORT} is already in use. Please kill the process or change the port.`);
    } else {
        console.error("\x1b[31m%s\x1b[0m", `[Error] Server error:`, e);
    }
});

PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/index.js"

mkdir -p "$(dirname "server/package.json")"
cat > "server/package.json" << 'PHOTOSYNC_FILE_END_MARKER'
{
  "name": "server",
  "version": "1.0.0",
  "description": "PhotoSync backend — facial recognition media organizer",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "type": "commonjs",
  "dependencies": {
    "@tensorflow/tfjs": "^4.22.0",
    "@vladmandic/face-api": "^1.7.15",
    "canvas": "^3.2.3",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^7.5.0",
    "fs-extra": "^11.3.4",
    "googleapis": "^171.4.0",
    "helmet": "^8.1.0",
    "multer": "^2.1.1"
  },
  "optionalDependencies": {
    "@tensorflow/tfjs-node": "^4.22.0",
    "sharp": "^0.33.5"
  }
}
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/package.json"

mkdir -p "$(dirname "server/routes/galleryRoutes.js")"
cat > "server/routes/galleryRoutes.js" << 'PHOTOSYNC_FILE_END_MARKER'
const express = require('express');
const config = require('../config');
const { getStorageProvider } = require('../storage');

const router = express.Router();

const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i;

/**
 * GET /api/gallery
 * Lists the organized output tree:
 *   { persons: [ { name, count, files: [{ name, path }] } ] }
 */
router.get('/', async (_req, res) => {
    try {
        const provider = getStorageProvider(config.storageTarget);
        const entries = await provider.list('');
        const persons = [];

        for (const entry of entries) {
            if (!entry.isDir) continue;
            const files = await provider.list(entry.path);
            const images = files
                .filter(f => !f.isDir && IMAGE_RE.test(f.name))
                .map(f => ({ name: f.name, path: f.path }));
            if (images.length === 0) continue;
            persons.push({ name: entry.name, count: images.length, files: images });
        }

        // Newest-sorted: most photos first
        persons.sort((a, b) => b.count - a.count);

        res.json({ persons, totalImages: persons.reduce((s, p) => s + p.count, 0) });
    } catch (e) {
        console.error('Gallery list error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/routes/galleryRoutes.js"

mkdir -p "$(dirname "server/routes/personRoutes.js")"
cat > "server/routes/personRoutes.js" << 'PHOTOSYNC_FILE_END_MARKER'
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const { getFaceDescriptor } = require('../services/faceService');
const { addPerson, getDatabase, saveDatabase, deletePerson, countDescriptors } = require('../services/storageService');

const router = express.Router();

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.originalname)) return cb(null, true);
        cb(new Error('Doar imagini (JPG, PNG, WEBP, GIF, BMP, TIFF).'));
    }
});

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const persons = Object.entries(db.persons).map(([name, descriptors]) => ({
            name,
            samples: countDescriptors(descriptors)
        }));
        res.json({ persons });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !req.file) {
            return res.status(400).json({ error: 'Name and image are required' });
        }

        const imageBuffer = await fs.readFile(req.file.path);
        
        // Extract face descriptor
        const descriptor = await getFaceDescriptor(imageBuffer);
        
        // Save to DB
        addPerson(name, [descriptor]);

        // Cleanup
        await fs.remove(req.file.path);

        res.json({ success: true, message: `Person ${name} added successfully.` });
    } catch (error) {
        console.error('Error adding person:', error);
        if (req.file) await fs.remove(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// Delete a person and all their face descriptors
router.delete('/:name', (req, res) => {
    try {
        const { name } = req.params;
        const deleted = deletePerson(name);
        if (!deleted) return res.status(404).json({ error: 'Persoana nu a fost găsită.' });
        res.json({ success: true, message: `Persoana ${name} a fost ștearsă.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/routes/personRoutes.js"

mkdir -p "$(dirname "server/routes/processRoutes.js")"
cat > "server/routes/processRoutes.js" << 'PHOTOSYNC_FILE_END_MARKER'
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const { getStorageProvider } = require('../storage');
const { withJpgExt } = require('../services/imageService');
const { processImageFile, copyImageToFolders, getDatabase } = require('../services/storageService');
const { hasCredentials, isAuthenticated, getAuthUrl, getAccessToken } = require('../services/driveService');

const router = express.Router();

const MAX_UPLOAD_MB = config.maxUploadMb;
const ALLOWED_IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

// Multer: size limit + file count + image-only filter
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 50 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_RE.test(file.originalname)) return cb(null, true);
        cb(new Error(`Tip de fișier neacceptat: ${file.originalname}`));
    }
});

/**
 * Resolve and validate a user-supplied folder path so the server can only
 * read inside ALLOWED_SCAN_ROOT (prevents path traversal / arbitrary file access).
 */
function resolveSafePath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') {
        throw new Error('Cale invalidă.');
    }
    const root = process.env.ALLOWED_SCAN_ROOT;
    if (!root) {
        throw new Error('Scanarea folderelor locale este dezactivată. Setează ALLOWED_SCAN_ROOT pe server.');
    }
    const resolved = path.resolve(rawPath);
    const rootResolved = path.resolve(root);
    // Reject any attempt to escape the allowed root via ".." or absolute paths outside it
    const rel = path.relative(rootResolved, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Acces refuzat: calea este în afara zonei permise.');
    }
    return resolved;
}

router.post('/local', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
        return res.status(400).json({ error: 'Folder path is required' });
    }

    try {
        const safePath = resolveSafePath(folderPath);

        if (!fs.existsSync(safePath)) {
            return res.status(400).json({ error: 'Folder does not exist' });
        }

        const files = await fs.readdir(safePath);
        const imageFiles = files.filter(f => ALLOWED_IMAGE_RE.test(f));
        
        const db = getDatabase();
        const provider = getStorageProvider(config.storageTarget);
        const results = [];

        for (const file of imageFiles) {
            const fullPath = path.join(safePath, file);
            const { matched, storeBuffer, converted } = await processImageFile(fullPath, db);
            const storeName = converted ? withJpgExt(file) : file;
            await copyImageToFolders(storeBuffer, matched, storeName, provider);
            results.push({ file, matched });
        }

        res.json({ success: true, processed: results.length, total: imageFiles.length, results });
    } catch (error) {
        console.error('Error processing local folder:', error);
        const status = error.message.includes('permisă') || error.message.includes('dezactivată') ? 403 : 500;
        res.status(status).json({ error: error.message });
    }
});

router.post('/upload', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const db = getDatabase();
        const provider = getStorageProvider(config.storageTarget);
        const results = [];

        for (const file of req.files) {
            const { matched, storeBuffer, converted } = await processImageFile(file.path, db);
            const storeName = converted ? withJpgExt(file.originalname) : file.originalname;
            await copyImageToFolders(storeBuffer, matched, storeName, provider);
            await fs.remove(file.path);
            results.push({ file: file.originalname, matched });
        }

        res.json({ success: true, processed: results.length, total: req.files.length, results });
    } catch (error) {
        console.error('Error processing uploads:', error);
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// ────────────────────────────────────────────────────────────
// SSE streaming scan of a local folder — emits live progress events.
//   events: 'start' {total} · 'progress' {index,total,file,matched}
//           'done' {processed,total,results} · 'error' {error}
// ────────────────────────────────────────────────────────────
router.post('/local/stream', async (req, res) => {
    const { folderPath } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const cleanup = () => { try { res.end(); } catch (_) {} };
    req.on('close', cleanup);

    try {
        const safePath = resolveSafePath(folderPath);
        if (!fs.existsSync(safePath)) {
            send('error', { error: 'Folderul nu există.' });
            return cleanup();
        }

        const all = await fs.readdir(safePath);
        const imageFiles = all.filter(f => ALLOWED_IMAGE_RE.test(f));
        send('start', { total: imageFiles.length });

        const db = getDatabase();
        const provider = getStorageProvider(config.storageTarget);
        const results = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const fullPath = path.join(safePath, file);
            const { matched, storeBuffer, converted } = await processImageFile(fullPath, db);
            const storeName = converted ? withJpgExt(file) : file;
            await copyImageToFolders(storeBuffer, matched, storeName, provider);
            results.push({ file, matched });
            send('progress', { index: i + 1, total: imageFiles.length, file, matched });
        }

        send('done', { processed: results.length, total: imageFiles.length, results });
    } catch (error) {
        console.error('Error streaming local folder:', error);
        send('error', { error: error.message });
    } finally {
        cleanup();
    }
});

// Drive Routes
router.get('/drive/status', (req, res) => {
    res.json({ 
        hasCredentials: hasCredentials(), 
        isAuthenticated: isAuthenticated(),
        authUrl: !isAuthenticated() && hasCredentials() ? getAuthUrl() : null
    });
});

router.post('/drive/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });
        await getAccessToken(code);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/routes/processRoutes.js"

mkdir -p "$(dirname "server/services/faceService.js")"
cat > "server/services/faceService.js" << 'PHOTOSYNC_FILE_END_MARKER'
const path = require('path');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

// ────────────────────────────────────────────────────────────
// Initialize the best available TensorFlow backend.
//  1. tfjs-node  → native, fast (uses libtensorflow). Requires the
//     libtensorflow binary to be present (downloaded on install).
//  2. fallback   → @tensorflow/tfjs CPU backend. Slower, but works on
//     any machine without native compilation. The server NEVER crashes
//     to a missing .dylib/.dll again.
// ────────────────────────────────────────────────────────────
let tfBackend = 'none';

try {
    require('@tensorflow/tfjs-node');
    tfBackend = 'tfjs-node (native, rapid)';
} catch (e) {
    const reason = (e.message || '').split('\n')[0];
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Backend nativ indisponibil — trec pe fallback CPU.`);
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Motiv: ${reason}`);
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Pentru viteză, încearcă: cd server && npm rebuild @tensorflow/tfjs-node`);
    try {
        const tf = require('@tensorflow/tfjs');
        tf.setBackend('cpu');
        tfBackend = 'tfjs-cpu (fallback, lent dar funcțional)';
    } catch (e2) {
        console.error(`\x1b[31m%s\x1b[0m`, `[faceService] Nici fallback-ul CPU nu a putut fi inițializat:`, (e2.message || '').split('\n')[0]);
    }
}

// Patch nodejs environment so face-api can work with the canvas library
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.join(__dirname, '../models');

let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    try {
        console.log(`\x1b[36m%s\x1b[0m`, `[faceService] Backend activ: ${tfBackend}`);
        console.log('Loading face-api models from:', MODELS_PATH);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        modelsLoaded = true;
        console.log(`\x1b[32m%s\x1b[0m`, `[faceService] Modele încărcate. Gata de procesare!`);
    } catch (error) {
        console.error('Error loading face-api models:', error);
        throw error;
    }
}

/**
 * Get face descriptor (embedding) from an image buffer
 * @param {Buffer} imageBuffer 
 * @returns {Float32Array} The face descriptor of the most prominent face
 */
async function getFaceDescriptor(imageBuffer) {
    await loadModels();
    
    const img = new Image();
    img.src = imageBuffer;
    
    // Detect single face with landmarks and descriptor
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
        throw new Error('No face detected in the image');
    }
    
    return detection.descriptor;
}

/**
 * Get all face descriptors from an image
 * @param {Buffer} imageBuffer 
 * @returns {Array} Array of detections with descriptors
 */
async function getAllFaces(imageBuffer) {
    await loadModels();
    
    const img = new Image();
    img.src = imageBuffer;
    
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    
    return detections;
}

/**
 * Compare an unknown face descriptor against known descriptors
 * @param {Float32Array} queryDescriptor 
 * @param {Object} labeledDescriptorsMap Map of { personName: [descriptor1, descriptor2...] }
 * @param {Number} threshold 
 * @returns {Object|null} Best match object { label, distance } or null
 */
function findBestMatch(queryDescriptor, labeledDescriptorsMap, threshold = 0.55) {
    const labeledFaceDescriptors = Object.keys(labeledDescriptorsMap).map(name => {
        // Descriptors might come from JSON as normal arrays, so we ensure they are Float32Array
        const descriptors = labeledDescriptorsMap[name].map(desc => {
            return desc instanceof Float32Array ? desc : new Float32Array(Object.values(desc));
        });
        return new faceapi.LabeledFaceDescriptors(name, descriptors);
    });

    if (labeledFaceDescriptors.length === 0) return null;

    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold);
    const bestMatch = faceMatcher.findBestMatch(queryDescriptor);
    
    if (bestMatch.label === 'unknown') {
        return null;
    }
    
    return {
        label: bestMatch.label,
        distance: bestMatch.distance
    };
}

module.exports = {
    loadModels,
    getFaceDescriptor,
    getAllFaces,
    findBestMatch
};
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/services/faceService.js"

mkdir -p "$(dirname "server/services/imageService.js")"
cat > "server/services/imageService.js" << 'PHOTOSYNC_FILE_END_MARKER'
// sharp is an optional dependency: HEIC/EXIF normalization. If it's not
// installed, the server still boots and works for JPG/PNG/WEBP (face-api
// handles those directly). We lazy-load it and fail gracefully per-image.
let _sharp = null;
function getSharp() {
    if (_sharp === null) {
        try {
            _sharp = require('sharp');
        } catch (e) {
            _sharp = false;
        }
    }
    if (!_sharp) {
        throw new Error('sharp nu este instalat (HEIC/EXIF indisponibil). Rulează: npm install sharp');
    }
    return _sharp;
}

/**
 * Normalize an image buffer for face detection:
 *  - Auto-orient from EXIF metadata (so a rotated photo is upright).
 *  - Decode HEIC/HEIF (iPhone) into JPEG.
 *
 * Returns:
 *   detectBuffer — oriented JPEG buffer, safe to feed face-api.
 *   storeBuffer  — what we actually store. For HEIC we store the converted
 *                  JPEG (universal display); for everything else we keep the
 *                  ORIGINAL bytes (no re-encode, full quality) since modern
 *                  viewers honor EXIF orientation.
 *   converted    — true when format changed (caller should rename to .jpg).
 */
async function prepareImage(buffer) {
    const sharp = getSharp();

    let format = '';
    try {
        const meta = await sharp(buffer).metadata();
        format = meta.format || '';
    } catch (_) {
        // Unknown/unreadable metadata — assume not heic.
    }

    const isHeic = ['heic', 'heif', 'avif'].includes(format);

    // Oriented JPEG used for detection (and storage when HEIC).
    const oriented = await sharp(buffer)
        .rotate()                 // auto-orient from EXIF
        .jpeg({ quality: 95 })
        .toBuffer();

    return {
        detectBuffer: oriented,
        storeBuffer: isHeic ? oriented : buffer,
        converted: isHeic,
    };
}

/** Swap a .heic/.heif/.avif extension to .jpg. */
function withJpgExt(name) {
    return name.replace(/\.(heic|heif|avif)$/i, '.jpg');
}

module.exports = { prepareImage, withJpgExt };
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/services/imageService.js"

mkdir -p "$(dirname "server/services/storageService.js")"
cat > "server/services/storageService.js" << 'PHOTOSYNC_FILE_END_MARKER'
const fs = require('fs-extra');
const path = require('path');
const { getAllFaces, findBestMatch } = require('./faceService');
const { prepareImage } = require('./imageService');
const { getStorageProvider } = require('../storage');
const config = require('../config');

const OUTPUT_DIR = config.outputDir;
const DATA_FILE = path.join(__dirname, '../data/db.json');

// Ensure directories exist
fs.ensureDirSync(OUTPUT_DIR);
fs.ensureDirSync(path.dirname(DATA_FILE));

// Initialize DB if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, { persons: {} });
}

function getDatabase() {
    return fs.readJsonSync(DATA_FILE);
}

function saveDatabase(data) {
    fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function addPerson(name, descriptors) {
    const db = getDatabase();
    if (!db.persons[name]) {
        db.persons[name] = [];
    }
    // Convert Float32Array to standard array for JSON serialization
    const serializableDescriptors = descriptors.map(desc => Array.from(desc));
    db.persons[name].push(...serializableDescriptors);
    saveDatabase(db);
}

function getPersons() {
    const db = getDatabase();
    return Object.keys(db.persons);
}

function deletePerson(name) {
    const db = getDatabase();
    if (!db.persons[name]) return false;
    delete db.persons[name];
    saveDatabase(db);
    return true;
}

// Count total descriptor entries for a person's record.
// Handles both arrays of descriptors (flat) and any nested shape defensively.
function countDescriptors(descriptors) {
    if (!Array.isArray(descriptors)) return 0;
    return descriptors.length;
}

// Helper to determine the destination folder(s) for one image.
// Returns { matched, storeBuffer, converted }.
async function processImageFile(imagePath, db) {
    const raw = await fs.readFile(imagePath);

    // Normalize: EXIF auto-orient + HEIC→JPEG (for detection).
    // storeBuffer keeps the ORIGINAL unless it was HEIC (then the JPEG).
    let detectBuffer = raw;
    let storeBuffer = raw;
    let converted = false;
    try {
        ({ detectBuffer, storeBuffer, converted } = await prepareImage(raw));
    } catch (e) {
        console.warn(`[prepareImage] fallback la buffer brut pentru ${imagePath}: ${e.message}`);
    }

    try {
        const detections = await getAllFaces(detectBuffer);

        if (detections.length === 0) {
            return { matched: ['Unknown'], storeBuffer, converted }; // No faces
        }

        const matchedNames = new Set();

        for (const detection of detections) {
            const match = findBestMatch(detection.descriptor, db.persons);
            if (match) {
                matchedNames.add(match.label);
            }
        }

        if (matchedNames.size === 0) {
            return { matched: ['Unknown'], storeBuffer, converted }; // Faces detected but unknown
        }

        // Single match or group photo (one entry per known person)
        return { matched: Array.from(matchedNames), storeBuffer, converted };

    } catch (e) {
        console.error(`Error processing image ${imagePath}:`, e);
        return { matched: ['Errors'], storeBuffer, converted };
    }
}

// Write the (already-prepared) buffer into each target person's folder
// through the active storage provider (local / drive / s3).
async function copyImageToFolders(buffer, targetFolders, fileName, provider) {
    const store = provider || getStorageProvider(config.storageTarget);
    for (const folderName of targetFolders) {
        await store.write(path.join(folderName, fileName), buffer);
    }
}

module.exports = {
    addPerson,
    getPersons,
    getDatabase,
    saveDatabase,
    deletePerson,
    countDescriptors,
    processImageFile,
    copyImageToFolders,
    OUTPUT_DIR
};
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/services/storageService.js"

mkdir -p "$(dirname "server/storage/LocalProvider.js")"
cat > "server/storage/LocalProvider.js" << 'PHOTOSYNC_FILE_END_MARKER'
const fs = require('fs-extra');
const path = require('path');
const StorageProvider = require('./Provider');

/**
 * Filesystem-backed provider. Rooted at a directory; all paths resolved
 * relative to it and confined inside it (no traversal outside root).
 */
class LocalProvider extends StorageProvider {
    constructor(rootDir) {
        super();
        this.rootDir = path.resolve(rootDir);
    }

    get type() { return 'local'; }
    getRoot() { return this.rootDir; }

    _resolve(relPath = '') {
        const resolved = path.resolve(this.rootDir, relPath);
        const rel = path.relative(this.rootDir, resolved);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error('Cale în afara zonei permise.');
        }
        return resolved;
    }

    async list(dirPath = '') {
        const dir = this._resolve(dirPath);
        if (!(await fs.pathExists(dir))) return [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.map(e => ({
            name: e.name,
            isDir: e.isDirectory(),
            path: path.relative(this.rootDir, path.join(dir, e.name)),
        }));
    }

    async read(filePath) {
        return fs.readFile(this._resolve(filePath));
    }

    async write(filePath, buffer) {
        const full = this._resolve(filePath);
        await fs.ensureDir(path.dirname(full));
        await fs.writeFile(full, buffer);
    }

    async ensureDir(dirPath) {
        return fs.ensureDir(this._resolve(dirPath));
    }

    async exists(target) {
        return fs.pathExists(this._resolve(target));
    }

    async remove(target) {
        return fs.remove(this._resolve(target));
    }
}

module.exports = LocalProvider;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/storage/LocalProvider.js"

mkdir -p "$(dirname "server/storage/Provider.js")"
cat > "server/storage/Provider.js" << 'PHOTOSYNC_FILE_END_MARKER'
// Abstract storage interface. Every backend (Local, Drive, S3) implements this,
// so the rest of the app never touches fs/googleapis/s3 directly.
//
// All paths are RELATIVE to the provider's root (e.g. "Cata/IMG_001.jpg").
// Buffers are used for read/write to stay backend-agnostic.
class StorageProvider {
    constructor() {
        if (this.constructor === StorageProvider) {
            throw new Error('StorageProvider is abstract — instantiate a concrete provider.');
        }
    }

    /** List entries in a directory. → [{ name, isDir, path }] (path is relative) */
    async list(/** dirPath */) { throw new Error('list() not implemented'); }

    /** Read a file. → Buffer */
    async read(/** filePath */) { throw new Error('read() not implemented'); }

    /** Write a buffer to a path (creates parent dirs). */
    async write(/** filePath, buffer */) { throw new Error('write() not implemented'); }

    /** Ensure a directory exists. */
    async ensureDir(/** dirPath */) { throw new Error('ensureDir() not implemented'); }

    /** Check existence of a file/dir. → boolean */
    async exists(/** target */) { throw new Error('exists() not implemented'); }

    /** Remove a file/dir. */
    async remove(/** target */) { throw new Error('remove() not implemented'); }

    /** Human label for this backend, e.g. "local". */
    get type() { return 'base'; }
}

module.exports = StorageProvider;
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/storage/Provider.js"

mkdir -p "$(dirname "server/storage/index.js")"
cat > "server/storage/index.js" << 'PHOTOSYNC_FILE_END_MARKER'
const StorageProvider = require('./Provider');
const LocalProvider = require('./LocalProvider');
const config = require('../config');

/**
 * Factory that returns the active storage backend.
 * Drive and S3 providers will be added in Sprint C without changing callers.
 * @param {'local'|'drive'|'s3'} [target]
 * @returns {StorageProvider}
 */
function getStorageProvider(target = config.storageTarget) {
    switch ((target || 'local').toLowerCase()) {
        case 'local':
        default:
            return new LocalProvider(config.outputDir);
        case 'drive':
            throw new Error('Storage Drive — implementat în Sprint C.');
        case 's3':
            throw new Error('Storage S3 — implementat în Sprint C.');
    }
}

module.exports = { StorageProvider, LocalProvider, getStorageProvider };
PHOTOSYNC_FILE_END_MARKER
echo "  ok: server/storage/index.js"

echo ""
echo "[2/4] Curat si reinstalez node_modules..."
echo "  server..."
rm -rf server/node_modules server/package-lock.json
cd server && npm install --no-audit --no-fund 2>&1 | tail -2 || true
echo "  rebuild tfjs-node (best-effort)..."
npm rebuild @tensorflow/tfjs-node 2>&1 | tail -1 || echo "  (continui pe CPU)"
cd ..
echo "  client..."
rm -rf client/node_modules client/package-lock.json
cd client && npm install --no-audit --no-fund 2>&1 | tail -2 || true
cd ..
echo "  ok dependente."

echo ""
echo "[3/4] Configurez .env..."
[ -f server/.env ] || cp server/.env.example server/.env
[ -f client/.env ] || cp client/.env.example client/.env
echo "  ok .env."

echo ""
echo "[4/4] Verificare backend AI..."
cd server && node -e "require('./services/faceService')" 2>&1 | grep -iE "Backend|nativ|fallback" || true
cd ..

echo ""
echo "========================================"
echo "  GATA! Ultimul pas manual:"
echo "========================================"
echo ""
echo "Editeaza server/.env si pune:"
echo "  ALLOWED_SCAN_ROOT=/Users/morarucatalin/Pictures"
echo ""
echo "Porneste:"
echo "  cd server && npm run dev"
echo "  cd client && npm run dev"
echo "Deschide: http://localhost:5173"
echo ""
