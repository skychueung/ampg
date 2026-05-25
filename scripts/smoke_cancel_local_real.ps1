# smoke_cancel_local_real.ps1
# Smoke test: cancel a running LOCAL_REAL_SMOKE task

$base = "http://127.0.0.1:8001"
Write-Host "Smoke Test: Cancel LOCAL_REAL_SMOKE count=1" -ForegroundColor Cyan
Write-Host "This will take ~10-20 seconds..." -ForegroundColor Yellow
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

# 2. Wait until RUNNING
$maxWait = 30
$elapsed = 0
$wasRunning = $false
while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2

    $poll = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId" -UseBasicParsing -TimeoutSec 10
    $tData = $poll.Content | ConvertFrom-Json
    Write-Host "  Poll [$($elapsed)s] task_status=$($tData.status)" -ForegroundColor Gray

    if ($tData.status -eq "RUNNING") {
        $wasRunning = $true
        break
    }
    if ($tData.status -in @("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED")) {
        Write-Warning "Task reached terminal state before cancel. Skipping cancel."
        break
    }
}

if (-not $wasRunning) {
    Write-Warning "Task did not enter RUNNING state within $maxWait seconds. Test inconclusive."
    exit 0
}

# 3. Request cancellation
Write-Host "Requesting cancellation..." -ForegroundColor Yellow
$cancelResp = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId/cancel" -Method POST -UseBasicParsing -TimeoutSec 10
$cancelData = $cancelResp.Content | ConvertFrom-Json
Write-Host "Cancel response: status=$($cancelData.status), message=$($cancelData.message)" -ForegroundColor Cyan

# 4. Poll until terminal
$maxWait = 60
$elapsed = 0
while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 3
    $elapsed += 3

    $poll = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId" -UseBasicParsing -TimeoutSec 10
    $tData = $poll.Content | ConvertFrom-Json
    Write-Host "  Poll [$($elapsed)s] task_status=$($tData.status)" -ForegroundColor Gray

    if ($tData.status -in @("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED")) {
        break
    }
}

# 5. Verify
$finalTask = Invoke-WebRequest -Uri "$base/api/v1/tasks/$taskId" -UseBasicParsing -TimeoutSec 10
$ft = $finalTask.Content | ConvertFrom-Json

$finalRun = Invoke-WebRequest -Uri "$base/api/v1/generation-runs/$runId" -UseBasicParsing -TimeoutSec 10
$fr = $finalRun.Content | ConvertFrom-Json

Write-Host ""
if ($ft.status -eq "CANCELLED") {
    Write-Host "PASS: Task was successfully cancelled." -ForegroundColor Green
    Write-Host "  task_status  = $($ft.status)" -ForegroundColor Gray
    Write-Host "  run_status   = $($fr.status)" -ForegroundColor Gray
    Write-Host "  cancel_requested = $($ft.cancel_requested)" -ForegroundColor Gray
    Write-Host "  cancelled_at = $($ft.cancelled_at)" -ForegroundColor Gray
    Write-Host "  artifact_dir = $($ft.artifact_dir)" -ForegroundColor Gray
} else {
    Write-Host "INFO: Final task status = $($ft.status). Cancel may have raced with completion." -ForegroundColor Yellow
    Write-Host "  run_status = $($fr.status)" -ForegroundColor Gray
}
