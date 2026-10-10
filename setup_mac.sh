#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js first."; exit 1; }
(cd server && npm install --no-audit --no-fund)
[ -f server/.env ] || cp server/.env.example server/.env
PY="";for c in python3.12 python3.11 python3.10 python3.13 python3;do command -v "$c" >/dev/null 2>&1&&"$c" -c 'import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)' 2>/dev/null&&PY=$c&&break;done
[ -n "$PY" ]||{ echo "Python 3.10+ required.";exit 1; }
(cd scan-service&&{ [ -d .venv ]||"$PY" -m venv .venv; }&&.venv/bin/python -m pip install -q --upgrade pip&&.venv/bin/pip install -q -r requirements.txt)
npm install --no-audit --no-fund
echo "Done. Run: npm run dev:mac"
