#!/bin/zsh
# Football Life — one-click launcher.
# First run: installs dependencies, sets up the database, then starts the game.
# Later runs: just starts the game. Opens the browser automatically.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "⚽  Football Life — $PROJECT_DIR"

# --- make sure Node is available (nvm or any installed version) ---
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
if ! command -v node >/dev/null 2>&1; then
  NODE_BIN="$(ls -d "$NVM_DIR"/versions/node/*/bin 2>/dev/null | tail -1)"
  [ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "❌  Node.js non trovato. Installa Node 20+ (https://nodejs.org) e riprova."
  echo "Premi Invio per chiudere."; read _
  exit 1
fi
echo "•  Node $(node --version)"

# --- first-run install ---
if [ ! -d node_modules ]; then
  echo "•  Installazione dipendenze (solo la prima volta)…"
  npm install
  echo "•  Generazione client Prisma…"
  npx prisma generate
fi

[ -f .env ] || cp .env.example .env

if [ ! -f prisma/dev.db ]; then
  echo "•  Preparazione database…"
  npx prisma migrate deploy
  npm run prisma:seed
fi

# --- open the browser once the web app is up ---
( for i in $(seq 1 60); do
    if curl -fs http://localhost:5173 >/dev/null 2>&1; then open http://localhost:5173; break; fi
    sleep 1
  done ) &

echo "•  Avvio del gioco… (chiudi questa finestra o premi Ctrl-C per fermarlo)"
npm run dev
