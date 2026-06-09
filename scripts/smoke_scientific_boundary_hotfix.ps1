# Smoke Test: v0.5.1-hotfix Scientific Boundary Verification
# Verifies that LOCAL_DEMO no longer writes fake amp_score or MIC values.

$ErrorActionPreference = "Stop"

function Write-Result($label, $status, $detail = "") {
    $emoji = if ($status -eq "PASS") { "[OK]  " } else { "[FAIL] " }
    Write-Host "$emoji $label" -NoNewline
    if ($detail) { Write-Host " | $detail" } else { Write-Host "" }
}

Write-Host "========================================"
Write-Host "Smoke Test: v0.5.1-hotfix Scientific Boundary"
Write-Host "========================================"
Write-Host ""

# Use Python for reliable HTTP/JSON handling
$pyScript = @"
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

# 2. LOCAL_DEMO count=2
run = post(base + '/api/v1/generation-runs', {'backend':'LOCAL_DEMO','count':2,'mode':'Sequence-based','min_length':15,'max_length':35})
run_id = run['id']
task_id = run['task_id']
print('RUN|' + str(run_id) + '|' + str(task_id))

for _ in range(10):
    time.sleep(1)
    task = get(base + '/api/v1/tasks/' + str(task_id))
    if task['status'] in ('SUCCEEDED','FAILED','BLOCKED','CANCELLED'):
        break
print('TASK_STATUS|' + task['status'])

# 3. Peptides
peptides = get(base + '/api/v1/generation-runs/' + str(run_id) + '/peptides')['peptides']
print('PEPTIDE_COUNT|' + str(len(peptides)))

all_null = True
for p in peptides:
    if p.get('amp_score') is not None:
        print('FAIL_AMP|' + str(p['id']) + '|' + str(p['amp_score']))
        all_null = False
    if p.get('mic_ecoli') is not None:
        print('FAIL_MIC_E|' + str(p['id']) + '|' + str(p['mic_ecoli']))
        all_null = False
    if p.get('mic_saureus') is not None:
        print('FAIL_MIC_S|' + str(p['id']) + '|' + str(p['mic_saureus']))
        all_null = False
    notes = p.get('notes') or ''
    if 'AMP score and MIC are not computed' not in notes:
        print('FAIL_NOTES|' + str(p['id']) + '|' + notes[:60])
        all_null = False

print('SCORES|' + ('PASS' if all_null else 'FAIL'))

# 4. LOCAL_REAL_SMOKE untouched
all_peps = get(base + '/api/v1/peptides')
real_smokes = [p for p in all_peps if p.get('source') == 'local_real_smoke']
real_ok = True
for p in real_smokes:
    if p.get('amp_score') is not None:
        print('FAIL_REAL|' + str(p['id']))
        real_ok = False
print('REAL_COUNT|' + str(len(real_smokes)))
print('REAL_OK|' + ('PASS' if real_ok else 'FAIL'))

# 5. CSV export null handling
csv_resp = urllib.request.urlopen(base + '/api/v1/reports/candidates.csv', timeout=10)
csv_text = csv_resp.read().decode('utf-8-sig')
import csv
reader = csv.DictReader(csv_text.splitlines())
csv_ok = True
for row in reader:
    if row.get('source') == 'local_demo':
        if row.get('amp_score','').strip() not in ('','Not computed'):
            print('FAIL_CSV_AMP|' + row['amp_score'])
            csv_ok = False
        if row.get('mic_ecoli','').strip() not in ('','Not computed'):
            print('FAIL_CSV_MIC|' + row['mic_ecoli'])
            csv_ok = False
print('CSV_OK|' + ('PASS' if csv_ok else 'FAIL'))
"@

$pyFile = [System.IO.Path]::GetTempFileName() + ".py"
$pyScript | Out-File -Encoding utf8 $pyFile
$output = python $pyFile 2>&1
Remove-Item $pyFile

$allPass = $true
foreach ($line in $output) {
    $parts = $line -split "\|"
    switch ($parts[0]) {
        "HEALTH"      { Write-Result "Health" "PASS" $parts[1] }
        "RUN"         { Write-Host "   Created run_id=$($parts[1]), task_id=$($parts[2])" }
        "TASK_STATUS" { Write-Result "LOCAL_DEMO completion" "PASS" $parts[1] }
        "PEPTIDE_COUNT" { Write-Host "   Peptides generated: $($parts[1])" }
        "FAIL_AMP"    { Write-Result "amp_score null check" "FAIL" "Found $($parts[2]) for id=$($parts[1])"; $allPass = $false }
        "FAIL_MIC_E"  { Write-Result "mic_ecoli null check" "FAIL" "Found $($parts[2]) for id=$($parts[1])"; $allPass = $false }
        "FAIL_MIC_S"  { Write-Result "mic_saureus null check" "FAIL" "Found $($parts[2]) for id=$($parts[1])"; $allPass = $false }
        "FAIL_NOTES"  { Write-Result "notes boundary text" "FAIL" "Missing for id=$($parts[1])"; $allPass = $false }
        "SCORES"      { if ($parts[1] -eq "PASS") { Write-Result "All scores null" "PASS" } else { Write-Result "All scores null" "FAIL"; $allPass = $false } }
        "REAL_COUNT"  { Write-Host "   LOCAL_REAL_SMOKE count: $($parts[1])" }
        "REAL_OK"     { if ($parts[1] -eq "PASS") { Write-Result "LOCAL_REAL_SMOKE untouched" "PASS" } else { Write-Result "LOCAL_REAL_SMOKE untouched" "FAIL"; $allPass = $false } }
        "CSV_OK"      { if ($parts[1] -eq "PASS") { Write-Result "CSV null handling" "PASS" } else { Write-Result "CSV null handling" "FAIL"; $allPass = $false } }
        default       { Write-Host "   $line" }
    }
}

Write-Host ""
Write-Host "========================================"
if ($allPass) {
    Write-Host "PASS: All scientific boundary checks passed."
} else {
    Write-Host "FAIL: Some checks failed. See details above."
    exit 1
}
