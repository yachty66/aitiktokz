#!/bin/bash
# === Step 2: Upload Video File ===

VIDEO_FILE="sample.mov"

if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Error: File '$VIDEO_FILE' not found!"
  exit 1
fi

if [ ! -f "upload_url.txt" ]; then
  echo "❌ Error: upload_url.txt not found! Run ./tiktok_init_upload.sh first."
  exit 1
fi

UPLOAD_URL=$(cat upload_url.txt)
VIDEO_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE")
END_BYTE=$((VIDEO_SIZE - 1))

echo "📡 Uploading $VIDEO_FILE ($VIDEO_SIZE bytes) to TikTok..."
response=$(curl -s --request PUT "$UPLOAD_URL" \
  --header "Content-Type: video/mp4" \
  --header "Content-Length: $VIDEO_SIZE" \
  --header "Content-Range: bytes 0-$END_BYTE/$VIDEO_SIZE" \
  --data-binary "@$VIDEO_FILE")

echo "✅ TikTok Upload Response:"
echo "$response"

if [[ "$response" == "null" || "$response" == "{}" ]]; then
  echo "🎉 Upload completed successfully!"
else
  echo "⚠️ Upload may have failed. Check the response above."
fi
