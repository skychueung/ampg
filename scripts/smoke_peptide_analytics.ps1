# Peptide Analytics Smoke Test
# Verifies all analytics endpoints

$BASE = "http://127.0.0.1:8001/api"
$PASS = 0
$FAIL = 0

function Assert-Status($resp, $expected, $name) {
    if ($resp.StatusCode -eq $expected) {
        Write-Host "  PASS: $name" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  FAIL: $name (expected $expected, got $($resp.StatusCode))" -ForegroundColor Red
        $script:FAIL++
    }
}

Write-Host "=== Peptide Analytics Smoke Test ===" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n[1/7] GET /api/health"
try {
    $r = Invoke-WebRequest -Uri "$BASE/health" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Health check"
} catch {
    Write-Host "  FAIL: Health check - $_" -ForegroundColor Red
    $FAIL++
}

# 2. Peptides summary
Write-Host "`n[2/7] GET /api/v1/analytics/peptides-summary"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/peptides-summary" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Peptides summary"
    $data = $r.Content | ConvertFrom-Json
    Write-Host "       total_peptides=$($data.total_peptides)"
} catch {
    Write-Host "  FAIL: Peptides summary - $_" -ForegroundColor Red
    $FAIL++
}

# 3. Property distributions
Write-Host "`n[3/7] GET /api/v1/analytics/property-distributions"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/property-distributions" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Property distributions"
} catch {
    Write-Host "  FAIL: Property distributions - $_" -ForegroundColor Red
    $FAIL++
}

# 4. Amino acid composition
Write-Host "`n[4/7] GET /api/v1/analytics/amino-acid-composition"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/amino-acid-composition" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Amino acid composition"
    $data = $r.Content | ConvertFrom-Json
    Write-Host "       composition_length=$($data.composition.Length)"
} catch {
    Write-Host "  FAIL: Amino acid composition - $_" -ForegroundColor Red
    $FAIL++
}

# 5. Status source breakdown
Write-Host "`n[5/7] GET /api/v1/analytics/status-source-breakdown"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/status-source-breakdown" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Status source breakdown"
} catch {
    Write-Host "  FAIL: Status source breakdown - $_" -ForegroundColor Red
    $FAIL++
}

# 6. Filter rule pass rate
Write-Host "`n[6/7] GET /api/v1/analytics/filter-rule-pass-rate"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/filter-rule-pass-rate" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Filter rule pass rate"
    $data = $r.Content | ConvertFrom-Json
    Write-Host "       rules=$($data.rules.Length)"
} catch {
    Write-Host "  FAIL: Filter rule pass rate - $_" -ForegroundColor Red
    $FAIL++
}

# 7. Top candidates
Write-Host "`n[7/7] GET /api/v1/analytics/top-candidates?limit=5"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/analytics/top-candidates?limit=5" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Top candidates"
    $data = $r.Content | ConvertFrom-Json
    Write-Host "       candidates=$($data.candidates.Length) total=$($data.total)"
} catch {
    Write-Host "  FAIL: Top candidates - $_" -ForegroundColor Red
    $FAIL++
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS" -ForegroundColor Green
Write-Host "FAIL: $FAIL" -ForegroundColor Red

if ($FAIL -gt 0) {
    exit 1
} else {
    Write-Host "`nAll peptide analytics smoke tests PASSED." -ForegroundColor Green
    exit 0
}
