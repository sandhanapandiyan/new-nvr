#!/bin/bash
################################################################################
# LightNVR Compilation Script
# Compiles the LightNVR backend only
################################################################################

set -e

# Auto-detect current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║        🔨 LightNVR Backend Compilation                           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Check if required dependencies are installed
echo "🔍 Checking dependencies..."
MISSING_DEPS=()

check_package() {
    if ! dpkg -l | grep -q "^ii  $1 "; then
        MISSING_DEPS+=("$1")
    fi
}

# Check all required libraries
check_package "build-essential"
check_package "cmake"
check_package "libavcodec-dev"
check_package "libavformat-dev"
check_package "libsqlite3-dev"
check_package "libxml2-dev"
check_package "libssl-dev"
check_package "libmbedtls-dev"
check_package "libcjson-dev"
check_package "libcurl4-openssl-dev"

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "❌ Missing dependencies:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "   - $dep"
    done
    echo ""
    echo "Install missing dependencies with:"
    echo "   sudo apt-get install -y ${MISSING_DEPS[*]}"
    echo ""
    read -p "Install missing dependencies now? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo "📦 Installing dependencies..."
        sudo apt-get update
        sudo apt-get install -y "${MISSING_DEPS[@]}"
        echo "✅ Dependencies installed"
    else
        echo "⚠️  Cannot compile without dependencies. Exiting."
        exit 1
    fi
else
    echo "✅ All dependencies are installed"
fi
echo ""

# Clean previous build
read -p "Clean previous build? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo "🧹 Cleaning previous build..."
    rm -rf build
    echo "✅ Build directory cleaned"
else
    echo "⏭️  Keeping previous build files"
fi
echo ""

# Create build directory
echo "📁 Creating build directory..."
mkdir -p build/Release
cd build/Release
echo "✅ Build directory ready"
echo ""

# Run CMake
echo "═══════════════════════════════════════════════════════════════"
echo "  Running CMake Configuration"
echo "═══════════════════════════════════════════════════════════════"
cmake ../.. -DCMAKE_BUILD_TYPE=Release

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ CMake configuration failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ CMake configuration successful"
echo ""

# Compile
echo "═══════════════════════════════════════════════════════════════"
echo "  Compiling LightNVR"
echo "═══════════════════════════════════════════════════════════════"
echo "Using $(nproc) CPU cores for compilation..."
echo ""

make -j$(nproc)

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Compilation failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Compilation successful!"
echo ""

# Check executable
if [ -f "bin/lightnvr" ]; then
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║           ✅ COMPILATION COMPLETE!                               ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📍 Executable location:"
    echo "   $SCRIPT_DIR/build/Release/bin/lightnvr"
    echo ""
    
    # Get file size
    SIZE=$(du -h bin/lightnvr | cut -f1)
    echo "📦 Binary size: $SIZE"
    echo ""
    
    # Set executable permissions
    chmod +x bin/lightnvr
    echo "✅ Executable permissions set"
    echo ""
    
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "🚀 Next Steps:"
    echo ""
    echo "  1. Test the build:"
    echo "     cd $SCRIPT_DIR"
    echo "     ./run.sh"
    echo ""
    echo "  2. Or run directly:"
    echo "     ./build/Release/bin/lightnvr -c config/lightnvr.ini"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
else
    echo "⚠️  Executable not found at expected location!"
    echo "Build may have completed but with issues."
    exit 1
fi

echo ""
echo "✨ Compilation script complete!"
echo ""
