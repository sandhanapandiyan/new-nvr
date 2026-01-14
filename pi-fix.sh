#!/bin/bash
################################################################################
# LightNVR Raspberry Pi - Quick Fix Script
# Run this if the site is not reachable
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║        🔧 LightNVR Raspberry Pi - Quick Fix                      ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Step 1: Stop any running instances
echo "1️⃣  Stopping any running LightNVR instances..."
pkill -9 lightnvr 2>/dev/null
pkill -9 go2rtc 2>/dev/null
sleep 2
echo "   ✅ Stopped"
echo ""

# Step 2: Clean up locks
echo "2️⃣  Cleaning up lock files..."
rm -f local/lightnvr.pid 2>/dev/null
echo "   ✅ Cleaned"
echo ""

# Step 3: Get IP addresses
echo "3️⃣  Detecting network configuration..."
IPS=$(hostname -I 2>/dev/null || ip -4 addr show | grep "inet " | awk '{print $2}' | cut -d/ -f1 | grep -v "127.0.0.1" | head -2)
echo "   Your Pi IP addresses:"
for ip in $IPS; do
    echo "   📍 $ip"
done
echo ""

# Step 4: Start LightNVR
echo "4️⃣  Starting LightNVR..."
if [ ! -f "./run.sh" ]; then
    echo "   ❌ run.sh not found!"
    echo "   💡 Make sure you're in the lightnvr directory"
    exit 1
fi

chmod +x ./run.sh
./run.sh > /dev/null 2>&1 &
LIGHTNVR_PID=$!
echo "   ✅ Started (PID: $LIGHTNVR_PID)"
echo ""

# Step 5: Wait for server to start
echo "5️⃣  Waiting for web server to start..."
COUNTER=0
MAX_WAIT=30

while [ $COUNTER -lt $MAX_WAIT ]; do
    if ss -tuln 2>/dev/null | grep -q ":8080" || netstat -tuln 2>/dev/null | grep -q ":8080"; then
        echo "   ✅ Web server is running on port 8080!"
        break
    fi
    echo -n "."
    sleep 1
    COUNTER=$((COUNTER+1))
done
echo ""

if [ $COUNTER -ge $MAX_WAIT ]; then
    echo "   ⚠️  Server didn't start within 30 seconds"
    echo "   💡 Check logs: tail -f local/log/lightnvr.log"
    exit 1
fi
echo ""

# Step 6: Test connection
echo "6️⃣  Testing local connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|302\|301"; then
    echo "   ✅ Server is responding!"
else
    echo "   ⚠️  Server not responding yet, give it a few more seconds..."
fi
echo ""

# Step 7: Show access URLs
echo "═══════════════════════════════════════════════════════════════"
echo "✅ LightNVR is Ready!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📱 Access LightNVR from:"
echo ""
echo "   🖥️  On this Pi:"
echo "      http://localhost:8080/"
echo ""
echo "   🌐 From other devices on network:"
for ip in $IPS; do
    echo "      http://$ip:8080/"
done
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "💡 Quick Commands:"
echo "   View logs:    tail -f local/log/lightnvr.log"
echo "   Stop server:  pkill lightnvr"
echo "   Restart:      ./pi-fix.sh"
echo ""
echo "🌐 Opening browser in 3 seconds..."
sleep 3

# Try to open browser
if command -v chromium-browser &> /dev/null; then
    chromium-browser --app=http://localhost:8080/ &
    echo "   ✅ Browser opened!"
elif command -v chromium &> /dev/null; then
    chromium --app=http://localhost:8080/ &
    echo "   ✅ Browser opened!"
else
    echo "   ℹ️  No Chromium found, please open manually"
fi

echo ""
echo "🎉 Done! Your NVR should now be accessible."
echo ""
