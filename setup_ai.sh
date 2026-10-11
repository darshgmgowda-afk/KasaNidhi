#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -x scan-service/.venv/bin/python ] || { echo "Run bash ./setup_mac.sh first."; exit 1; }
scan-service/.venv/bin/python -m pip install --upgrade pip
scan-service/.venv/bin/python -m pip install -r scan-service/requirements-seg.txt
echo "Drishti AI libraries ready. Add/train scan-service/weights/drishti_waste_seg.pt for segmentation; otherwise /scan-ai falls back to CLIP."
