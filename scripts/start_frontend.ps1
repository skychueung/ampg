# start_frontend.ps1
# Start AMPGen Vite frontend dev server

$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $root "app"

if (-not (Test-Path $appDir)) {
    Write-Error "app directory not found at $appDir"
    exit 1
}

Write-Host "Starting AMPGen frontend..." -ForegroundColor Cyan
Write-Host "  Directory: $appDir" -ForegroundColor Gray
Write-Host "  URL:       http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Set-Location $appDir
npm run dev
