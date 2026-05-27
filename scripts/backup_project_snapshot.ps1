#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$BaseUri = "http://127.0.0.1:8001/api/v1"
$HealthUri = "http://127.0.0.1:8001/api"

# Check backend health
try {
    $health = Invoke-RestMethod -Uri "$HealthUri/health" -Method GET -TimeoutSec 5
    if ($health.status -ne "ok") {
        Write-Error "Backend is not healthy. Status: $($health.status)"
        exit 1
    }
} catch {
    Write-Error "Backend is not running at $HealthUri. Please start it with scripts/start_backend.ps1"
    exit 1
}

Write-Host "Backend is healthy. Creating project snapshot..." -ForegroundColor Cyan

$response = Invoke-RestMethod -Uri "$BaseUri/maintenance/create-project-snapshot" -Method POST

Write-Host "Snapshot created successfully!" -ForegroundColor Green
Write-Host "  Path: $($response.snapshot_path)" -ForegroundColor Green
Write-Host "  Size: $($response.size_mb) MB" -ForegroundColor Green
Write-Host "  Commit: $($response.manifest.git_commit)" -ForegroundColor Green
Write-Host "  Tag: $($response.manifest.git_tag)" -ForegroundColor Green
