#!/bin/bash
# === Step 1: Initialize TikTok Upload ===

ACCESS_TOKEN="act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1"
VIDEO_FILE="sample.mov"

if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Error: File '$VIDEO_FILE' not found!"
  exit 1
fi

VIDEO_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE")

echo "🎬 Initializing TikTok upload for $VIDEO_FILE ($VIDEO_SIZE bytes)..."

response=$(curl -s --location 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "{
    \"source_info\": {
      \"source\": \"FILE_UPLOAD\",
      \"video_size\": $VIDEO_SIZE,
      \"chunk_size\": $VIDEO_SIZE,
      \"total_chunk_count\": 1
    }
  }")

echo "✅ TikTok API Response:"
echo "$response"

if command -v jq &> /dev/null; then
  publish_id=$(echo "$response" | jq -r '.data.publish_id // empty')
  upload_url=$(echo "$response" | jq -r '.data.upload_url // empty')

  if [ -n "$publish_id" ] && [ -n "$upload_url" ]; then
    echo "$publish_id" > publish_id.txt
    echo "$upload_url" > upload_url.txt
    echo ""
    echo "📝 Saved publish_id.txt and upload_url.txt"
    echo "Publish ID: $publish_id"
    echo "Upload URL: $upload_url"
  else
    echo "⚠️ Could not extract publish_id or upload_url."
  fi
else
  echo "Install jq for JSON parsing (brew install jq or apt install jq)."
fi