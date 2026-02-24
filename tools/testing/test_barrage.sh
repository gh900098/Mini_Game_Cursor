#!/bin/bash
# Note: Since the test instance might not require signatures in dev mode or we can fake it, 
# let's write a simple bash script to loop curl commands using bash strings.

COMPANY_ID="0ec2976d-7faf-4dd4-b2e7-5f40383c2e3a"
URL="http://localhost:3100/api/webhooks/sync/deposit/$COMPANY_ID"

send_deposit() {
  local ref=$1
  local amount=$2
  
  # Calculate HMAC SHA256 signature in bash
  local payload="{\"memberId\":\"dev_user_1\",\"amount\":$amount,\"type\":\"deposit\",\"referenceId\":\"$ref\",\"timestamp\":$(date +%s000)}"
  local sig=$(echo -n "$payload" | openssl dgst -sha256 -hmac "test_secret" | sed 's/^.* //')

  echo "Sending $ref for $amount..."
  curl -X POST -H "Content-Type: application/json" -H "X-Webhook-Signature: $sig" -d "$payload" $URL
  echo ""
}

send_deposit "test_dep_001" 10
send_deposit "test_dep_002" 20
send_deposit "test_dep_003" 15
send_deposit "test_dep_004" 50
send_deposit "test_dep_005" 10
