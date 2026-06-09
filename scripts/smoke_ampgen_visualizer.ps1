# AMPGen Visualizer Smoke Test
# Verifies Workflow page APIs and Run Detail APIs

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

Write-Host "=== AMPGen Visualizer Smoke Test ===" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n[1/7] GET /api/health"
try {
    $r = Invoke-WebRequest -Uri "$BASE/health" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Health check"
} catch {
    Write-Host "  FAIL: Health check - $_" -ForegroundColor Red
    $FAIL++
}

# 2. AMPGen probe
Write-Host "`n[2/7] GET /api/v1/system/ampgen-probe"
try {
    $r = Invoke-WebRequest -Uri "$BASE/v1/system/ampgen-probe" -Method GET -UseBasicParsing
    Assert-Status $r 200 "AMPGen probe"
} catch {
    Write-Host "  FAIL: AMPGen probe - $_" -ForegroundColor Red
    $FAIL++
}

# 3. Create a LOCAL_DEMO run to get a run_id
Write-Host "`n[3/7] POST /api/v1/generation-runs (LOCAL_DEMO count=1)"
try {
    $body = @{ backend = "LOCAL_DEMO"; count = 1; mode = "Sequence-based" } | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$BASE/v1/generation-runs" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Assert-Status $r 200 "Create generation run"
    $run = $r.Content | ConvertFrom-Json
    $runId = $run.id
    $taskId = $run.task_id
    Write-Host "       Created run_id=$runId, task_id=$taskId"

    # Wait for background completion
    Start-Sleep -Seconds 2

    # 4. GET /generation-runs/{run_id}
    Write-Host "`n[4/7] GET /api/v1/generation-runs/$runId"
    $r = Invoke-WebRequest -Uri "$BASE/v1/generation-runs/$runId" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Get generation run"

    # 5. GET /generation-runs/{run_id}/peptides
    Write-Host "`n[5/7] GET /api/v1/generation-runs/$runId/peptides"
    $r = Invoke-WebRequest -Uri "$BASE/v1/generation-runs/$runId/peptides" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Get generation run peptides"
    $pepData = $r.Content | ConvertFrom-Json
    Write-Host "       Peptides: $($pepData.peptides.Length)"

    # 6. GET /generation-runs/{run_id}/artifacts
    Write-Host "`n[6/7] GET /api/v1/generation-runs/$runId/artifacts"
    $r = Invoke-WebRequest -Uri "$BASE/v1/generation-runs/$runId/artifacts" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Get generation run artifacts"
    $artData = $r.Content | ConvertFrom-Json
    Write-Host "       Artifacts: $($artData.files.Length) files"

    # 7. GET /tasks/{task_id} with related_generation_run_id
    Write-Host "`n[7/7] GET /api/v1/tasks/$taskId (includes related_generation_run_id)"
    $r = Invoke-WebRequest -Uri "$BASE/v1/tasks/$taskId" -Method GET -UseBasicParsing
    Assert-Status $r 200 "Get task with related run ID"
    $taskData = $r.Content | ConvertFrom-Json
    if ($taskData.related_generation_run_id -eq $runId) {
        Write-Host "  PASS: related_generation_run_id matches run_id" -ForegroundColor Green
        $PASS++
    } else {
        Write-Host "  FAIL: related_generation_run_id mismatch ($($taskData.related_generation_run_id) vs $runId)" -ForegroundColor Red
        $FAIL++
    }

} catch {
    Write-Host "  FAIL: Run creation or subsequent checks failed - $_" -ForegroundColor Red
    $FAIL += 5
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "PASS: $PASS" -ForegroundColor Green
Write-Host "FAIL: $FAIL" -ForegroundColor Red

if ($FAIL -gt 0) {
    exit 1
} else {
    Write-Host "`nAll visualizer smoke tests PASSED." -ForegroundColor Green
    exit 0
}
