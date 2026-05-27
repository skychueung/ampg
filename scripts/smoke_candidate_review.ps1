<#
.SYNOPSIS
    Smoke test for v0.5.8 Candidate Review Workbench APIs.
.DESCRIPTION
    Verifies:
    1. GET /api/v1/candidate-review/summary
    2. GET /api/v1/candidate-review/candidates
    3. GET /api/v1/candidate-review/candidates/{id}/evidence
    4. POST /api/v1/candidate-review/candidates/{id}/review
    5. GET /api/v1/candidate-review/shortlist
    6. POST /api/v1/candidate-review/export-shortlist.csv
    7. POST /api/v1/candidate-review/export-shortlist.fasta
    8. POST /api/v1/candidate-review/export-synthesis-order.csv
    9. Frontend /candidate-review chunk exists
    10. OpenAPI spec includes new endpoints
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

Write-Host "`n=== v0.5.8 Candidate Review Smoke Test ===`n" -ForegroundColor Cyan

# 1. Health
Test-Step "GET /api/health" {
    $r = Invoke-RestMethod -Uri "$BASE/api/health" -Method GET
    if ($r.status -ne "ok") { throw "health not ok" }
}

# 2. Summary
Test-Step "GET /candidate-review/summary" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/summary" -Method GET
    if ($null -eq $r.total_candidates) { throw "missing total_candidates" }
    if ($null -eq $r.disclaimer) { throw "missing disclaimer" }
}

# 3. Candidates
Test-Step "GET /candidate-review/candidates" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/candidates?limit=10" -Method GET
    if ($r.Count -eq 0) { throw "no candidates found" }
    $script:peptideId = $r[0].id
}

# 4. Evidence
Test-Step "GET /candidate-review/candidates/{id}/evidence" {
    if (-not $script:peptideId) { throw "no peptide id" }
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/candidates/$($script:peptideId)/evidence" -Method GET
    if ($null -eq $r.evidence) { throw "missing evidence" }
    if ($null -eq $r.rule_based_recommendation) { throw "missing recommendation" }
    if ($null -eq $r.disclaimer) { throw "missing disclaimer" }
}

# 5. Review
Test-Step "POST /candidate-review/candidates/{id}/review" {
    if (-not $script:peptideId) { throw "no peptide id" }
    $body = @{ review_status = "SHORTLISTED"; priority = "HIGH"; selected_for_synthesis = $true; batch_label = "round1"; review_notes = "Good profile." } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/candidates/$($script:peptideId)/review" -Method POST -Body $body -ContentType "application/json"
    if ($r.review_status -ne "SHORTLISTED") { throw "review_status not updated" }
    if ($r.priority -ne "HIGH") { throw "priority not updated" }
    if ($r.selected_for_synthesis -ne $true) { throw "selected_for_synthesis not updated" }
}

# 6. Shortlist
Test-Step "GET /candidate-review/shortlist" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/shortlist" -Method GET
    if ($r.Count -eq 0) { throw "shortlist empty after review" }
}

# 7. Export CSV
Test-Step "POST /candidate-review/export-shortlist.csv" {
    $resp = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/export-shortlist.csv" -Method POST
    if ($resp -notmatch "id") { throw "csv missing headers" }
}

# 8. Export FASTA
Test-Step "POST /candidate-review/export-shortlist.fasta" {
    $resp = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/export-shortlist.fasta" -Method POST
    if ($resp -notmatch ">peptide_" -and $resp -notmatch "^\s*$") { throw "fasta missing header format" }
}

# 9. Export Synthesis Order
Test-Step "POST /candidate-review/export-synthesis-order.csv" {
    $resp = Invoke-RestMethod -Uri "$BASE/api/v1/candidate-review/export-synthesis-order.csv" -Method POST
    if ($resp -notmatch "Order_ID") { throw "synthesis order missing headers" }
}

# 10. Frontend dist
Test-Step "Frontend dist /candidate-review chunk exists" {
    $html = "app\dist\index.html"
    if (-not (Test-Path $html)) { throw "dist/index.html not found" }
    $chunks = Get-ChildItem "app\dist\assets\CandidateReviewWorkbenchPage-*.js" -ErrorAction SilentlyContinue
    if (-not $chunks) { throw "CandidateReviewWorkbenchPage chunk not found" }
}

# 11. OpenAPI
Test-Step "OpenAPI spec includes new endpoints" {
    $spec = Invoke-RestMethod -Uri "$BASE/openapi.json" -Method GET
    $paths = $spec.paths.PSObject.Properties.Name
    if ($paths -notcontains "/api/v1/candidate-review/candidates") { throw "missing candidates" }
    if ($paths -notcontains "/api/v1/candidate-review/candidates/{peptide_id}/evidence") { throw "missing evidence" }
    if ($paths -notcontains "/api/v1/candidate-review/candidates/{peptide_id}/review") { throw "missing review" }
    if ($paths -notcontains "/api/v1/candidate-review/batch-review") { throw "missing batch-review" }
    if ($paths -notcontains "/api/v1/candidate-review/shortlist") { throw "missing shortlist" }
    if ($paths -notcontains "/api/v1/candidate-review/summary") { throw "missing summary" }
}

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS  FAIL: $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
if ($FAIL -gt 0) { exit 1 }
