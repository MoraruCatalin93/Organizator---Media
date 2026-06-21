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
