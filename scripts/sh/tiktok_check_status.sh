#!/bin/bash
# === Step 3: Check TikTok Upload Status ===

ACCESS_TOKEN="act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1"

if [ ! -f "publish_id.txt" ]; then
  echo "❌ Error: publish_id.txt not found! Run ./tiktok_init_upload.sh first."
  exit 1
fi

PUBLISH_ID=$(cat publish_id.txt)

echo "📡 Checking TikTok upload status for publish_id: $PUBLISH_ID"

response=$(curl -s --location 'https://open.tiktokapis.com/v2/post/publish/status/fetch/' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json; charset=UTF-8' \
  --data "{
    \"publish_id\": \"$PUBLISH_ID\"
  }")

echo "✅ TikTok API Response:"
echo "$response"

if command -v jq &> /dev/null; then
  status=$(echo "$response" | jq -r '.data.status // empty')
  echo ""
  echo "🎬 Upload Status: $status"
fi
