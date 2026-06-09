#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$BaseUri = "http://127.0.0.1:8001/api/v1"
$HealthUri = "http://127.0.0.1:8001/api"
$Pass = 0
$Fail = 0

function Test-Step($name, $scriptblock) {
    try {
        & $scriptblock
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:Pass++
    } catch {
        Write-Host "[FAIL] $name : $_" -ForegroundColor Red
        $script:Fail++
    }
}

Test-Step "Health check" {
    $r = Invoke-RestMethod -Uri "$HealthUri/health" -Method GET
    if ($r.status -ne "ok") { throw "Unhealthy: $($r.status)" }
}

Test-Step "Storage summary" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/storage-summary" -Method GET
    if (-not $r.database_path) { throw "Missing database_path" }
    if (-not $r.artifact_dir) { throw "Missing artifact_dir" }
    if ($r.peptide_count -eq $null) { throw "Missing peptide_count" }
}

Test-Step "Backup database" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/backup-database" -Method POST
    if (-not $r.backup_path) { throw "Missing backup_path" }
    if ($r.size_mb -eq $null) { throw "Missing size_mb" }
}

Test-Step "Backup artifacts" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/backup-artifacts" -Method POST
    if (-not $r.backup_path) { throw "Missing backup_path" }
    if ($r.size_mb -eq $null) { throw "Missing size_mb" }
}

Test-Step "List backups" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/backups" -Method GET
    if ($r.db_backups -eq $null) { throw "Missing db_backups" }
    if ($r.artifact_backups -eq $null) { throw "Missing artifact_backups" }
    if ($r.snapshots -eq $null) { throw "Missing snapshots" }
}

Test-Step "Cleanup artifacts dry-run" {
    $body = @{ older_than_days = 30; dry_run = $true } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/cleanup-artifacts" -Method POST -Body $body -ContentType "application/json"
    if ($r.dry_run -ne $true) { throw "dry_run should be true" }
    if ($r.files_to_delete -eq $null) { throw "Missing files_to_delete" }
}

Test-Step "Create project snapshot" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/create-project-snapshot" -Method POST
    if (-not $r.snapshot_path) { throw "Missing snapshot_path" }
    if ($r.size_mb -eq $null) { throw "Missing size_mb" }
    if (-not $r.manifest.git_commit) { throw "Missing manifest.git_commit" }
}

Test-Step "Restore requires confirm=false blocked" {
    $body = @{ backup_filename = "nonexistent.db"; confirm = $false } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/restore-database" -Method POST -Body $body -ContentType "application/json"
    if ($r.status -ne "BLOCKED") { throw "Expected BLOCKED, got $($r.status)" }
}

Test-Step "Reset demo requires confirm=false blocked" {
    $body = @{ confirm = $false; include_real_runs = $false; include_review_data = $false } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/reset-demo-data" -Method POST -Body $body -ContentType "application/json"
    if ($r.status -ne "BLOCKED") { throw "Expected BLOCKED, got $($r.status)" }
}

Test-Step "Storage summary after backups" {
    $r = Invoke-RestMethod -Uri "$BaseUri/maintenance/storage-summary" -Method GET
    if ($r.backup_count -lt 1) { throw "Expected at least 1 backup" }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Smoke Maintenance Result: $Pass passed, $Fail failed" -ForegroundColor Cyan
if ($Fail -eq 0) {
    Write-Host "ALL PASS" -ForegroundColor Green
} else {
    Write-Host "SOME FAILED" -ForegroundColor Red
    exit 1
}
