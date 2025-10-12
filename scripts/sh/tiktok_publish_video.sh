#!/bin/bash
# === Step 4: Publish TikTok Video (Inbox flow for unaudited apps) ===

set -euo pipefail

CAPTION=${1:-"Uploaded with TikTok API 🚀"}

# Load access token
if [ -f "tiktok_access_token.txt" ]; then
  ACCESS_TOKEN=$(cat tiktok_access_token.txt)
else
  ACCESS_TOKEN="act.TYgQCqN2dCxkZvUjn0EIZbcDEprFIPc8RFg0i3BKWJ9V48JgXcV9hyCTO258!4741.e1"
fi

# Load publish_id + upload_url from the files saved by tiktok_init_upload.sh
if [ ! -f "publish_id.txt" ] || [ ! -f "upload_url.txt" ]; then
  echo "❌ Error: publish_id.txt or upload_url.txt not found!"
  echo "➡️  Run ./tiktok_init_upload.sh first."
  exit 1
fi

PUBLISH_ID=$(cat publish_id.txt)
UPLOAD_URL=$(cat upload_url.txt)

echo "🚀 Publishing TikTok video draft..."
echo "🆔  Publish ID: $PUBLISH_ID"
echo "🌐 Upload URL: $UPLOAD_URL"
echo "📝 Caption: $CAPTION"

# Send publish request
response=$(curl -s --location "https://open.tiktokapis.com/v2/post/publish/inbox/video/" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json; charset=UTF-8' \
  --header 'Accept: application/json' \
  --data "{
    \"publish_id\": \"$PUBLISH_ID\",
    \"post_info\": {
      \"title\": \"$CAPTION\",
      \"privacy_level\": \"PRIVATE\",
      \"disable_duet\": false,
      \"disable_comment\": false,
      \"disable_stitch\": false
    }
  }")

echo "✅ TikTok API Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

# Optional spam-risk handling
if command -v jq >/dev/null 2>&1; then
  err=$(echo "$response" | jq -r '.error.code // empty')
  if [[ "$err" == "spam_risk_too_many_pending_share" ]]; then
    echo -e "\n⚠️  TikTok reports too many pending shares for this account." >&2
    echo "   Remove and re-add your sandbox account or wait 24h before retrying." >&2
  fi
fi
