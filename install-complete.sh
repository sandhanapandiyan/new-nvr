#!/bin/bash
################################################################################
# LightNVR Complete Installation & Auto-Boot Setup for Raspberry Pi
# This script installs ALL dependencies and configures auto-start
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Auto-detect current directory and user
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIGHTNVR_DIR="$SCRIPT_DIR"
USER="$(whoami)"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║    🚀 LightNVR Complete Installation & Auto-Boot Setup           ║"
echo "║    For Raspberry Pi - All Dependencies Included                  ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Installation directory: $LIGHTNVR_DIR"
echo "👤 User: $USER"
echo ""
echo "⏰ This will take 10-15 minutes depending on your internet speed..."
echo ""

# Ask for confirmation
read -p "Continue with installation? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 1/8: Updating System Packages"
echo "═══════════════════════════════════════════════════════════════"
sudo apt-get update -y
echo "✅ System packages updated"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 2/8: Installing Build Dependencies"
echo "═══════════════════════════════════════════════════════════════"
echo "📦 Installing: build-essential, cmake, git, pkg-config..."
sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    pkg-config \
    autoconf \
    automake \
    libtool \
    wget \
    curl \
    unzip
echo "✅ Build dependencies installed"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 3/8: Installing System Libraries"
echo "═══════════════════════════════════════════════════════════════"
echo "📦 Installing: FFmpeg, SQLite, libxml2, libssl..."
sudo apt-get install -y \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavdevice-dev \
    ffmpeg \
    libsqlite3-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    zlib1g-dev
echo "✅ System libraries installed"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 4/8: Installing Node.js and NPM"
echo "═══════════════════════════════════════════════════════════════"
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 5/8: Installing go2rtc"
echo "═══════════════════════════════════════════════════════════════"
if [ ! -f "$LIGHTNVR_DIR/go2rtc/go2rtc" ]; then
    echo "📦 Downloading go2rtc..."
    mkdir -p "$LIGHTNVR_DIR/go2rtc"
    cd "$LIGHTNVR_DIR/go2rtc"
    
    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        GO2RTC_ARCH="arm64"
    elif [ "$ARCH" = "armv7l" ]; then
        GO2RTC_ARCH="arm"
    else
        GO2RTC_ARCH="amd64"
    fi
    
    wget -O go2rtc "https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_${GO2RTC_ARCH}"
    chmod +x go2rtc
    echo "✅ go2rtc installed"
else
    echo "✅ go2rtc already installed"
fi
cd "$LIGHTNVR_DIR"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 6/8: Installing Chromium Browser & Utilities"
echo "═══════════════════════════════════════════════════════════════"
echo "📦 Installing: chromium, unclutter, x11-xserver-utils..."
sudo apt-get install -y \
    chromium-browser \
    unclutter \
    x11-xserver-utils \
    xdotool
echo "✅ Browser and utilities installed"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 7/8: Building LightNVR Web Interface"
echo "═══════════════════════════════════════════════════════════════"
if [ -d "$LIGHTNVR_DIR/web" ]; then
    echo "📦 Installing web dependencies..."
    cd "$LIGHTNVR_DIR/web"
    npm install --legacy-peer-deps
    
    echo "🔨 Building web interface..."
    npm run build
    echo "✅ Web interface built"
    cd "$LIGHTNVR_DIR"
else
    echo "⚠️  Web directory not found, skipping..."
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  STEP 8/8: Compiling LightNVR Backend"
echo "═══════════════════════════════════════════════════════════════"
if [ ! -f "$LIGHTNVR_DIR/build/Release/bin/lightnvr" ]; then
    echo "🔨 Compiling LightNVR..."
    cd "$LIGHTNVR_DIR"
    
    # Create build directory
    mkdir -p build/Release
    cd build/Release
    
    # Run cmake
    cmake ../.. -DCMAKE_BUILD_TYPE=Release
    
    # Build with all CPU cores
    make -j$(nproc)
    
    echo "✅ LightNVR compiled successfully"
    cd "$LIGHTNVR_DIR"
else
    echo "✅ LightNVR already compiled"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  CONFIGURING AUTO-START ON BOOT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create systemd service
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

# Enable and start the service
echo "⚙️  Enabling LightNVR service..."
sudo systemctl daemon-reload
sudo systemctl enable lightnvr.service
# Don't start yet, we'll do a full setup first

echo "✅ Systemd service created"
echo ""

# Create autostart directory
mkdir -p ~/.config/autostart

# Create Chromium kiosk mode autostart
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

# Create the kiosk startup script
mkdir -p "$LIGHTNVR_DIR/scripts"
tee "$LIGHTNVR_DIR/scripts/start-kiosk.sh" > /dev/null << 'EOFKIOSK'
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
pkill -f chromium-browser || true
sleep 2

# Launch Chromium in kiosk mode
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
    --app=http://localhost:8080/ &

