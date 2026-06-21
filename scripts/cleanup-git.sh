#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# PhotoSync — git cleanup
# Scoate din tracking (FĂRĂ a șterge de pe disk) fișierele care
# nu trebuie niciodată în git: node_modules, uploads, db.json, .DS_Store
# ─────────────────────────────────────────────────────────────
set -e

echo "🧹 Curăț tracking-ul git (fișierele rămân pe disk)..."

# Scoate node_modules
git rm -r --cached server/node_modules 2>/dev/null && echo "  ✔ server/node_modules" || echo "  – server/node_modules nu era trackat"
git rm -r --cached client/node_modules 2>/dev/null && echo "  ✔ client/node_modules" || echo "  – client/node_modules nu era trackat"

# Date runtime / sensibile
git rm --cached server/data/db.json 2>/dev/null && echo "  ✔ server/data/db.json" || true
git rm --cached -r server/uploads 2>/dev/null && echo "  ✔ server/uploads" || true
git rm --cached .DS_Store 2>/dev/null && echo "  ✔ .DS_Store" || true
git rm --cached server/.DS_Store 2>/dev/null && echo "  ✔ server/.DS_Store" || true

# Asigură-te că .gitkeep-urile sunt adăugate
git add server/uploads/.gitkeep server/output/.gitkeep server/data/.gitkeep 2>/dev/null || true

# Adaugă noul .gitignore + fișierele modificate
git add .gitignore server/.env.example client/.env.example README.md REVIEW.md
git add -A

echo ""
echo "✅ Gata. Verifică diff-ul cu:  git status"
echo "Apoi comite cu:                git commit -m \"chore: curățare node_modules, .gitignore, hardening securitate\""
echo ""
echo "⚠️  Pentru a șTERGE complet node_modules din ISTORIC (ca repo-ul să slăbească"
echo "    de la ~91MB), după commit rulează odată:"
echo "    git filter-repo --path server/node_modules --path client/node_modules --invert-paths"
echo "    (instalează cu: pip install git-filter-repo)  — și apoi force-push."
