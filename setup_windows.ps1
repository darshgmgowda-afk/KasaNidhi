$ErrorActionPreference="Stop"
Write-Host "Setting up KasaNidhi prototype..." -ForegroundColor Green
npm install
npm --prefix server install
if (!(Test-Path "scan-service/.venv")) { py -m venv scan-service/.venv }
& "scan-service/.venv/Scripts/python.exe" -m pip install --upgrade pip
& "scan-service/.venv/Scripts/python.exe" -m pip install -r scan-service/requirements.txt
if (!(Test-Path "server/.env")) { Copy-Item "server/.env.example" "server/.env" }
Write-Host "Done. Run: npm run dev:win" -ForegroundColor Yellow
Write-Host "Optional CLIP: scan-service/.venv/Scripts/python.exe -m pip install -r scan-service/requirements-ai.txt" -ForegroundColor Cyan
