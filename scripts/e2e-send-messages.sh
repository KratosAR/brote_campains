#!/bin/bash

set -e

BASE_URL="http://localhost:3000"

echo "🚀 Starting E2E Message Send Test"
echo ""

# Step 1: Register workspace
echo "1️⃣  Registering workspace..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerEmail": "test-'$(date +%s)'@example.com",
    "ownerPassword": "Test@1234567890!",
    "ownerName": "Test Owner",
    "workspaceName": "Test Workspace",
    "timezone": "America/Argentina/Buenos_Aires"
  }')

WORKSPACE_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.workspaceId')
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.accessToken')

if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" == "null" ]; then
  echo "✗ Registration failed"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✓ Workspace registered: $WORKSPACE_ID"
echo ""

# Step 2: Create contacts
echo "2️⃣  Creating contacts..."

declare -a CONTACT_IDS

contacts=("Rena Mendoza|+5493513199552" "Pepo Mendoza|+5493512106855" "Amor Mendoza|+5493517308254")

for contact_info in "${contacts[@]}"; do
  IFS='|' read -r name number <<< "$contact_info"
  first_name=$(echo $name | cut -d' ' -f1)
  last_name=$(echo $name | cut -d' ' -f2-)

  CONTACT_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/contacts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
      \"identity\": {
        \"firstName\": \"$first_name\",
        \"lastName\": \"$last_name\"
      },
      \"channels\": [
        {
          \"type\": \"whatsapp\",
          \"value\": \"$number\",
          \"isPrimary\": true
        }
      ]
    }")

  CONTACT_ID=$(echo "$CONTACT_RESPONSE" | jq -r '.data.id')

  if [ -z "$CONTACT_ID" ] || [ "$CONTACT_ID" == "null" ]; then
    echo "  ✗ Failed to create contact $name"
    echo "    Response: $CONTACT_RESPONSE"
    exit 1
  fi

  CONTACT_IDS+=("$CONTACT_ID")
  echo "  ✓ Created contact: $name ($number)"
done

echo ""

# Step 3: Create WhatsApp template
echo "3️⃣  Creating WhatsApp template..."

TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Welcome Template",
    "channel": "whatsapp",
    "body": "Hola {{name}}, bienvenido a BROTE! 🚀",
    "variables": ["name"]
  }')

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.data.id')

if [ -z "$TEMPLATE_ID" ] || [ "$TEMPLATE_ID" == "null" ]; then
  echo "✗ Template creation failed"
  echo "Response: $TEMPLATE_RESPONSE"
  exit 1
fi

echo "✓ Template created: $TEMPLATE_ID"
echo ""

# Step 4: Create campaign
echo "4️⃣  Creating campaign..."

# Build contact IDs JSON array
CONTACT_IDS_JSON="["
for i in "${!CONTACT_IDS[@]}"; do
  CONTACT_IDS_JSON+="\"${CONTACT_IDS[$i]}\""
  if [ $i -lt $((${#CONTACT_IDS[@]} - 1)) ]; then
    CONTACT_IDS_JSON+=","
  fi
done
CONTACT_IDS_JSON+="]"

CAMPAIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/campaigns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"name\": \"Family Test Campaign\",
    \"channel\": \"whatsapp\",
    \"templateId\": \"$TEMPLATE_ID\",
    \"audienceType\": \"contacts\",
    \"audienceContactIds\": $CONTACT_IDS_JSON,
    \"sendNow\": true,
    \"maxRetries\": 3,
    \"retryDelays\": [60, 300, 3600]
  }")

CAMPAIGN_ID=$(echo "$CAMPAIGN_RESPONSE" | jq -r '.data.id')

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" == "null" ]; then
  echo "✗ Campaign creation failed"
  echo "Response: $CAMPAIGN_RESPONSE"
  exit 1
fi

echo "✓ Campaign created: $CAMPAIGN_ID"
echo ""

# Step 5: Wait for messages to be processed
echo "5️⃣  Waiting for message processing (2 seconds)..."
sleep 2
echo ""

# Step 6: Check deliveries
echo "6️⃣  Checking deliveries..."

DELIVERIES_RESPONSE=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/campaigns/$CAMPAIGN_ID/deliveries" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

DELIVERY_COUNT=$(echo "$DELIVERIES_RESPONSE" | jq '.data | length')

echo "✓ Found $DELIVERY_COUNT deliveries:"
echo ""

SENT_COUNT=0

for i in $(seq 0 $((DELIVERY_COUNT - 1))); do
  delivery=$(echo "$DELIVERIES_RESPONSE" | jq ".data[$i]")

  address=$(echo "$delivery" | jq -r '.address')
  status=$(echo "$delivery" | jq -r '.status')
  provider_id=$(echo "$delivery" | jq -r '.providerMessageId')
  created_at=$(echo "$delivery" | jq -r '.createdAt')

  echo "  • Contact: $address"
  echo "    Status: $status"
  if [ "$status" == "sent" ]; then
    ((SENT_COUNT++))
  fi
  echo "    Provider Message ID: $provider_id"
  echo "    Created: $created_at"
  echo ""
done

if [ "$SENT_COUNT" -eq "$DELIVERY_COUNT" ]; then
  echo "✅ SUCCESS: All $DELIVERY_COUNT messages sent!"
  exit 0
else
  echo "⚠️  PARTIAL: $SENT_COUNT/$DELIVERY_COUNT messages sent"
  exit 0
fi
