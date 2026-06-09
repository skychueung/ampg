# healthcheck.ps1
# Check AMPGen backend health and key endpoints

$base = "http://127.0.0.1:8001"
$endpoints = @(
    @{ Path = "/api/health"; Name = "Health" },
    @{ Path = "/api/v1/system/ampgen-probe"; Name = "AMPGen Probe" },
    @{ Path = "/api/v1/peptides"; Name = "Peptides" },
    @{ Path = "/api/v1/tasks"; Name = "Tasks" }
)

Write-Host "AMPGen Health Check" -ForegroundColor Cyan
Write-Host "Base URL: $base" -ForegroundColor Gray
Write-Host ""

$allOk = $true
foreach ($ep in $endpoints) {
    $url = "$base$($ep.Path)"
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $status = $resp.StatusCode
        if ($status -eq 200) {
            Write-Host "  [OK]   $($ep.Name) ($url)" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] $($ep.Name) ($url) -> HTTP $status" -ForegroundColor Yellow
            $allOk = $false
        }
    } catch {
        Write-Host "  [FAIL] $($ep.Name) ($url) -> $($_.Exception.Message)" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "All checks passed." -ForegroundColor Green
} else {
    Write-Host "Some checks failed. Ensure backend is running on port 8001." -ForegroundColor Yellow
}
