#!/bin/bash
set -e

# TikTok API credentials
CLIENT_KEY="sbawelekk7yrlzy62u"
CLIENT_SECRET="S7ll3zYrf5Dk1HJ3n4olKRZgpFnIEffe"
REDIRECT_URI="https://webhook.site/dc4f4ef1-c084-44d3-a8e2-bf3733d90cf0"
CODE="nppvw5tt0MvRpPAYEAMRPLWxfDJvQq8YpubOQburr--CPfoZFGNGHFSk6WI2o88TwFc-fLt1lvDcrVBqnzPX6f3rKS93thLu3lnW9gryl_bGpS-YQokoyWYpeDXmm1yVpyc8UIaektpEQuubERYKq-svCFT19tRed6qkuZgi1kiV4mUwEy-TsAFcoP6qWPlDbf-s6YmlAhc7VDUWmWQnldcfBnBKqHieVq9BWRQh_Iw*1!6431.u1"


echo "🎟️  Exchanging TikTok authorization code for access token..."
echo "🔍 Using code: $CODE"
echo ""

RESPONSE=$(curl -v -X POST "https://open.tiktokapis.com/v2/oauth/token/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_key=$CLIENT_KEY" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "code=$CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=$REDIRECT_URI" 2>&1)

echo ""
echo "📡 Raw TikTok API Response:"
echo "-----------------------------------------"
echo "$RESPONSE"
echo "-----------------------------------------"

# Save full response to file
echo "$RESPONSE" > tiktok_access_token_raw.log

# Try to extract JSON if present
if echo "$RESPONSE" | grep -q '"access_token"'; then
  echo "$RESPONSE" | grep -o '{.*}' > tiktok_access_token.json
  echo ""
  echo "💾 Saved access token JSON → tiktok_access_token.json"
else
  echo ""
  echo "⚠️  No JSON detected — check tiktok_access_token_raw.log for details."
fi