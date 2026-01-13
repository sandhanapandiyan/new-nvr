#!/bin/bash
################################################################################
# LightNVR All-In-One Startup Script
# Starts LightNVR backend + Chromium fullscreen kiosk in one command
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🚀 ${GREEN}LightNVR Pro${NC} - Complete Startup                      ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⏹️  Shutting down...${NC}"
    
    # Kill Chromium
    if [ -n "$CHROMIUM_PID" ]; then
        echo "  Stopping Chromium..."
        kill $CHROMIUM_PID 2>/dev/null || true
    fi
    pkill -f "chromium-browser.*8080" 2>/dev/null || true
    
    # Kill LightNVR
    if [ -n "$LIGHTNVR_PID" ]; then
        echo "  Stopping LightNVR..."
        kill $LIGHTNVR_PID 2>/dev/null || true
    fi
    
    # Kill go2rtc
    pkill -f go2rtc 2>/dev/null || true
    
    # Remove PID file
    rm -f local/lightnvr.pid
    
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 1. Start LightNVR Backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📡 Starting LightNVR Backend...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if already running
if [ -f local/lightnvr.pid ]; then
    OLD_PID=$(cat local/lightnvr.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  LightNVR is already running (PID: $OLD_PID)${NC}"
        echo -e "${YELLOW}   Stopping old instance...${NC}"
        kill $OLD_PID 2>/dev/null || true
        sleep 2
    fi
    rm -f local/lightnvr.pid
fi

# Start LightNVR in background
./run.sh &
LIGHTNVR_PID=$!

echo -e "${GREEN}✓ LightNVR started (PID: $LIGHTNVR_PID)${NC}"
echo ""

# 2. Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1 || \
       curl -s http://localhost:8080/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}⚠️  Timeout waiting for backend, but continuing...${NC}"
    fi
    echo -n "."
    sleep 1
done
echo ""

# 3. Setup display (if running in GUI)
if [ -n "$DISPLAY" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🖥️  Setting up Display...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Disable screen blanking
    xset s off 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s noblank 2>/dev/null || true
    echo -e "${GREEN}✓ Screen blanking disabled${NC}"
    
    # Hide mouse cursor (if unclutter is installed)
    if command -v unclutter &> /dev/null; then
        pkill unclutter 2>/dev/null || true
        unclutter -idle 3 &
        echo -e "${GREEN}✓ Mouse cursor auto-hide enabled${NC}"
    fi
    echo ""
    
    # 4. Launch Chromium in Kiosk Mode
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🌐 Launching Chromium Kiosk...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Kill any existing Chromium instances
    pkill -f "chromium-browser.*8080" 2>/dev/null || true
    sleep 1
    
    # Launch Chromium
    chromium-browser \
        --kiosk \
        --noerrdialogs \
        --disable-infobars \
        --no-first-run \
        --fast \
        --fast-start \
        --disable-features=TranslateUI \
        --disk-cache-dir=/dev/null \
        --password-store=basic \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --disable-suggestions-service \
        --disable-translate \
        --disable-save-password-bubble \
        --disable-session-crashed-bubble \
        --disable-dev-shm-usage \
        --check-for-update-interval=31536000 \
        --app=http://localhost:8080/pro-dashboard.html &
    
    CHROMIUM_PID=$!
    echo -e "${GREEN}✓ Chromium launched in fullscreen kiosk mode (PID: $CHROMIUM_PID)${NC}"
    echo ""
else
    echo -e "${YELLOW}ℹ️  No display detected, running in headless mode${NC}"
    echo ""
fi

# 5. Show status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ LightNVR is Running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📡 Backend:    ${GREEN}http://localhost:8080${NC}"
echo -e "  🎥 Dashboard:  ${GREEN}http://localhost:8080/pro-dashboard.html${NC}"
echo -e "  🎬 Playback:   ${GREEN}http://localhost:8080/pro-playback.html${NC}"
echo -e "  ⚙️  Settings:   ${GREEN}http://localhost:8080/settings.html${NC}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop everything${NC}"
echo -e "  ${YELLOW}Press F11 to exit fullscreen${NC}"
echo -e "  ${YELLOW}Press Alt+F4 to close Chromium${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 6. Keep running and monitor
echo -e "${GREEN}📊 System Monitor:${NC}"
echo ""

# Monitor processes
while true; do
    # Check if LightNVR is still running
    if ! ps -p $LIGHTNVR_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ LightNVR backend stopped unexpectedly!${NC}"
        cleanup
    fi
    
    # Check if Chromium crashed (if it was started)
    if [ -n "$CHROMIUM_PID" ] && [ -n "$DISPLAY" ]; then
        if ! ps -p $CHROMIUM_PID > /dev/null 2>&1 && ! pgrep -f "chromium-browser.*8080" > /dev/null; then
            echo -e "${YELLOW}⚠️  Chromium crashed, restarting...${NC}"
            chromium-browser --kiosk --app=http://localhost:8080/pro-dashboard.html &
            CHROMIUM_PID=$!
        fi
    fi
    
    sleep 5
done
