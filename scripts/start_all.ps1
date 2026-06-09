# start_all.ps1
# Start both backend and frontend in separate PowerShell windows

$root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $PSScriptRoot "start_backend.ps1"
$frontendScript = Join-Path $PSScriptRoot "start_frontend.ps1"

Write-Host "Starting AMPGen Agent Platform..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "Launching backend  -> http://127.0.0.1:8001" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$backendScript`"" -WindowStyle Normal

# Give backend a moment to initialize
Start-Sleep -Seconds 2

# Start frontend in a new window
Write-Host "Launching frontend -> http://localhost:3000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$frontendScript`"" -WindowStyle Normal

Write-Host ""
Write-Host "Both services started. Close the windows to stop." -ForegroundColor Cyan
Write-Host "Or run ./stop_backend.ps1 and ./stop_frontend.ps1 to stop individually." -ForegroundColor Gray
