#!/bin/bash

# === TikTok Video File Upload ===

# Upload URL from TikTok init step
UPLOAD_URL="https://open-upload-i18n.tiktokapis.com/upload?upload_id=7560042297228838915&upload_token=35b23ec4-2ecc-9e10-f152-1dfb91e0289e"

# Local video file to upload
VIDEO_FILE="sample.mov"

# Check if file exists
if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Error: File '$VIDEO_FILE' not found!"
  exit 1
fi

# Determine file size (for logging)
VIDEO_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE")
echo "🎬 Uploading $VIDEO_FILE ($VIDEO_SIZE bytes) to TikTok..."

# Perform the upload
response=$(curl -s --request PUT "$UPLOAD_URL" \
  --header "Content-Type: video/mp4" \
  --data-binary "@$VIDEO_FILE")

# Show result
echo ""
echo "✅ TikTok upload response:"
echo "$response"

# Check if it looks successful
if [[ "$response" == "null" || "$response" == "{}" || "$response" == *"ok"* ]]; then
  echo ""
  echo "🎉 Upload completed successfully!"
  echo "➡️  Next: run ./tiktok_check_status.sh to verify processing status."
else
  echo ""
  echo "⚠️ Upload may have failed or partially uploaded. Check response above."
fi