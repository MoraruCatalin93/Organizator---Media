#!/usr/bin/env bash
set -e
echo "========================================"
echo "  PhotoSync - curatare repo"
echo "========================================"
echo ""
if [ ! -d ".git" ]; then
    echo "EROARE: Nu esti intr-un repo git."
    exit 1
fi

echo "[1/4] Actualizez .gitignore..."
if ! grep -q 'RUNTIME-DATA-IGNORE' .gitignore 2>/dev/null; then
{
    echo ""
    echo "# RUNTIME-DATA-IGNORE: tot ce e runtime in data/ (NU in git)"
    echo "server/data/*"
    echo "!server/data/.gitkeep"
    echo ""
    echo "# Fisiere temporare de lucru"
    echo "photosync-files.zip"
    echo "photosync-setup.sh"
    echo "repomix-output.xml"
    echo "*.bak"
    echo ""
    echo "# Referinte imagini (pozele userului)"
    echo "server/data/references/"
} >> .gitignore
    echo "  ok .gitignore actualizat."
else
    echo "  - .gitignore deja actualizat."
fi
echo ""

echo "[2/4] Scot TOATE datele din server/data/ din tracking (biometrie inclus)..."
for f in $(git ls-files server/data/ | grep -v '.gitkeep'); do
    git rm --cached --quiet "$f" 2>/dev/null && echo "  ok $f (scos din git, ramane pe disk)" || echo "  - $f (nu era)"
done
echo ""

echo "[3/4] Sterg complet fisierele temporare de la root (si disk si git)..."
git rm --quiet photosync-files.zip 2>/dev/null && echo "  ok photosync-files.zip" || echo "  - photosync-files.zip (nu exista)"
git rm --quiet photosync-setup.sh 2>/dev/null && echo "  ok photosync-setup.sh" || echo "  - photosync-setup.sh (nu exista)"
git rm --quiet repomix-output.xml 2>/dev/null && echo "  ok repomix-output.xml" || echo "  - repomix-output.xml (nu exista)"
git rm --cached --quiet .DS_Store 2>/dev/null && echo "  ok .DS_Store" || true
git rm --cached --quiet server/.DS_Store 2>/dev/null && echo "  ok server/.DS_Store" || true
echo ""

echo "[4/4] Comit..."
# Acum .gitignore are regula server/data/* deci git add -A NU re-adauga datele
git add -A
if git diff --cached --quiet; then
    echo "  - Nimic de comis."
else
    git config user.email "cleanup@local" 2>/dev/null || true
    git config user.name "Cleanup" 2>/dev/null || true
    git commit -q -m "chore: scot date biometrice si fisiere temporare din repo"
    echo "  ok Comis."
fi
echo ""
echo "========================================"
echo "  GATA! Repo curat."
echo "========================================"
echo ""
echo "Verifica (trebuie sa afiseze NICIUNUL):"
echo "  git ls-files | grep -E 'db.json.migrated|hashes.json|transactions.json|photosync-|repomix'"
echo ""
echo "Apoi da push:"
echo "  git push"
echo ""
