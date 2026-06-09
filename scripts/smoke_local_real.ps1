# smoke_local_real.ps1
# Smoke test: LOCAL_REAL_SMOKE count=1 generation (async)

$base = "http://127.0.0.1:8001"
Write-Host "Smoke Test: LOCAL_REAL_SMOKE count=1" -ForegroundColor Cyan
Write-Host "This will take ~40-60 seconds..." -ForegroundColor Yellow
Write-Host ""

# 1. Create generation run
$payload = @{
    backend = "LOCAL_REAL_SMOKE"
    mode = "Sequence-based"
    count = 1
    min_length = 15
    max_length = 35
    temperature = 1.0
    top_p = 0.95
} | ConvertTo-Json -Depth 3

$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $resp = Invoke-WebRequest -Uri "$base/api/v1/generation-runs" -Method POST -ContentType "application/json" -Body $payload -UseBasicParsing -TimeoutSec 10
    $data = $resp.Content | ConvertFrom-Json
    $runId = $data.id
    $taskId = $data.task_id
    Write-Host "Created run_id=$runId, task_id=$taskId, status=$($data.status)" -ForegroundColor Green
    Write-Host "POST response time: $($sw.ElapsedMilliseconds) ms (should be < 200 ms)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to create generation run: $_"
    exit 1
}

# 2. Poll until terminal
$maxWait = 120
$elapsed = 0
while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 3
    $elapsed += 3

    $poll = Invoke-WebRequest -Uri "$base/api/v1/generation-runs/$runId" -UseBasicParsing -TimeoutSec 10
    $pData = $poll.Content | ConvertFrom-Json
    Write-Host "  Poll [$($elapsed)s] status=$($pData.status)" -ForegroundColor Gray

    if ($pData.status -in @("SUCCEEDED", "FAILED", "BLOCKED")) {
        break
    }
}
$sw.Stop()

# 3. Verify result and logs
$final = Invoke-WebRequest -Uri "$base/api/v1/generation-runs/$runId/peptides" -UseBasicParsing -TimeoutSec 10
$fData = $final.Content | ConvertFrom-Json

$task = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId" -UseBasicParsing -TimeoutSec 10
$tData = $task.Content | ConvertFrom-Json

$logs = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId/logs" -UseBasicParsing -TimeoutSec 10
$lData = $logs.Content | ConvertFrom-Json

Write-Host ""
if ($fData.status -eq "SUCCEEDED" -and $fData.peptides.Count -ge 1) {
    Write-Host "PASS: LOCAL_REAL_SMOKE smoke test succeeded." -ForegroundColor Green
    Write-Host "  Total duration: $($sw.Elapsed.ToString('mm\:ss'))" -ForegroundColor Gray
    Write-Host "  Peptides generated: $($fData.peptides.Count)" -ForegroundColor Gray
    foreach ($p in $fData.peptides) {
        Write-Host "    - $($p.sequence) ($($p.length) aa)" -ForegroundColor Gray
        Write-Host "      amp_score=$($p.amp_score) (should be null)" -ForegroundColor Gray
    }
    Write-Host "  artifact_dir: $($tData.artifact_dir)" -ForegroundColor Gray
    if ($lData.artifact_logs) {
        Write-Host "  artifact_logs:" -ForegroundColor Gray
        foreach ($key in $lData.artifact_logs.PSObject.Properties.Name) {
            Write-Host "    $key : $($lData.artifact_logs.$key.Count) lines" -ForegroundColor Gray
        }
    }
} else {
    Write-Error "FAIL: status=$($fData.status), peptides=$($fData.peptides.Count)"
    exit 1
}
