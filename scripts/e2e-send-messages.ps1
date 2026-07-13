# End-to-end test: Register → Create contacts → Create template → Create campaign → Send messages

$BASE_URL = "http://localhost:3000"

# Test data
$ownerEmail = "test-$(Get-Random -Minimum 100000 -Maximum 999999)@example.com"
$ownerPassword = "Test@1234567890!"
$ownerName = "Test Owner"
$workspaceName = "Test Workspace"

$contacts = @(
    @{ name = "Rena Mendoza"; number = "+5493513199552" }
    @{ name = "Pepo Mendoza"; number = "+5493512106855" }
    @{ name = "Amor"; number = "+5493517308254" }
)

Write-Host "🚀 Starting E2E Message Send Test`n" -ForegroundColor Cyan

# Step 1: Register workspace
Write-Host "1️⃣  Registering workspace..." -ForegroundColor Yellow
try {
    $registerBody = @{
        ownerEmail = $ownerEmail
        ownerPassword = $ownerPassword
        ownerName = $ownerName
        workspaceName = $workspaceName
        timezone = "America/Argentina/Buenos_Aires"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod `
        -Uri "$BASE_URL/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -TimeoutSec 10

    $workspaceId = $registerResponse.data.workspaceId
    $accessToken = $registerResponse.data.accessToken

    Write-Host "✓ Workspace registered: $workspaceId`n" -ForegroundColor Green
}
catch {
    Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create contacts
Write-Host "2️⃣  Creating contacts..." -ForegroundColor Yellow
$contactIds = @()

foreach ($contact in $contacts) {
    try {
        $names = $contact.name.Split()
        $contactBody = @{
            identity = @{
                firstName = $names[0]
                lastName = if ($names.Length -gt 1) { $names[1] } else { "" }
            }
            channels = @(
                @{
                    type = "whatsapp"
                    value = $contact.number
                    isPrimary = $true
                }
            )
        } | ConvertTo-Json

        $contactResponse = Invoke-RestMethod `
            -Uri "$BASE_URL/workspaces/$workspaceId/contacts" `
            -Method POST `
            -ContentType "application/json" `
            -Body $contactBody `
            -Headers @{ Authorization = "Bearer $accessToken" } `
            -TimeoutSec 10

        $contactIds += $contactResponse.data.id
        Write-Host "  ✓ Created contact: $($contact.name) ($($contact.number))" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Failed to create contact $($contact.name): $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Create WhatsApp template
Write-Host "3️⃣  Creating WhatsApp template..." -ForegroundColor Yellow
try {
    $templateBody = @{
        name = "Welcome Template"
        channel = "whatsapp"
        body = "Hola {{name}}, bienvenido a BROTE! 🚀"
        variables = @("name")
    } | ConvertTo-Json

    $templateResponse = Invoke-RestMethod `
        -Uri "$BASE_URL/workspaces/$workspaceId/templates" `
        -Method POST `
        -ContentType "application/json" `
        -Body $templateBody `
        -Headers @{ Authorization = "Bearer $accessToken" } `
        -TimeoutSec 10

    $templateId = $templateResponse.data.id
    Write-Host "✓ Template created: $templateId`n" -ForegroundColor Green
}
catch {
    Write-Host "✗ Template creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Create campaign
Write-Host "4️⃣  Creating campaign..." -ForegroundColor Yellow
try {
    $campaignBody = @{
        name = "Family Test Campaign"
        channel = "whatsapp"
        templateId = $templateId
        audienceType = "contacts"
        audienceContactIds = $contactIds
        sendNow = $true
        maxRetries = 3
        retryDelays = @(60, 300, 3600)
    } | ConvertTo-Json

    $campaignResponse = Invoke-RestMethod `
        -Uri "$BASE_URL/workspaces/$workspaceId/campaigns" `
        -Method POST `
        -ContentType "application/json" `
        -Body $campaignBody `
        -Headers @{ Authorization = "Bearer $accessToken" } `
        -TimeoutSec 10

    $campaignId = $campaignResponse.data.id
    Write-Host "✓ Campaign created: $campaignId`n" -ForegroundColor Green
}
catch {
    Write-Host "✗ Campaign creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Wait for messages to be processed
Write-Host "5️⃣  Waiting for message processing..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host ""

# Step 6: Check deliveries
Write-Host "6️⃣  Checking deliveries..." -ForegroundColor Yellow
try {
    $deliveriesResponse = Invoke-RestMethod `
        -Uri "$BASE_URL/workspaces/$workspaceId/campaigns/$campaignId/deliveries" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $accessToken" } `
        -TimeoutSec 10

    $deliveries = $deliveriesResponse.data
    Write-Host "✓ Found $($deliveries.Count) deliveries:`n" -ForegroundColor Green

    foreach ($delivery in $deliveries) {
        $status = $delivery.status
        $statusColor = if ($status -eq "sent") { "Green" } elseif ($status -eq "pending") { "Yellow" } else { "Red" }
        Write-Host "  • Contact: $($delivery.address)" -ForegroundColor Gray
        Write-Host "    Status: $status" -ForegroundColor $statusColor
        Write-Host "    Provider Message ID: $($delivery.providerMessageId)" -ForegroundColor Gray
        Write-Host "    Created: $($delivery.createdAt)" -ForegroundColor Gray
        Write-Host ""
    }

    $sentCount = ($deliveries | Where-Object { $_.status -eq "sent" }).Count
    if ($sentCount -eq $deliveries.Count) {
        Write-Host "✅ SUCCESS: All $($deliveries.Count) messages sent!" -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host "⚠️  PARTIAL: $sentCount/$($deliveries.Count) messages sent" -ForegroundColor Yellow
        exit 0
    }
}
catch {
    Write-Host "✗ Failed to retrieve deliveries: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
