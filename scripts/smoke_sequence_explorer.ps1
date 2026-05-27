<#
.SYNOPSIS
    Smoke test for v0.5.7 Sequence Explorer APIs and frontend route.
.DESCRIPTION
    Verifies:
    1. GET /api/v1/sequence-explorer/overview
    2. GET /api/v1/sequence-explorer/duplicates
    3. GET /api/v1/sequence-explorer/similarity
    4. GET /api/v1/sequence-explorer/motif-enrichment
    5. GET /api/v1/sequence-explorer/representatives
    6. Frontend /sequence-explorer chunk exists
    7. OpenAPI spec includes new endpoints
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

Write-Host "`n=== v0.5.7 Sequence Explorer Smoke Test ===`n" -ForegroundColor Cyan

# 1. Overview
Test-Step "GET /sequence-explorer/overview" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/sequence-explorer/overview" -Method GET
    if ($null -eq $r.total_sequences) { throw "missing total_sequences" }
    if ($null -eq $r.unique_sequences) { throw "missing unique_sequences" }
    if ($null -eq $r.disclaimer) { throw "missing disclaimer" }
}

# 2. Duplicates
Test-Step "GET /sequence-explorer/duplicates" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/sequence-explorer/duplicates" -Method GET
    if ($null -eq $r.duplicate_groups) { throw "missing duplicate_groups" }
    if ($null -eq $r.total_duplicate_sequences) { throw "missing total_duplicate_sequences" }
}

# 3. Similarity
Test-Step "GET /sequence-explorer/similarity" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/sequence-explorer/similarity?threshold=0.8&limit=20" -Method GET
    if ($null -eq $r.threshold) { throw "missing threshold" }
    if ($null -eq $r.pairs) { throw "missing pairs" }
    if ($null -eq $r.pair_count) { throw "missing pair_count" }
}

# 4. Motif enrichment
Test-Step "GET /sequence-explorer/motif-enrichment" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/sequence-explorer/motif-enrichment" -Method GET
    if ($null -eq $r.n_terminal_position_frequencies) { throw "missing n_terminal" }
    if ($null -eq $r.c_terminal_position_frequencies) { throw "missing c_terminal" }
    if ($null -eq $r.top_dipeptides) { throw "missing top_dipeptides" }
    if ($null -eq $r.top_amino_acids) { throw "missing top_amino_acids" }
}

# 5. Representatives
Test-Step "GET /sequence-explorer/representatives" {
    $r = Invoke-RestMethod -Uri "$BASE/api/v1/sequence-explorer/representatives?limit=5" -Method GET
    if ($null -eq $r.representatives) { throw "missing representatives" }
    foreach ($rep in $r.representatives) {
        if ($null -eq $rep.representative_rank) { throw "missing representative_rank" }
        if ($null -eq $rep.reason) { throw "missing reason" }
    }
}

# 6. Frontend dist
Test-Step "Frontend dist /sequence-explorer chunk exists" {
    $html = "app\dist\index.html"
    if (-not (Test-Path $html)) { throw "dist/index.html not found" }
    $chunks = Get-ChildItem "app\dist\assets\SequenceExplorerPage-*.js" -ErrorAction SilentlyContinue
    if (-not $chunks) { throw "SequenceExplorerPage chunk not found" }
}

# 7. OpenAPI
Test-Step "OpenAPI spec includes new endpoints" {
    $spec = Invoke-RestMethod -Uri "$BASE/openapi.json" -Method GET
    $paths = $spec.paths.PSObject.Properties.Name
    if ($paths -notcontains "/api/v1/sequence-explorer/overview") { throw "missing overview" }
    if ($paths -notcontains "/api/v1/sequence-explorer/duplicates") { throw "missing duplicates" }
    if ($paths -notcontains "/api/v1/sequence-explorer/similarity") { throw "missing similarity" }
    if ($paths -notcontains "/api/v1/sequence-explorer/motif-enrichment") { throw "missing motif-enrichment" }
    if ($paths -notcontains "/api/v1/sequence-explorer/representatives") { throw "missing representatives" }
}

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS  FAIL: $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
if ($FAIL -gt 0) { exit 1 }
