#!/bin/bash
# CRM Miner — Production Start
# Starts: Node API + Cloudflare Tunnel + Nginx

cd "$(dirname "$0")"

# Kill existing
pkill -f "node server/index.js" 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# Start API
echo "🚀 Starting API server..."
nohup node server/index.js > /tmp/crm-api.log 2>&1 &
API_PID=$!
sleep 3

# Check API
if curl -sf http://localhost:3100/api/health > /dev/null; then
  echo "✅ API running (PID: $API_PID)"
else
  echo "❌ API failed. Check /tmp/crm-api.log"
  exit 1
fi

# Start tunnel
echo "🌐 Starting Cloudflare Tunnel..."
nohup /tmp/cloudflared tunnel --url http://localhost:3100 --no-autoupdate > /tmp/crm-tunnel.log 2>&1 &
TUNNEL_PID=$!
sleep 5

TUNNEL_URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' /tmp/crm-tunnel.log | tail -1)

# Restart nginx
sudo nginx -s reload 2>/dev/null || sudo nginx 2>/dev/null

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  CRM MINER — PRODUCTION                 ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "🔗 Tunnel: ${TUNNEL_URL:-'loading...'}"
echo "🔗 Domain: https://crm.minerbz.com.br (quando DNS propagar)"
echo ""
echo "📋 Logs:"
echo "   API:    tail -f /tmp/crm-api.log"
echo "   Tunnel: tail -f /tmp/crm-tunnel.log"
