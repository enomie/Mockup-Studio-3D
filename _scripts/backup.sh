#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d%H%M%S)"
SUFFIX="${1:-}"

if [[ -n "$SUFFIX" ]]; then
  FOLDER="backup-${STAMP}-${SUFFIX}"
else
  FOLDER="backup-${STAMP}"
fi

DEST="$ROOT/.backups/$FOLDER"
mkdir -p "$DEST"

for dir in src dist; do
  if [[ -d "$ROOT/$dir" ]]; then
    cp -R "$ROOT/$dir" "$DEST/"
  fi
done

FILES=(
  index.html
  favicon.ico
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  eslint.config.js
)

for file in "${FILES[@]}"; do
  if [[ -f "$ROOT/$file" ]]; then
    cp "$ROOT/$file" "$DEST/"
  fi
done

echo "Backup: .backups/$FOLDER"
