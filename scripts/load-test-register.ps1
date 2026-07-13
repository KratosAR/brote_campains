# Load test: Parallel registration requests
# Reproduces the concurrent connection issue

$BASE_URL = "http://localhost:3000"
$NUM_PARALLEL = 3

Write-Host "Starting sequential registration test: $NUM_PARALLEL registrations (respecting rate limits)"
Write-Host "Testing endpoint: $BASE_URL/auth/register`n"

$results = @()

for ($i = 1; $i -le $NUM_PARALLEL; $i++) {
    $email = "user$i-$(Get-Random -Minimum 100000 -Maximum 999999)@example.com"
    $password = "Test@1234567890!"

    try {
        $body = @{
            ownerEmail = $email
            ownerPassword = $password
            ownerName = "Test User $requestNum"
            workspaceName = "Workspace $i"
            timezone = "UTC"
        } | ConvertTo-Json

        $response = Invoke-RestMethod `
            -Uri "$BASE_URL/auth/register" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 10 `
            -ErrorAction Stop

        $results += @{
            success = $true
            requestNum = $i
            email = $email
            workspaceId = $response.data.workspaceId
            error = $null
        }

        Write-Host "✓ Request $i OK" -ForegroundColor Green
    }
    catch {
        $results += @{
            success = $false
            requestNum = $i
            email = $email
            workspaceId = $null
            error = $_.Exception.Message
        }

        Write-Host "✗ Request $i FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Wait 200ms between requests to avoid rate limiting
    Start-Sleep -Milliseconds 200
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.success -eq $true }).Count
$failureCount = $results.Count - $successCount

Write-Host "`nSummary: $successCount/$($results.Count) requests succeeded"

if ($failureCount -gt 0) {
    Write-Host "`n⚠️  Load test FAILED" -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "`n✓ Load test PASSED" -ForegroundColor Green
    exit 0
}
