# smoke_export_reports.ps1
# Smoke test: verify all report export endpoints

$base = "http://127.0.0.1:8001"
$allOk = $true

Write-Host "Smoke Test: Report Export Endpoints" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "1. Health check..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/health" -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -ne 200) { throw "Health failed" }
    Write-Host "   [OK] Health" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Health: $_" -ForegroundColor Red
    $allOk = $false
}

# 2. Candidates CSV
Write-Host "2. GET /reports/candidates.csv ..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/candidates.csv" -UseBasicParsing -TimeoutSec 15
    if ($resp.StatusCode -ne 200) { throw "CSV failed" }
    $body = if ($resp.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($resp.Content) } else { $resp.Content }
    if ($body -notmatch "sequence") { throw "Missing sequence header" }
    Write-Host "   [OK] candidates.csv" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] candidates.csv: $_" -ForegroundColor Red
    $allOk = $false
}

# 3. Candidates FASTA
Write-Host "3. GET /reports/candidates.fasta ..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/candidates.fasta" -UseBasicParsing -TimeoutSec 15
    if ($resp.StatusCode -ne 200) { throw "FASTA failed" }
    if ($resp.Content -notmatch ">peptide_") { throw "Missing peptide header" }
    Write-Host "   [OK] candidates.fasta ($($resp.Content.Length) bytes)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] candidates.fasta: $_" -ForegroundColor Red
    $allOk = $false
}

# 4. Tasks JSON
Write-Host "4. GET /reports/tasks.json ..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/tasks.json" -UseBasicParsing -TimeoutSec 15
    if ($resp.StatusCode -ne 200) { throw "Tasks JSON failed" }
    $data = $resp.Content | ConvertFrom-Json
    if (-not $data.tasks) { throw "Missing tasks field" }
    Write-Host "   [OK] tasks.json ($($data.total) tasks)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] tasks.json: $_" -ForegroundColor Red
    $allOk = $false
}

# 5. Auto-discover a generation run
Write-Host "5. Discovering generation run..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/generation-runs" -UseBasicParsing -TimeoutSec 10
    $runs = $resp.Content | ConvertFrom-Json
    if ($runs.Count -eq 0) {
        Write-Host "   [SKIP] No generation runs found. Run smoke_local_demo.ps1 first." -ForegroundColor Yellow
    } else {
        $runId = $runs[0].id
        Write-Host "   [OK] Found run_id=$runId" -ForegroundColor Green

        # 5a. Run JSON
        Write-Host "6. GET /reports/generation-runs/$runId.json ..." -ForegroundColor Gray
        $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/generation-runs/$runId.json" -UseBasicParsing -TimeoutSec 15
        if ($resp.StatusCode -ne 200) { throw "Run JSON failed" }
        $data = $resp.Content | ConvertFrom-Json
        if (-not $data.generation_run) { throw "Missing generation_run" }
        if (-not $data.scientific_boundary) { throw "Missing scientific_boundary" }
        Write-Host "   [OK] run JSON report" -ForegroundColor Green

        # 5b. Run Markdown
        Write-Host "7. GET /reports/generation-runs/$runId.md ..." -ForegroundColor Gray
        $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/generation-runs/$runId.md" -UseBasicParsing -TimeoutSec 15
        if ($resp.StatusCode -ne 200) { throw "Run MD failed" }
        $body = if ($resp.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($resp.Content) } else { $resp.Content }
        if ($body -notmatch "AMPGen Generation Run Report") { throw "Missing report title" }
        if ($body -notmatch "Scientific Boundary") { throw "Missing scientific boundary section" }
        Write-Host "   [OK] run Markdown report" -ForegroundColor Green
    }
} catch {
    Write-Host "   [FAIL] Generation run discovery: $_" -ForegroundColor Red
    $allOk = $false
}

# 6. 404 test
Write-Host "8. GET /reports/generation-runs/9999.json (expect 404) ..." -ForegroundColor Gray
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/reports/generation-runs/9999.json" -UseBasicParsing -TimeoutSec 10
    Write-Host "   [FAIL] Expected 404, got $($resp.StatusCode)" -ForegroundColor Red
    $allOk = $false
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   [OK] Returned 404 as expected" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Unexpected error: $_" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "PASS: All report export smoke tests passed." -ForegroundColor Green
} else {
    Write-Host "FAIL: Some tests failed." -ForegroundColor Red
    exit 1
}
