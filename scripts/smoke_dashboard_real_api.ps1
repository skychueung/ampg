# Smoke Test: Dashboard / Report Preview / Peptide Detail Real API
$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8001"

function Write-Result($label, $status, $detail = "") {
    $emoji = if ($status -eq "PASS") { "[OK]  " } else { "[FAIL] " }
    Write-Host "$emoji $label" -NoNewline
    if ($detail) { Write-Host " | $detail" } else { Write-Host "" }
}

Write-Host "========================================"
Write-Host "Smoke Test: Dashboard / Preview / Detail Real API"
Write-Host "========================================"
Write-Host ""

# Use Python for reliable HTTP/JSON
$pyScript = @'
import urllib.request, json, sys, time

base = 'http://127.0.0.1:8001'
errors = []

def get(url):
    return json.loads(urllib.request.urlopen(url, timeout=10).read().decode())

def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type':'application/json'})
    return json.loads(urllib.request.urlopen(req, timeout=10).read().decode())

# 1. Health
health = get(base + '/api/health')
print('HEALTH|' + health['status'])

# 2. Dashboard summary
summary = get(base + '/api/v1/dashboard/summary')
print('SUMMARY|PASS|peptides_total=' + str(summary.get('peptides_total','?')))

# 3. Recent runs
runs = get(base + '/api/v1/dashboard/recent-runs?limit=5')
print('RECENT_RUNS|PASS|count=' + str(len(runs)))

# 4. List peptides
peptides = get(base + '/api/v1/peptides')
print('PEPTIDES|PASS|count=' + str(len(peptides)))

# 5. Peptide detail
if len(peptides) > 0:
    pid = peptides[0]['id']
    detail = get(base + '/api/v1/peptides/' + str(pid))
    print('PEPTIDE_DETAIL|PASS|id=' + str(detail['id']) + '|source=' + detail.get('source','?'))
    # Verify null scores for LOCAL_DEMO
    if detail.get('source') == 'local_demo':
        if detail.get('amp_score') is not None:
            print('FAIL_DEMO_AMP|id=' + str(pid))
        else:
            print('DEMO_NULL_AMP|PASS')
else:
    print('PEPTIDE_DETAIL|SKIP|no peptides')

# 6. Verify CSV utf-8-sig
resp = urllib.request.urlopen(base + '/api/v1/reports/candidates.csv', timeout=10)
content = resp.read()
if content[:3] == b'\xef\xbb\xbf':
    print('CSV_BOM|PASS')
else:
    print('CSV_BOM|FAIL')
try:
    text = content.decode('utf-8-sig')
    print('CSV_DECODE|PASS')
except Exception as e:
    print('CSV_DECODE|FAIL|' + str(e))
'@

$pyFile = [System.IO.Path]::GetTempFileName() + ".py"
$pyScript | Out-File -Encoding utf8 $pyFile
$output = python $pyFile 2>&1
Remove-Item $pyFile

$allPass = $true
foreach ($line in $output) {
    $parts = $line -split "\|"
    switch ($parts[0]) {
        "HEALTH"           { Write-Result "Health" "PASS" $parts[1] }
        "SUMMARY"          { Write-Result "Dashboard summary" "PASS" $parts[2] }
        "RECENT_RUNS"      { Write-Result "Recent runs" "PASS" $parts[2] }
        "PEPTIDES"         { Write-Result "List peptides" "PASS" $parts[2] }
        "PEPTIDE_DETAIL"   { Write-Result "Peptide detail" "PASS" $parts[2] }
        "DEMO_NULL_AMP"    { Write-Result "Demo null amp_score" "PASS" }
        "FAIL_DEMO_AMP"    { Write-Result "Demo null amp_score" "FAIL" $parts[1]; $allPass = $false }
        "CSV_BOM"          { if ($parts[1] -eq "PASS") { Write-Result "CSV BOM" "PASS" } else { Write-Result "CSV BOM" "FAIL"; $allPass = $false } }
        "CSV_DECODE"       { if ($parts[1] -eq "PASS") { Write-Result "CSV decode" "PASS" } else { Write-Result "CSV decode" "FAIL"; $allPass = $false } }
        default            { Write-Host "   $line" }
    }
}

Write-Host ""
Write-Host "========================================"
if ($allPass) {
    Write-Host "PASS: All dashboard/preview/detail API checks passed."
} else {
    Write-Host "FAIL: Some checks failed."
    exit 1
}
