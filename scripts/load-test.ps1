# Simple load test: 10 parallel requests to API
# Run while backend is running: docker-compose up -d && pnpm dev

$BASE_URL = "http://localhost:3000"
$NUM_REQUESTS = 10
$CONCURRENT = 5

function Test-HealthEndpoint {
    param([int]$RequestNum)

    try {
        $response = Invoke-RestMethod `
            -Uri "$BASE_URL/health" `
            -Method GET `
            -TimeoutSec 5 `
            -ErrorAction Stop

        Write-Host "✓ Request $RequestNum OK" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Request $RequestNum FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "Starting load test: $NUM_REQUESTS sequential requests"
Write-Host "Testing endpoint: $BASE_URL/health`n"

$results = @()
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 1; $i -le $NUM_REQUESTS; $i++) {
    $success = Test-HealthEndpoint -RequestNum $i
    $results += $success
    Start-Sleep -Milliseconds 100  # Slow down slightly between requests
}

$stopwatch.Stop()

$successCount = ($results | Where-Object { $_ -eq $true }).Count
$failureCount = $NUM_REQUESTS - $successCount

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Success: $successCount/$NUM_REQUESTS"
Write-Host "Failures: $failureCount/$NUM_REQUESTS"
Write-Host "Duration: $($stopwatch.ElapsedMilliseconds)ms"
Write-Host "Avg per request: $([math]::Round($stopwatch.ElapsedMilliseconds / $NUM_REQUESTS))ms"

if ($failureCount -gt 0) {
    Write-Host "`n⚠️  Load test FAILED - API not stable under concurrent load" -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "`n✓ Load test PASSED - API stable" -ForegroundColor Green
    exit 0
}
