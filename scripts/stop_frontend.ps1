# stop_frontend.ps1
# Stop the Vite dev server process (node.exe running vite)

Write-Host "Looking for Vite frontend process..." -ForegroundColor Yellow

$procs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "vite" -or $_.CommandLine -match "npm"
}

if (-not $procs) {
    Write-Host "No Vite frontend process found." -ForegroundColor Gray
    exit 0
}

foreach ($proc in $procs) {
    Write-Host "Stopping: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Cyan
    Stop-Process -Id $proc.Id -Force
}

Write-Host "Stopped frontend dev server." -ForegroundColor Green
