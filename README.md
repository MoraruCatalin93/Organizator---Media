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
