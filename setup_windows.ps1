$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Checked($Command, $Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}
Write-Host 'Setting up the complete KasaNidhi runtime...' -ForegroundColor Green
Checked 'npm.cmd' @('install')
Checked 'npm.cmd' @('--prefix', 'server', 'install')
$LocalPython = Join-Path $PSScriptRoot '.local/python/python.exe'
$InstalledPython = Join-Path $env:LOCALAPPDATA 'Programs/Python/Python313/python.exe'
if (!(Test-Path 'scan-service/.venv/Scripts/python.exe')) {
    if (Test-Path $InstalledPython) { Checked $InstalledPython @('-m', 'venv', 'scan-service/.venv') }
    elseif (Test-Path $LocalPython) { Checked $LocalPython @('-m', 'venv', 'scan-service/.venv') }
    else {
        & py -3.12 --version
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 is required. Install it from python.org, then rerun setup.' }
        Checked 'py' @('-3.12', '-m', 'venv', 'scan-service/.venv')
    }
}
$VenvPython = Join-Path $PSScriptRoot 'scan-service/.venv/Scripts/python.exe'
$RuntimeRequirements = 'scan-service/requirements-lock-windows.txt'
if (Test-Path '.local/wheelhouse') {
    Checked $VenvPython @('-m', 'pip', 'install', '--no-compile', '--no-index', '--find-links', '.local/wheelhouse', '-r', $RuntimeRequirements)
} else {
    Checked $VenvPython @('-m', 'pip', 'install', '--no-compile', '-r', $RuntimeRequirements)
}
if (Test-Path 'scan-service/weights/drishti_waste_seg.pt') {
    Checked $VenvPython @('-m', 'pip', 'install', '-r', 'scan-service/requirements-seg.txt')
}
if (!(Test-Path 'server/.env')) { Copy-Item 'server/.env.example' 'server/.env' }
Checked $VenvPython @('scripts/prepare_ai.py')
Write-Host 'Done. Run: npm start. Paste your GROQ_API_KEY in server/.env to enable live chat and voice.' -ForegroundColor Yellow
