#!/bin/bash
# CRM Miner — Start script
# Starts API server + Cloudflare Tunnel

cd "$(dirname "$0")"

# Kill existing
pkill -f "node server/index.js" 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# Start API
echo "🚀 Starting API server..."
nohup node server/index.js > /tmp/crm-api.log 2>&1 &
API_PID=$!
sleep 2

# Check API health
if curl -s http://localhost:3100/api/health | grep -q '"ok"'; then
  echo "✅ API running (PID: $API_PID)"
else
  echo "❌ API failed to start. Check /tmp/crm-api.log"
  exit 1
fi

# Start tunnel
echo "🌐 Starting Cloudflare Tunnel..."
nohup /tmp/cloudflared tunnel --url http://localhost:3100 --no-autoupdate > /tmp/crm-tunnel.log 2>&1 &
TUNNEL_PID=$!
sleep 3

# Extract tunnel URL
TUNNEL_URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' /tmp/crm-tunnel.log | head -1)
echo "✅ Tunnel running (PID: $TUNNEL_PID)"
echo "🔗 URL: ${TUNNEL_URL:-'check /tmp/crm-tunnel.log'}"
echo ""
echo "API logs:    tail -f /tmp/crm-api.log"
echo "Tunnel logs: tail -f /tmp/crm-tunnel.log"