# Optional: Add watchdog to restart Chromium if it crashes
while true; do
    sleep 60
    if ! pgrep -f "chromium-browser.*8080" > /dev/null; then
        echo "Chromium crashed, restarting..."
        chromium-browser --kiosk --app=http://localhost:8080/ &
    fi
done
EOFKIOSK

chmod +x "$LIGHTNVR_DIR/scripts/start-kiosk.sh"

echo "✅ Kiosk mode configured"
echo ""

# Create control script
echo "🎮 Creating control script..."
tee "$LIGHTNVR_DIR/lightnvr-control.sh" > /dev/null << 'EOFCONTROL'
#!/bin/bash
# LightNVR Control Script

LIGHTNVR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
        pkill -f chromium || true
        sleep 1
        $LIGHTNVR_DIR/scripts/start-kiosk.sh &
        echo "✅ LightNVR restarted"
        ;;
    status)
        echo "📊 LightNVR Status:"
        sudo systemctl status lightnvr.service --no-pager
        echo ""
        echo "🌐 Chromium Status:"
        if pgrep -f "chromium.*8080" > /dev/null; then
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
EOFCONTROL

chmod +x "$LIGHTNVR_DIR/lightnvr-control.sh"

echo "✅ Control script created"
echo ""

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p "$LIGHTNVR_DIR/local/recordings/mp4"
mkdir -p "$LIGHTNVR_DIR/local/db"
mkdir -p "$LIGHTNVR_DIR/local/log"
mkdir -p "$LIGHTNVR_DIR/local/snapshots"
echo "✅ Directories created"
echo ""

# Set proper permissions
echo "🔒 Setting permissions..."
chmod -R 755 "$LIGHTNVR_DIR/scripts" 2>/dev/null || true
chmod +x "$LIGHTNVR_DIR/run.sh" 2>/dev/null || true
chmod +x "$LIGHTNVR_DIR/build/Release/bin/lightnvr" 2>/dev/null || true
echo "✅ Permissions set"
echo ""

# Get IP addresses
echo "📍 Detecting network configuration..."
IPS=$(hostname -I 2>/dev/null || ip -4 addr show | grep "inet " | awk '{print $2}' | cut -d/ -f1 | grep -v "127.0.0.1" | head -2)

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║           ✅ INSTALLATION COMPLETE!                              ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 What was installed and configured:"
echo ""
echo "  ✅ Build tools (gcc, cmake, git)"
echo "  ✅ System libraries (FFmpeg, SQLite, libxml2, OpenSSL)"
echo "  ✅ Node.js $(node --version 2>/dev/null || echo 'and NPM')"
echo "  ✅ go2rtc streaming server"
echo "  ✅ Chromium browser"
echo "  ✅ Utilities (unclutter, xset)"
echo "  ✅ LightNVR web interface (built)"
echo "  ✅ LightNVR backend (compiled)"
echo "  ✅ Systemd service (enabled)"
echo "  ✅ Auto-start on boot"
echo "  ✅ Chromium kiosk mode"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎮 Control Commands:"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh start"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh stop"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh restart"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh status"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh logs"
echo "  $LIGHTNVR_DIR/lightnvr-control.sh kiosk"
echo ""
echo "  Or use systemd:"
echo "  sudo systemctl start lightnvr"
echo "  sudo systemctl stop lightnvr"
echo "  sudo systemctl status lightnvr"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📱 Access LightNVR at:"
echo ""
echo "  🖥️  On this Pi:"
echo "     http://localhost:8080/"
echo ""
echo "  🌐 From other devices:"
for ip in $IPS; do
    echo "     http://$ip:8080/"
done
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "  1. Start LightNVR now:"
echo "     sudo systemctl start lightnvr"
echo ""
echo "  2. OR reboot to start automatically:"
echo "     sudo reboot"
echo ""
echo "  After reboot:"
echo "  • LightNVR will auto-start"
echo "  • Chromium will launch in fullscreen"
echo "  • Dashboard will load automatically"
echo "  • Screen will never sleep/blank"
echo ""
echo "💡 Tips:"
echo "  • Press F11 to exit fullscreen"
echo "  • Press Alt+F4 to close Chromium"
echo "  • Access from phone/tablet using the IP addresses above"
echo "  • View logs: sudo journalctl -u lightnvr -f"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Your Raspberry Pi NVR is ready!"
echo ""

# Ask if user wants to start now
read -p "Start LightNVR now? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo "🚀 Starting LightNVR..."
    sudo systemctl start lightnvr.service
    sleep 5
    
    if systemctl is-active --quiet lightnvr.service; then
        echo "✅ LightNVR is running!"
        echo ""
        echo "Opening browser in 3 seconds..."
        sleep 3
        
        # Try to open browser if in X session
        if [ -n "$DISPLAY" ]; then
            chromium --app=http://localhost:8080/ &
        fi
    else
        echo "⚠️  LightNVR failed to start. Check logs:"
        echo "   sudo journalctl -u lightnvr -n 50"
    fi
fi

echo ""
echo "✨ Installation script complete!"
echo ""
