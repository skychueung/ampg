<#
.SYNOPSIS
    Smoke test for v0.5.6 Run Comparison APIs and frontend route.
.DESCRIPTION
    Verifies:
    1. GET  /api/v1/analytics/generation-runs-summary
    2. GET  /api/v1/analytics/generation-runs/{id}/analytics
    3. POST /api/v1/analytics/generation-runs/compare (2–4 runs)
    4. Frontend /run-comparison route (dist/index.html exists)
    5. OpenAPI spec includes new endpoints
#>

$ErrorActionPreference = "Stop"
$BASE = "http://127.0.0.1:8001"
$PASS = 0
$FAIL = 0

function Test-Step($Name, $ScriptBlock) {
    try {
        & $ScriptBlock
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:PASS++
    } catch {
        Write-Host "  [FAIL] $Name : $_" -ForegroundColor Red
        $script:FAIL++
    }
}

Write-Host "`n=== v0.5.6 Run Comparison Smoke Test ===`n" -ForegroundColor Cyan

# 1. Generation runs summary
Test-Step "GET /analytics/generation-runs-summary" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs-summary" -Method GET
    if ($null -eq $r.runs) { throw "missing runs field" }
    if ($null -eq $r.total) { throw "missing total field" }
    if ($null -eq $r.disclaimer) { throw "missing disclaimer" }
}

# 2. Generation run analytics (use first available run or skip)
Test-Step "GET /analytics/generation-runs/{id}/analytics" {
    $summary = Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs-summary" -Method GET
    if ($summary.runs.Count -eq 0) {
        Write-Host "    (skipping — no runs in DB)" -ForegroundColor Yellow
        return
    }
    $runId = $summary.runs[0].id
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs/$runId/analytics" -Method GET
    if ($r.run_id -ne $runId) { throw "run_id mismatch" }
    if ($null -eq $r.total_peptides) { throw "missing total_peptides" }
    if ($r.status_counts.Count -eq 0) { throw "missing status_counts" }
    if ($r.amino_acid_composition.Count -ne 20) { throw "expected 20 AA composition items" }
    if ($r.filter_rule_pass_rate.Count -ne 4) { throw "expected 4 filter rules" }
}

# 3. Compare validation — min 2
Test-Step "POST /analytics/generation-runs/compare min=2 validation" {
    try {
        Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs/compare" -Method POST -Body '{"run_ids":[1]}' -ContentType "application/json"
        throw "expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 4. Compare validation — max 4
Test-Step "POST /analytics/generation-runs/compare max=4 validation" {
    try {
        Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs/compare" -Method POST -Body '{"run_ids":[1,2,3,4,5]}' -ContentType "application/json"
        throw "expected 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw "expected 400, got $($_.Exception.Response.StatusCode.value__)" }
    }
}

# 5. Compare with available runs
Test-Step "POST /analytics/generation-runs/compare success" {
    $summary = Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs-summary" -Method GET
    if ($summary.runs.Count -lt 2) {
        Write-Host "    (skipping — need at least 2 runs)" -ForegroundColor Yellow
        return
    }
    $ids = $summary.runs | Select-Object -First 4 | ForEach-Object { $_.id }
    $body = @{ run_ids = @($ids) } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/analytics/generation-runs/compare" -Method POST -Body $body -ContentType "application/json"
    if ($r.compared_runs.Count -ne $ids.Count) { throw "compared_runs count mismatch" }
    foreach ($item in $r.compared_runs) {
        if ($null -eq $item.run_info) { throw "missing run_info" }
        if ($null -eq $item.length_distribution) { throw "missing length_distribution" }
        if ($null -eq $item.status_counts) { throw "missing status_counts" }
    }
}

# 6. Frontend dist exists
Test-Step "Frontend dist /run-comparison chunk exists" {
    $html = "app\dist\index.html"
    if (-not (Test-Path $html)) { throw "dist/index.html not found" }
    $chunks = Get-ChildItem "app\dist\assets\RunComparisonPage-*.js" -ErrorAction SilentlyContinue
    if (-not $chunks) { throw "RunComparisonPage chunk not found in dist/assets" }
}

# 7. OpenAPI spec
Test-Step "OpenAPI spec includes new endpoints" {
    $spec = Invoke-RestMethod -Uri "$BASE/openapi.json" -Method GET
    $paths = $spec.paths.PSObject.Properties.Name
    if ($paths -notcontains "/api/v1/analytics/generation-runs-summary") { throw "missing generation-runs-summary" }
    if ($paths -notcontains "/api/v1/analytics/generation-runs/{run_id}/analytics") { throw "missing generation-runs/{run_id}/analytics" }
    if ($paths -notcontains "/api/v1/analytics/generation-runs/compare") { throw "missing generation-runs/compare" }
}

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS  FAIL: $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
if ($FAIL -gt 0) { exit 1 }
