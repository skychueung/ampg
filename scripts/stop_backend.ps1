# stop_backend.ps1
# Stop the process listening on backend port 8001

$port = 8001
Write-Host "Looking for process on port $port..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $connection) {
    Write-Host "No process found on port $port." -ForegroundColor Gray
    exit 0
}

$proc = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Found: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Cyan
    Stop-Process -Id $proc.Id -Force
    Write-Host "Stopped backend on port $port." -ForegroundColor Green
} else {
    Write-Host "Could not resolve process for PID $($connection.OwningProcess)." -ForegroundColor Red
}
