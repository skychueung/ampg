# smoke_local_demo.ps1
# Smoke test: LOCAL_DEMO count=2 generation

$base = "http://127.0.0.1:8001"
Write-Host "Smoke Test: LOCAL_DEMO count=2" -ForegroundColor Cyan
Write-Host ""

# 1. Create generation run
$payload = @{
    backend = "LOCAL_DEMO"
    mode = "Sequence-based"
    count = 2
    min_length = 15
    max_length = 35
    temperature = 1.0
    top_p = 0.95
} | ConvertTo-Json -Depth 3

try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/generation-runs" -Method POST -ContentType "application/json" -Body $payload -UseBasicParsing -TimeoutSec 10
    $data = $resp.Content | ConvertFrom-Json
    $runId = $data.id
    $taskId = $data.task_id
    Write-Host "Created run_id=$runId, task_id=$taskId, status=$($data.status)" -ForegroundColor Green
} catch {
    Write-Error "Failed to create generation run: $_"
    exit 1
}

# 2. Poll until terminal
$maxWait = 30
$elapsed = 0
while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2

    $poll = Invoke-WebRequest -Uri "$base/api/v1/generation-runs/$runId" -UseBasicParsing -TimeoutSec 10
    $pData = $poll.Content | ConvertFrom-Json
    Write-Host "  Poll [$($elapsed)s] status=$($pData.status)" -ForegroundColor Gray

    if ($pData.status -in @("SUCCEEDED", "FAILED", "BLOCKED")) {
        break
    }
}

# 3. Verify result
$final = Invoke-WebRequest -Uri "$base/api/v1/generation-runs/$runId/peptides" -UseBasicParsing -TimeoutSec 10
$fData = $final.Content | ConvertFrom-Json

Write-Host ""
if ($fData.status -eq "SUCCEEDED" -and $fData.peptides.Count -eq 2) {
    Write-Host "PASS: LOCAL_DEMO smoke test succeeded." -ForegroundColor Green
    Write-Host "  Peptides generated: $($fData.peptides.Count)" -ForegroundColor Gray
    foreach ($p in $fData.peptides) {
        Write-Host "    - $($p.sequence) ($($p.length) aa)" -ForegroundColor Gray
    }
} else {
    Write-Error "FAIL: status=$($fData.status), peptides=$($fData.peptides.Count)"
    exit 1
}
