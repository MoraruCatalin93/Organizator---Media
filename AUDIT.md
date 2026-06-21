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
