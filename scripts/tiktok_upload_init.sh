#!/bin/bash

# === TikTok API video upload init ===

# Your access token (from OAuth)
ACCESS_TOKEN="act.OABTKK4Mg6S9uL25kKga6cySJJuzNp5B24bTrNwouBmhb7BDnkhpA8yUh0NH!4692.e1"

# Your video file
VIDEO_FILE="sample.mov"

# Get the size of the video file (in bytes)
VIDEO_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE")

# Check if file exists
if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Error: File '$VIDEO_FILE' not found!"
  exit 1
fi

# Print file size info
echo "🎬 Preparing to upload: $VIDEO_FILE ($VIDEO_SIZE bytes)"

# Make the API call to initialize upload
echo "📡 Initializing upload with TikTok API..."
response=$(curl -s --location "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data "{
    \"source_info\": {
      \"source\": \"FILE_UPLOAD\",
      \"video_size\": $VIDEO_SIZE,
      \"chunk_size\": $VIDEO_SIZE,
      \"total_chunk_count\": 1
    }
  }")

echo "✅ TikTok API response:"
echo "$response"

# Extract important fields from the response (requires jq)
if command -v jq &> /dev/null; then
  publish_id=$(echo "$response" | jq -r '.data.publish_id // empty')
  upload_url=$(echo "$response" | jq -r '.data.upload_url // empty')

  if [ -n "$publish_id" ] && [ -n "$upload_url" ]; then
    echo ""
    echo "🎉 Upload initialized successfully!"
    echo "Publish ID: $publish_id"
    echo "Upload URL: $upload_url"
    echo ""
    echo "➡️ Next step: use this upload URL to PUT your video file via curl:"
    echo "curl --request PUT \"$upload_url\" --header 'Content-Type: video/quicktime' --data-binary '@$VIDEO_FILE'"
  else
    echo "⚠️ Could not extract upload_url or publish_id from the response."
  fi
else
  echo "Install jq to extract upload_url automatically (brew install jq or apt install jq)."
fi
