#!/bin/bash

# === TikTok Video Upload Status Checker ===

# Your TikTok access token
ACCESS_TOKEN="act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1"

# The publish_id you got from the init step
PUBLISH_ID="v_inbox_file~v2.7560045831697483798"

echo "📡 Checking TikTok upload status for publish_id: $PUBLISH_ID"

response=$(curl -s --location "https://open.tiktokapis.com/v2/post/publish/status/fetch/" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json; charset=UTF-8" \
  --data "{
    \"publish_id\": \"$PUBLISH_ID\"
  }")

echo "✅ TikTok API Response:"
echo "$response"

# Optional: Parse the status field if jq is installed
if command -v jq &> /dev/null; then
  status=$(echo "$response" | jq -r '.data.status // empty')
  if [ -n "$status" ]; then
    echo ""
    echo "🎬 Upload Status: $status"
  fi
fi
