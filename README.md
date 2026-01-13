# LightNVR - Lightweight Network Video Recorder

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)


LightNVR is a tiny, memory-optimized Network Video Recorder software written in C. While originally designed for resource-constrained devices like the Ingenic A1 SoC with only 256MB of RAM, it can run on any Linux system.

## Overview

LightNVR provides a lightweight yet powerful solution for recording and managing IP camera streams. It's designed to run efficiently on low-power, memory-constrained devices while still providing essential NVR functionality with a modern, responsive web interface.

![Live Streams Interface](docs/images/live-streams.png)

> **✨ New Features:** Detection zones with visual polygon editor, customizable themes, enhanced light-object-detect integration, and ultra-low latency WebRTC streaming!

### Key Features

#### 🎯 Smart Detection & Recording
- **Detection Zones**: Visual polygon-based zone editor for targeted object detection - define multiple zones per camera with custom class filters and confidence thresholds
- **light-object-detect Integration**: Seamless integration with [light-object-detect](https://github.com/matteius/light-object-detect) API for ONNX/TFLite-based object detection with zone filtering
- **ONVIF Motion Recording**: Automated recording triggered by ONVIF motion detection events
- **Object Detection**: Optional SOD integration for motion and object detection (supports both RealNet and CNN models)

#### 📺 Streaming & Playback
- **WebRTC Streaming**: Ultra-low latency live viewing with automatic NAT/firewall traversal via STUN/ICE
- **HLS Streaming**: Adaptive bitrate streaming for broad device compatibility
- **Dual Streaming Modes**: Toggle between WebRTC (low latency) and HLS (compatibility) on-the-fly
- **Detection Overlays**: Real-time bounding boxes and labels on live streams

#### 🎨 Modern User Interface
- **Customizable Themes**: 7 beautiful color themes (Ocean Blue, Forest Green, Royal Purple, Sunset Rose, Golden Amber, Cool Slate, Default)
- **Dark/Light Mode**: Automatic system preference detection with manual override
- **Color Intensity Control**: Fine-tune theme brightness and contrast to your preference
- **Responsive Design**: Built with Tailwind CSS and Preact for smooth, modern UX

#### 🔧 Core Capabilities
- **Cross-Platform**: Runs on any Linux system, from embedded devices to full servers
- **Memory Efficient**: Optimized to run on devices with low memory (SBCs and certain SoCs)
- **Stream Support**: Handle up to 16 video streams (with memory-optimized buffering)
- **Protocol Support**: RTSP and ONVIF (basic profile)
- **Codec Support**: H.264 (primary), H.265 (if resources permit)
- **Resolution Support**: Up to 1080p per stream (configurable lower resolutions)
- **Frame Rate Control**: Configurable from 1-15 FPS per stream to reduce resource usage
- **Standard Formats**: Records in standard MP4/MKV containers with proper indexing
- **Storage Management**: Automatic retention policies and disk space management
- **Reliability**: Automatic recovery after power loss or system failure
- **Resource Optimization**: Stream prioritization to manage limited RAM

## 🧱 Architecture Overview

LightNVR is built as a small, C-based core service with a modern Preact/Tailwind web UI and go2rtc as the streaming backbone. Object detection is handled by an external detection API (typically `light-object-detect`).

| ![Overall Architecture](docs/images/arch-overall.svg) |
|:------------------------------------------------------:|
| High-level architecture: web UI, API, core, go2rtc and detection service |

At a high level:

- **Web UI & API layer** – Preact single-page UI served by the embedded HTTP server, plus JSON REST endpoints for streams, recordings, detection, and settings.
- **Core service** – Stream manager, recorder, retention logic, configuration store, and event system implemented in C for low memory use.
- **Streaming layer (go2rtc)** – Handles RTSP ingest and provides WebRTC/HLS endpoints. LightNVR configures go2rtc and talks to it directly for `/api/webrtc` and snapshot (`/api/frame.jpeg`) calls.
- **Detection service** – External HTTP API (e.g. `light-object-detect`) that receives frames from go2rtc and returns object detections which LightNVR stores and overlays.
- **Storage & system resources** – MP4/HLS writers, file system, DB, and lightweight threading model tuned for small devices.

For more detail, the repository also includes:

- `docs/images/arch-state.svg` – high-level state machine for streams/recordings
- `docs/images/arch-thread.svg` – thread and worker layout for the core service

## 🆕 What's New in v0.14+

### Detection Zones (v0.14.0)
Visual polygon-based zone editor for precise object detection. Draw custom zones, filter by object class, and set per-zone confidence thresholds. Perfect for reducing false positives and focusing on areas that matter.

### Theme Customization (v0.13.0)
Choose from 7 beautiful color themes with adjustable intensity. Supports both light and dark modes with automatic system preference detection. Make LightNVR match your style!

### Enhanced light-object-detect Integration (v0.14.0)
Seamless integration with modern ONNX and TFLite models. Configurable detection backends (ONNX, TFLite, OpenCV) with zone-aware filtering and direct go2rtc frame extraction for optimal performance.

### WebRTC Improvements (v0.12.6+)
Ultra-low latency streaming with automatic NAT/firewall traversal. Configurable STUN servers and ICE configuration for reliable streaming in complex network environments.


---

## 📹 Demo & Media

Screenshots and videos are automatically generated using Playwright automation. To update documentation media:

```bash
# Install dependencies (one-time)
npm install --save-dev playwright
npx playwright install chromium

# Capture all screenshots and videos
./scripts/update-documentation-media.sh

# Or capture screenshots only
./scripts/update-documentation-media.sh --screenshots-only

# Capture all theme variations
./scripts/update-documentation-media.sh --all-themes
```

See [scripts/README-screenshots.md](scripts/README-screenshots.md) for detailed documentation on the automation system.

> **Note for Contributors**: Screenshots and videos should be generated using the automated scripts to ensure consistency. Manual captures are discouraged unless adding new features not yet covered by automation.

## 💡 Use Cases

LightNVR is perfect for:

- **🏠 Home Security**: Monitor your property with smart detection zones - get alerts only for activity in specific areas
- **🏢 Small Business**: Cost-effective surveillance with professional features like zone-based detection and retention policies
- **🔬 IoT & Edge Computing**: Run on resource-constrained devices (Raspberry Pi, SBCs) with minimal memory footprint
- **🎓 Education & Research**: Learn about video processing, object detection, and real-time streaming with clean, well-documented code
- **🛠️ DIY Projects**: Build custom surveillance solutions with flexible API integration and modern web interface
- **📦 Warehouse & Logistics**: Monitor specific zones (loading docks, storage areas) with class-specific detection (person, forklift, etc.)

## 🆚 Why LightNVR?

| Feature | LightNVR | Traditional NVR | Cloud Solutions |
|---------|----------|-----------------|-----------------|
| **Memory Footprint** | 256MB minimum | 2GB+ typical | N/A (cloud-based) |
| **Detection Zones** | ✅ Visual polygon editor | ❌ Usually grid-based or none | ✅ Varies by provider |
| **Custom Themes** | ✅ 7 themes + intensity control | ❌ Fixed UI | ⚠️ Limited options |
| **WebRTC Streaming** | ✅ Sub-second latency | ⚠️ Often RTSP only | ✅ Usually supported |
| **Object Detection** | ✅ ONNX/TFLite/SOD support | ⚠️ Proprietary or limited | ✅ Usually included |
| **Privacy** | ✅ 100% local, no cloud | ✅ Local | ❌ Data sent to cloud |
| **Cost** | ✅ Free & open-source | 💰 $200-2000+ | 💰 $10-50/month per camera |
| **Customization** | ✅ Full source code access | ❌ Closed source | ❌ Limited to API |
| **Resource Usage** | ✅ Optimized for SBCs | ⚠️ Requires dedicated hardware | N/A |
| **API Integration** | ✅ RESTful API + WebSocket | ⚠️ Varies | ✅ Usually available |

## System Requirements

- **Processor**: Any Linux-compatible processor (ARM, x86, MIPS, etc.)
- **Memory**: 256MB RAM minimum (more recommended for multiple streams)
- **Storage**: Any storage device accessible by the OS
- **Network**: Ethernet or WiFi connection
- **OS**: Linux with kernel 4.4 or newer

## 🌟 Feature Highlights

### Detection Zones - Precision Object Detection

Define custom detection zones with a visual polygon editor. Perfect for monitoring specific areas like doorways, parking spots, or restricted zones while ignoring irrelevant motion.

| ![Detection Zone Editor](docs/images/zone-editor-demo.png) |
|:----------------------------------------------------------:|
| Interactive zone editor with driveway detection zone drawn |

| ![Detection Zones Configuration](docs/images/stream-config-zones.png) |
|:---------------------------------------------------------------------:|
| Detection Zones section in stream configuration                       |

**Key capabilities:**
- Draw unlimited polygons per camera stream
- Per-zone class filtering (e.g., only detect "person" in Zone A, "car" in Zone B)
- Adjustable confidence thresholds per zone
- Color-coded zones for easy identification
- Enable/disable zones without deleting configuration

### Theme Customization - Your Style, Your Way

Choose from 7 professionally designed color themes and fine-tune the intensity to match your environment and preferences.

| ![Theme Selector (Light)](docs/images/theme-selector.png) | ![Theme Selector (Dark)](docs/images/theme-selector-dark.png) |
|:--------------------------------------------------------:|:-----------------------------------------------------------:|
| Theme selector in light mode                             | Theme selector in dark mode                                 |

| ![Ocean Blue Theme](docs/images/theme-blue.png) | ![Emerald Theme](docs/images/theme-emerald.png) | ![Royal Purple Theme](docs/images/theme-purple.png) | ![Sunset Rose Theme](docs/images/theme-rose.png) |
|:-----------------------------------------------:|:------------------------------------------------:|:-------------------------------------------------:|:------------------------------------------------:|
| Ocean Blue                                      | Forest/Emerald Green                            | Royal Purple                                     | Sunset Rose                                      |

**Available themes:**
- 🎨 Default (Neutral Gray)
- 🌊 Ocean Blue
- 🌲 Forest Green
- 👑 Royal Purple
- 🌹 Sunset Rose
- ⚡ Golden Amber
- 🗿 Cool Slate

Each theme supports both light and dark modes with adjustable color intensity (0-100%).

### WebRTC Live Streaming - Ultra-Low Latency

Experience real-time camera feeds with sub-second latency using WebRTC technology. Automatic NAT traversal ensures it works even behind firewalls.

| ![WebRTC Live Streams](docs/images/live-streams.png) | ![HLS Live Streams](docs/images/live-streams-hls.png) |
|:---------------------------------------------------:|:----------------------------------------------------:|
| WebRTC live view with ultra-low latency             | HLS-based live view for compatibility                |

| ![Detection Overlay](docs/images/detection-overlay.png) |
|:-------------------------------------------------------:|
| Real-time detection overlays with bounding boxes        |

**Features:**
- Sub-second latency for real-time monitoring
- Automatic STUN/ICE configuration for NAT traversal
- Seamless fallback to HLS for compatibility
- Real-time detection overlay with bounding boxes
- Grid layout supporting multiple simultaneous streams

### light-object-detect Integration

Powerful object detection using modern ONNX and TFLite models with zone-aware filtering.

**Integration features:**
- Per-stream API endpoint configuration
- Configurable detection backends (ONNX, TFLite, OpenCV)
- Zone-based filtering to reduce false positives
- Track ID and zone ID support for advanced analytics
- Direct go2rtc frame extraction (no FFmpeg overhead)

## Screenshots

| ![Stream Management](docs/images/stream-management.png) | ![Recording Management](docs/images/recording-management.png) |
|:-------------------------------------------------------:|:------------------------------------------------------------:|
| Stream Management                                       | Recording Management                                          |

| ![Recording Playback](docs/images/recording-playback.png) |
|:---------------------------------------------------------:|
| Recording Playback with video player modal                |

| ![Settings Management](docs/images/settings-management.png) | ![System Information](docs/images/system-info.png) |
|:----------------------------------------------------------:|:--------------------------------------------:|
| Settings Management                                         | System Information                            |

### Simplified Installation (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/opensensor/lightnvr.git
   cd lightnvr
   ```

2. **Run the software**:
   ```bash
   # This script builds everything and starts the system locally
   ./run.sh
   ```

The `run.sh` script will automatically:
- Check for required build tools
- Build the C backend and web assets
- Download the necessary `go2rtc` binary
- Set up a local environment in `./local`
- Start the NVR system at `http://localhost:8080`

### Manual Installation

1. **Build from source**:
   ```bash
   # Build web assets (requires Node.js/npm)
   cd web
   npm install
   npm run build
   cd ..

   # Build the software
   ./scripts/build.sh --release

   # Install (requires root)
   sudo ./scripts/install.sh
   ```

2. **Configure**:
   ```bash
   # Edit the configuration file
   sudo nano /etc/lightnvr/lightnvr.ini
   ```

## Documentation

### Getting Started
- [Installation Guide](docs/INSTALLATION.md)
- [Build Instructions](docs/BUILD.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

### Features & Integration
- **[Zone Configuration](docs/ZONE_CONFIGURATION.md)** - Configure detection zones with visual polygon editor
- [API Documentation](docs/API.md)
- [SOD Integration](docs/SOD_INTEGRATION.md)
- [SOD Unified Detection](docs/SOD_UNIFIED_DETECTION.md)
- [ONVIF Detection](docs/ONVIF_DETECTION.md)
- [ONVIF Motion Recording](docs/ONVIF_MOTION_RECORDING.md)
- [Motion Buffer System](docs/MOTION_BUFFER.md)

### Architecture & Development
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Frontend Architecture](docs/FRONTEND.md)
- [Release Process](docs/RELEASE_PROCESS.md) - For maintainers creating releases

## Project Structure

- `src/` - Source code
  - `core/` - Core system components
  - `video/` - Video processing and stream handling
  - `storage/` - Storage management
  - `web/` - Web interface and API handlers
  - `database/` - Database operations
  - `utils/` - Utility functions
- `include/` - Header files
- `scripts/` - Build and utility scripts
- `config/` - Configuration files
- `docs/` - Documentation
- `tests/` - Test suite
- `web/` - Web interface files
  - `css/` - Tailwind CSS stylesheets
  - `js/` - JavaScript and Preact components
  - `*.html` - HTML entry points

## Memory Optimization

LightNVR is specifically designed for memory-constrained environments:

- **Efficient Buffering**: Minimizes memory usage while maintaining reliable recording
- **Stream Prioritization**: Allocates resources based on stream importance
- **Staggered Initialization**: Prevents memory spikes during startup
- **Swap Support**: Optional swap file configuration for additional virtual memory
- **Resource Governors**: Prevents system crashes due to memory exhaustion

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Note:** By contributing to this project, you agree to sign our [Contributor License Agreement (CLA)](CLA.md). The CLA bot will guide you through the process on your first pull request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

### Commercial Licensing

For organizations that need to integrate lightNVR into proprietary products or cannot comply with GPL requirements, **commercial licenses** are available from OpenSensor Engineering. See [Commercial Licensing & Professional Support](docs/COMMERCIAL.md) for details.

## Acknowledgments

LightNVR is built on the shoulders of giants. Special thanks to:

### Core Technologies
- **[FFmpeg](https://ffmpeg.org/)** - Video processing and codec support
- **[go2rtc](https://github.com/AlexxIT/go2rtc)** - WebRTC and RTSP streaming engine
- **[SQLite](https://www.sqlite.org/)** - Efficient embedded database
- **[Mongoose](https://github.com/cesanta/mongoose)** - Embedded web server
- **[cJSON](https://github.com/DaveGamble/cJSON)** - Lightweight JSON parser

### Frontend Stack
- **[Tailwind CSS](https://tailwindcss.com/)** - Modern utility-first CSS framework
- **[Preact](https://preactjs.com/)** - Fast 3kB alternative to React
- **[HLS.js](https://github.com/video-dev/hls.js/)** - JavaScript HLS client

### Detection & AI
- **[light-object-detect](https://github.com/matteius/light-object-detect)** - ONNX/TFLite object detection API
- **[SOD](https://github.com/symisc/sod)** - Embedded computer vision library

### Community
- All contributors who have helped improve LightNVR
- The open-source community for inspiration and support
# new-nvr
