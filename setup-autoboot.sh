#!/bin/bash
################################################################################
# LightNVR Auto-Boot Setup Script for Raspberry Pi
# This script sets up LightNVR to auto-start on boot and launches Chromium
# in fullscreen kiosk mode
################################################################################

set -e

# Auto-detect current directory and user
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIGHTNVR_DIR="$SCRIPT_DIR"
USER="$(whoami)"

echo "🚀 Setting up LightNVR Auto-Boot for Raspberry Pi..."
echo ""
echo "📁 Detected LightNVR directory: $LIGHTNVR_DIR"
echo "👤 Detected user: $USER"
echo ""


# 1. Create systemd service for LightNVR
echo "📝 Creating systemd service..."
sudo tee /etc/systemd/system/lightnvr.service > /dev/null << EOF
[Unit]
Description=LightNVR - Network Video Recorder
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$LIGHTNVR_DIR
ExecStart=$LIGHTNVR_DIR/run.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
EOF

# 2. Enable and start the service
echo "⚙️  Enabling LightNVR service..."
sudo systemctl daemon-reload
sudo systemctl enable lightnvr.service
sudo systemctl start lightnvr.service

# 3. Wait for LightNVR to start
echo "⏳ Waiting for LightNVR to start..."
sleep 5

# 4. Create autostart directory if it doesn't exist
mkdir -p ~/.config/autostart

# 5. Create Chromium kiosk mode autostart
echo "🌐 Setting up Chromium fullscreen kiosk..."
tee ~/.config/autostart/lightnvr-kiosk.desktop > /dev/null << EOF
[Desktop Entry]
Type=Application
Name=LightNVR Kiosk
Comment=Launch LightNVR in fullscreen Chromium kiosk mode
Exec=$LIGHTNVR_DIR/scripts/start-kiosk.sh
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF

# 6. Create the kiosk startup script
mkdir -p $LIGHTNVR_DIR/scripts
tee $LIGHTNVR_DIR/scripts/start-kiosk.sh > /dev/null << 'EOF'
#!/bin/bash
# LightNVR Chromium Kiosk Mode Startup Script

# Wait for LightNVR to be fully ready
echo "Waiting for LightNVR to be ready..."
sleep 10

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide mouse cursor after 3 seconds of inactivity
unclutter -idle 3 &

# Kill any existing Chromium instances
pkill -f chromium || true
sleep 2

# Launch Chromium in kiosk mode with full screen optimization
chromium \
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
    --window-position=0,0 \
    --start-fullscreen \
    --force-device-scale-factor=1 \
    --disable-smooth-scrolling \
    --app=http://localhost:8080/ &

# Optional: Add watchdog to restart Chromium if it crashes
while true; do
    sleep 60
    if ! pgrep -f "chromium-browser.*8080" > /dev/null; then
        echo "Chromium crashed, restarting..."
        chromium-browser --kiosk --app=http://localhost:8080/ &
    fi
done
EOF

chmod +x $LIGHTNVR_DIR/scripts/start-kiosk.sh

# 7. Install required packages if not present
echo "📦 Checking required packages..."
if ! command -v unclutter &> /dev/null; then
    echo "Installing unclutter (hides mouse cursor)..."
    sudo apt-get update -qq
    sudo apt-get install -y unclutter
fi

if ! command -v chromium &> /dev/null; then
    echo "Installing Chromium browser..."
    sudo apt-get install -y chromium-browser
fi

# 8. Create a manual start/stop script
tee $LIGHTNVR_DIR/lightnvr-control.sh > /dev/null << 'EOF'
#!/bin/bash
# LightNVR Control Script

case "$1" in
    start)
        echo "🚀 Starting LightNVR..."
        sudo systemctl start lightnvr.service
        echo "✅ LightNVR started"
        ;;
    stop)
        echo "🛑 Stopping LightNVR..."
        sudo systemctl stop lightnvr.service
        pkill -f chromium-browser || true
        echo "✅ LightNVR stopped"
        ;;
    restart)
        echo "🔄 Restarting LightNVR..."
        sudo systemctl restart lightnvr.service
        sleep 3
        pkill -f chromium-browser || true
        sleep 1
        $LIGHTNVR_DIR/scripts/start-kiosk.sh &
        echo "✅ LightNVR restarted"
        ;;
    status)
        echo "📊 LightNVR Status:"
        sudo systemctl status lightnvr.service --no-pager
        echo ""
        echo "🌐 Chromium Status:"
        if pgrep -f "chromium-browser.*8080" > /dev/null; then
            echo "✅ Chromium is running in kiosk mode"
        else
            echo "❌ Chromium is not running"
        fi
        ;;
    logs)
        echo "📜 LightNVR Logs (last 50 lines):"
        sudo journalctl -u lightnvr.service -n 50 --no-pager
        ;;
    kiosk)
        echo "🌐 Starting Chromium kiosk..."
        $LIGHTNVR_DIR/scripts/start-kiosk.sh &
        echo "✅ Chromium kiosk started"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|kiosk}"
        exit 1
        ;;
esac
EOF

chmod +x $LIGHTNVR_DIR/lightnvr-control.sh

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ LightNVR Auto-Boot Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 What was configured:"
echo "  ✓ Systemd service: /etc/systemd/system/lightnvr.service"
echo "  ✓ Auto-start on boot: ENABLED"
echo "  ✓ Chromium kiosk mode: ~/.config/autostart/lightnvr-kiosk.desktop"
echo "  ✓ Control script: $LIGHTNVR_DIR/lightnvr-control.sh"
echo ""
echo "🎮 Control Commands:"
echo "  Start:   sudo systemctl start lightnvr"
echo "  Stop:    sudo systemctl stop lightnvr"
echo "  Restart: sudo systemctl restart lightnvr"
echo "  Status:  sudo systemctl status lightnvr"
echo "  Logs:    sudo journalctl -u lightnvr -f"
echo ""
echo "  Or use: $LIGHTNVR_DIR/lightnvr-control.sh {start|stop|restart|status|logs|kiosk}"
echo ""
echo "🚀 Next Steps:"
echo "  1. Reboot your Pi: sudo reboot"
echo "  2. LightNVR will auto-start"
echo "  3. Chromium will launch in fullscreen after login"
echo ""
echo "💡 Tips:"
echo "  • The dashboard will load at: http://localhost:8080/"
echo "  • Press F11 to exit fullscreen manually"
echo "  • Press Alt+F4 to close Chromium"
echo "  • Screen will never sleep/blank"
echo ""
echo "═══════════════════════════════════════════════════════════════"
