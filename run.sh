#!/bin/bash

# LightNVR Unified Run Script
# This script builds and runs LightNVR without Docker.

set -e

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== LightNVR Standalone Run Script ===${NC}"

# 1. Check dependencies
echo -e "\n${BLUE}Checking dependencies...${NC}"
deps=(cmake gcc g++ node npm curl)
for dep in "${deps[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
        echo -e "${RED}Error: $dep is not installed.${NC}"
        echo "Please install it using your package manager (e.g., sudo apt install $dep)"
        exit 1
    fi
done
echo -e "${GREEN}✓ All basic build tools found.${NC}"

# 2. Build Backend
echo -e "\n${BLUE}Building Backend...${NC}"
# Make sure build script is executable
chmod +x ./scripts/build.sh
./scripts/build.sh --release

# 3. Build Web Frontend
echo -e "\n${BLUE}Building Web Frontend...${NC}"
cd web
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
echo "Building assets..."
npm run build
cd ..

# 4. Prepare local environment
echo -e "\n${BLUE}Preparing local environment...${NC}"
mkdir -p local/recordings local/models local/db local/www local/log

# Copy web assets to local/www
echo "Syncing web assets to local/www..."
cp -r web/dist/* local/www/

# 5. Create local config if missing
if [ ! -f "lightnvr.ini" ]; then
    echo -e "${YELLOW}Creating local lightnvr.ini...${NC}"
    cat > lightnvr.ini << EOF
[general]
pid_file = local/lightnvr.pid
log_file = local/log/lightnvr.log
log_level = 2

[storage]
path = local/recordings
max_size = 0
retention_days = 30
auto_delete_oldest = true

[models]
path = local/models

[database]
path = local/db/lightnvr.db

[web]
port = 8080
root = local/www
auth_enabled = true
username = admin
password = admin

[go2rtc]
binary_path = ./go2rtc/go2rtc
config_dir = ./go2rtc
api_port = 1984
EOF
fi

# 6. Ensure go2rtc is present
if [ ! -f "./go2rtc/go2rtc" ]; then
    echo -e "\n${YELLOW}go2rtc binary not found in ./go2rtc/. Attempting to download...${NC}"
    mkdir -p go2rtc
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) GO_ARCH="amd64" ;;
        aarch64) GO_ARCH="arm64" ;;
        armv7l) GO_ARCH="arm" ;;
        *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    URL="https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_$GO_ARCH"
    curl -L "$URL" -o ./go2rtc/go2rtc
    chmod +x ./go2rtc/go2rtc
    echo -e "${GREEN}✓ go2rtc downloaded.${NC}"
fi

# 7. Start LightNVR
echo -e "\n${GREEN}=== LightNVR is ready! ===${NC}"
echo -e "Web Interface: ${BLUE}http://localhost:8080${NC}"
echo -e "Default Login: ${BLUE}admin / admin${NC}"
echo -e "Logs: ${BLUE}local/log/lightnvr.log${NC}"
echo ""
echo -e "Starting application... (Ctrl+C to stop)"
echo ""

# Run the binary
./build/Release/bin/lightnvr -c lightnvr.ini
