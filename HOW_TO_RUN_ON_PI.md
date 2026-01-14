╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║        🥧 How to Run LightNVR on Raspberry Pi                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

## 🎯 QUICK START - 3 Simple Steps:

### Step 1: Install Everything (One Command)
```bash
cd /home/sandhanapandiyan/lightnvr
sudo ./install-complete.sh
```

This installs:
  - All dependencies
  - Compiles LightNVR
  - Builds web interface
  - Sets up auto-boot
  - Everything you need!

Time: 10-15 minutes

---

### Step 2: Start LightNVR
```bash
./run.sh
```

Or use the fix script:
```bash
./pi-fix.sh
```

---

### Step 3: Access Dashboard
Open Chromium browser on Pi:
```
http://localhost:8080/
```

From another device:
```
http://<YOUR_PI_IP>:8080/
```

Done! ✅

---

## 📋 DETAILED INSTRUCTIONS:

### Option A: Fresh Installation (Recommended)

**Use install-complete.sh for everything:**

```bash
# 1. Navigate to LightNVR directory
cd /home/sandhanapandiyan/lightnvr

# 2. Make script executable
chmod +x install-complete.sh

# 3. Run complete installation
sudo ./install-complete.sh
```

**What it does:**
  ✅ Updates system (apt-get update)
  ✅ Installs dependencies (FFmpeg, SQLite, Node.js, etc.)
  ✅ Downloads go2rtc
  ✅ Installs Chromium browser
  ✅ Compiles LightNVR backend
  ✅ Builds web interface
  ✅ Creates systemd service
  ✅ Sets up auto-boot
  ✅ Configures kiosk mode

**After installation:**
  - Script asks if you want to start now
  - Choose Yes → LightNVR starts immediately
  - Choose No → Reboot to start automatically

---

### Option B: Just Compilation (Already Have Dependencies)

**Use compile.sh to rebuild backend only:**

```bash
# 1. Navigate to directory
cd /home/sandhanapandiyan/lightnvr

# 2. Make script executable
chmod +x compile.sh

# 3. Run compilation
./compile.sh
```

**What it does:**
  ✅ Checks dependencies (auto-installs if missing)
  ✅ Cleans previous build (optional)
  ✅ Runs CMake
  ✅ Compiles LightNVR
  ✅ Shows results

---

### Option C: Quick Fix & Restart

**Use pi-fix.sh to restart everything:**

```bash
# 1. Navigate to directory
cd /home/sandhanapandiyan/lightnvr

# 2. Run fix script
./pi-fix.sh
```

**What it does:**
  ✅ Stops any running instances
  ✅ Cleans up locks
  ✅ Starts LightNVR fresh
  ✅ Auto-opens browser
  ✅ Shows access URLs

---

## 🚀 RECOMMENDED WORKFLOW:

### First Time on Pi:

```bash
# Step 1: Clone/copy LightNVR to Pi
cd /home/sandhanapandiyan/lightnvr

# Step 2: Run complete installation
sudo ./install-complete.sh

# Step 3: Wait 10-15 minutes

# Step 4: Choose "Yes" when asked to start

# Step 5: Access at http://localhost:8080/
```

### After First Installation:

**To start/stop:**
```bash
# Start
./lightnvr-control.sh start

# Stop  
./lightnvr-control.sh stop

# Restart
./lightnvr-control.sh restart

# Status
./lightnvr-control.sh status
```

**Or use systemd:**
```bash
sudo systemctl start lightnvr
sudo systemctl stop lightnvr
sudo systemctl restart lightnvr
sudo systemctl status lightnvr
```

---

## 📍 Finding Your Pi's IP Address:

```bash
hostname -I
```

Example output:
```
192.168.1.4 192.168.0.193
```

Access from other devices:
```
http://192.168.1.4:8080/
```

---

## 🔧 Troubleshooting:

### Issue: Missing Dependencies

**Solution:**
```bash
# Install specific library
sudo apt-get install -y libcjson-dev libmbedtls-dev

# Or run compile.sh (auto-installs)
./compile.sh
```

### Issue: Port 8080 Not Listening

**Solution:**
```bash
# Use quick fix script
./pi-fix.sh
```

### Issue: Chromium Not Opening

**Solution:**
```bash
# Open manually
chromium --app=http://localhost:8080/
```

---

## 🎯 Complete Command Reference:

### Installation:
```bash
sudo ./install-complete.sh    # Complete installation
./compile.sh                  # Compile backend only
```

### Running:
```bash
./run.sh                      # Start LightNVR
./pi-fix.sh                   # Fix & restart
./lightnvr-control.sh start   # Start via control script
sudo systemctl start lightnvr # Start via systemd
```

### Control:
```bash
./lightnvr-control.sh status  # Check status
./lightnvr-control.sh logs    # View logs
./lightnvr-control.sh kiosk   # Open kiosk mode
```

---

## ✅ SIMPLE STEP-BY-STEP:

**For a brand new Raspberry Pi:**

1. **Open Terminal on Pi**

2. **Navigate to LightNVR:**
   ```bash
   cd /home/sandhanapandiyan/lightnvr
   ```

3. **Run Installation:**
   ```bash
   sudo ./install-complete.sh
   ```

4. **Wait for completion** (10-15 minutes)

5. **When asked "Start LightNVR now?"**
   - Press `Y` and Enter

6. **Browser opens automatically!**

7. **Done!** 🎉

---

## 🌐 Accessing LightNVR:

**On the Pi itself:**
```
http://localhost:8080/
```

**From your phone/tablet/computer:**
```
http://<PI_IP>:8080/
```

To find Pi IP:
```bash
hostname -I | awk '{print $1}'
```

---

## 🔄 Auto-Start on Boot:

After running `install-complete.sh`, LightNVR will:
  ✅ Start automatically when Pi boots
  ✅ Launch Chromium in fullscreen
  ✅ Show dashboard automatically
  ✅ Never sleep/blank screen

**To disable auto-start:**
```bash
sudo systemctl disable lightnvr
```

**To re-enable:**
```bash
sudo systemctl enable lightnvr
```

---

## 📱 Kiosk Mode (Touchscreen):

Perfect for touchscreen displays:

**Features:**
  - Fullscreen Chromium
  - No toolbars
  - Mouse auto-hides
  - Screen never sleeps
  - On-screen keyboard available

**Manual kiosk launch:**
```bash
./lightnvr-control.sh kiosk
```

---

## 💡 Tips:

**View Logs:**
```bash
tail -f local/log/lightnvr.log
# or
sudo journalctl -u lightnvr -f
```

**Check if Running:**
```bash
ps aux | grep lightnvr
ss -tuln | grep :8080
```

**Restart Everything:**
```bash
./pi-fix.sh
```

---

## 🎊 That's It!

**Simplest way:**
```bash
cd /home/sandhanapandiyan/lightnvr
sudo ./install-complete.sh
# Answer: y (continue)
# Wait 10-15 minutes
# Answer: Y (start now)
# Dashboard opens automatically!
```

**You're done!** 🚀

Access at: http://localhost:8080/
