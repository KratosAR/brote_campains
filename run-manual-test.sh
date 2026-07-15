#!/bin/bash

# Manual Meta WhatsApp E2E Test
# Usage: ./run-manual-test.sh

API_URL="${API_URL:-http://localhost:3000}"
TEST_PHONE="${TEST_PHONE:-+1(555)154-6755}"
TIMESTAMP=$(date +%s%3N)

echo ""
echo "📱 Manual End-to-End Meta WhatsApp Test"
echo ""

# 1. Register
echo "1️⃣  Registering workspace..."
REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerName": "Meta Test User",
    "ownerEmail": "meta-test-'$TIMESTAMP'@example.com",
    "ownerPassword": "MetaTest123!",
    "workspaceName": "Meta WhatsApp Test '$TIMESTAMP'",
    "timezone": "America/Argentina/Buenos_Aires"
  }')

WORKSPACE_ID=$(echo "$REGISTER" | jq -r '.data.workspaceId')
ACCESS_TOKEN=$(echo "$REGISTER" | jq -r '.data.accessToken')

if [ "$WORKSPACE_ID" == "null" ]; then
  echo "❌ Registration failed"
  echo "$REGISTER" | jq .
  exit 1
fi

echo "✅ Workspace registered: $WORKSPACE_ID"

# 2. Create contact
echo ""
echo "2️⃣  Creating contact with phone: $TEST_PHONE"
CONTACT=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/contacts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "identity": { "firstName": "Meta Test" },
    "channels": [{ "type": "WhatsApp", "value": "'$TEST_PHONE'" }]
  }')

CONTACT_ID=$(echo "$CONTACT" | jq -r '.data.contactId')
echo "✅ Contact created: $CONTACT_ID"

# 3. Create template
echo ""
echo "3️⃣  Creating template..."
TEMPLATE=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Meta Real Send Test",
    "channel": "WhatsApp",
    "body": "Hello from BCP! This is a real WhatsApp message sent via Meta WhatsApp Business API. 🚀"
  }')

TEMPLATE_ID=$(echo "$TEMPLATE" | jq -r '.data.templateId')
echo "✅ Template created: $TEMPLATE_ID"

# 4. Send campaign
echo ""
echo "4️⃣  Sending campaign (sendNow=true)..."
CAMPAIGN=$(curl -s -X POST "$API_URL/workspaces/$WORKSPACE_ID/campaigns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Meta Real Send Test",
    "templateId": "'$TEMPLATE_ID'",
    "channel": "WhatsApp",
    "audienceType": "manual",
    "audienceContactIds": ["'$CONTACT_ID'"],
    "sendNow": true
  }')

CAMPAIGN_ID=$(echo "$CAMPAIGN" | jq -r '.data.campaignId')
echo "✅ Campaign created and sent: $CAMPAIGN_ID"

# 5. Wait for worker
echo ""
echo "5️⃣  Waiting for worker to process (2 seconds)..."
sleep 2

# 6. Check delivery
echo ""
echo "6️⃣  Checking delivery status..."
DELIVERY=$(curl -s -X GET "$API_URL/workspaces/$WORKSPACE_ID/analytics/campaigns/$CAMPAIGN_ID/deliveries?groupBy=status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL=$(echo "$DELIVERY" | jq -r '.data.total')
echo "✅ Delivery breakdown:"
echo "   Total: $TOTAL"
echo "$DELIVERY" | jq -r '.data.byStatus[] | "   \(.key): \(.count)"'

if [ "$TOTAL" -gt 0 ]; then
  echo ""
  echo "✅ SUCCESS! Message queued for delivery."
  echo "📱 Check your WhatsApp account for the message."
  echo ""
  echo "📊 Expected status flow: Pending → Sending → Sent → Delivered"
else
  echo ""
  echo "⚠️  No deliveries created. Check:"
  echo "   • Worker is running (cd apps/worker && pnpm dev)"
  echo "   • Meta credentials in .env are correct"
  echo "   • Redis/PostgreSQL are connected"
fi

echo ""
echo "============================================================"
echo ""
