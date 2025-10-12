#!/bin/bash
# === Step 4: Publish TikTok Video ===

ACCESS_TOKEN="act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1"

if [ ! -f "publish_id.txt" ]; then
  echo "❌ Error: publish_id.txt not found! Run ./tiktok_init_upload.sh first."
  exit 1
fi

PUBLISH_ID=$(cat publish_id.txt)

echo "🚀 Publishing TikTok video for publish_id: $PUBLISH_ID"

response=$(curl -s --location 'https://open.tiktokapis.com/v2/post/publish/video/' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json; charset=UTF-8' \
  --data "{
    \"publish_id\": \"$PUBLISH_ID\",
    \"post_info\": {
      \"title\": \"Uploaded with TikTok API 🚀\",
      \"privacy_level\": \"PUBLIC\"
    }
  }")

echo "✅ TikTok API Response:"
echo "$response"
