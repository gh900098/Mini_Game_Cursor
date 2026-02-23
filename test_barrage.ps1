$companyId = "0ec2976d-7faf-4dd4-b2e7-5f40383c2e3a"
$url = "http://localhost:3100/api/webhooks/sync/deposit/$companyId"
$secret = "test_secret"

function Send-Deposit {
    param (
        [string]$ref,
        [int]$amount
    )

    $timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s)) * 1000
    $payload = @{
        userId    = "dev_user_1"
        amount    = $amount
        type      = "deposit"
        id        = $ref
        timestamp = $timestamp
    } | ConvertTo-Json -Compress

    # Generate HMAC SHA256 signature
    $hmacsha = New-Object System.Security.Cryptography.HMACSHA256
    $hmacsha.key = [Text.Encoding]::ASCII.GetBytes($secret)
    $signature = $hmacsha.ComputeHash([Text.Encoding]::ASCII.GetBytes($payload))
    $signatureHex = ($signature | ForEach-Object ToString x2) -join ''

    $headers = @{
        "Content-Type"        = "application/json"
        "X-Webhook-Signature" = $signatureHex
    }

    Write-Host "Sending $ref for $amount..."
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $payload
        Write-Host "Success:" $response
    }
    catch {
        Write-Host "Failed:" $_.Exception.Response.StatusCode
    }
}

Send-Deposit -ref "test_dep_001" -amount 10
Send-Deposit -ref "test_dep_002" -amount 20
Send-Deposit -ref "test_dep_003" -amount 15
Send-Deposit -ref "test_dep_004" -amount 50
Send-Deposit -ref "test_dep_005" -amount 10
