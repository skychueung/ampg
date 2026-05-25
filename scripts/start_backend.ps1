# start_backend.ps1
# Start AMPGen FastAPI backend on port 8001

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"

if (-not (Test-Path $backendDir)) {
    Write-Error "backend directory not found at $backendDir"
    exit 1
}

Write-Host "Starting AMPGen backend..." -ForegroundColor Cyan
Write-Host "  Directory: $backendDir" -ForegroundColor Gray
Write-Host "  URL:       http://127.0.0.1:8001" -ForegroundColor Gray
Write-Host ""

Set-Location $backendDir
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
