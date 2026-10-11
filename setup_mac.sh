#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js first."; exit 1; }
(cd server && npm install --no-audit --no-fund)
[ -f server/.env ] || cp server/.env.example server/.env
PY="";for c in python3.12 python3.11 python3.10 python3.13 python3;do command -v "$c" >/dev/null 2>&1&&"$c" -c 'import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)' 2>/dev/null&&PY=$c&&break;done
[ -n "$PY" ]||{ echo "Python 3.10+ required.";exit 1; }
if [ ! -x scan-service/.venv/bin/python ]; then
  if ! "$PY" -m venv scan-service/.venv 2>/dev/null; then
    VER=$("$PY" -c 'import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    if command -v sudo >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
      echo "Installing python${VER}-venv for this Codespace..."
      sudo apt-get update -qq
      sudo apt-get install -y "python${VER}-venv"
      "$PY" -m venv scan-service/.venv
    else
      echo "Python venv support is missing. Install python${VER}-venv, then rerun this script."
      exit 1
    fi
  fi
fi
scan-service/.venv/bin/python -m pip install -q --upgrade pip
scan-service/.venv/bin/pip install -q -r scan-service/requirements.txt
npm install --no-audit --no-fund
echo "Done. Run: npm run dev:mac"
echo "For Real Waste AI + segmentation libraries: bash ./setup_ai.sh"
