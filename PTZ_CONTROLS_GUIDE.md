# 🎮 PTZ Controls - Complete Implementation Guide

## ✅ STATUS: FULLY IMPLEMENTED & READY TO USE!

---

## 🎯 What's Been Added

### New PTZ Control Panel

A full-featured, professional PTZ control interface with:

✅ **Joystick-style controls** (3x3 grid)
- 8-direction movement (↑ ↓ ← → ↖ ↗ ↙ ↘)
- Center STOP button
- Press & hold to move
- Smooth gradients and animations

✅ **Zoom controls**
- Zoom In (+)
- Zoom Out (-)
- Large, easy-to-press buttons

✅ **Home position management**
- Go to Home
- Set current position as Home

✅ **Preset management**
- Save current position as preset
- List all saved presets
- One-click goto preset
- Custom preset names

✅ **Modern UI**
- Dark gradient theme
- Responsive layout
- Touch-optimized buttons
- Visual feedback
- Status indicators

---

## 📍 How to Access PTZ Controls

### Step 1: Enable PTZ on Stream

1. Go to **Streams** page
2. Edit your camera stream
3. Scroll to **"PTZ Control"** section
4. Enable **"PTZ Control Enabled"** checkbox
5. Save

### Step 2: Open PTZ Panel

1. Go to **Live View** (Dashboard)
2. Look for camera with PTZ enabled
3. Find the ⚡ **PTZ button** (top-right of stream)
4. Click the button
5. PTZ Control Panel opens!

---

## 🎮 PTZ Control Panel Layout

```
╔═══════════════════════════════════════════════════╗
║  PTZ CONTROL                                  ×   ║
║  Camera: front_gate                               ║
╠═══════════════════╦═══════════════════════════════╣
║                   ║                               ║
║  PAN & TILT       ║  PRESETS                      ║
║                   ║                               ║
║  ↖  ↑  ↗          ║  [+ New]                      ║
║  ←  ■  →          ║                               ║
║  ↙  ↓  ↘          ║  ● Front Gate                 ║
║                   ║  ● Parking Lot                ║
║  ZOOM             ║  ● Back Door                  ║
║  [+ Zoom In]      ║                               ║
║  [− Zoom Out]     ║                               ║
║                   ║                               ║
║  HOME POSITION    ║                               ║
║  [Go Home]        ║                               ║
║  [Set Home]       ║                               ║
║                   ║                               ║
╠═══════════════════╩═══════════════════════════════╣
║  💡 Press and hold direction buttons to move      ║
║  ● Moving                                         ║
╚═══════════════════════════════════════════════════╝
```

---

## 🕹️ How to Use PTZ Controls

### Pan & Tilt (Move Camera)

**8-Direction Joystick:**
- ↑ Up
- ↓ Down
- ← Left  
- → Right
- ↖ Up-Left
- ↗ Up-Right
- ↙ Down-Left
- ↘ Down-Right
- ■ STOP (center)

**Usage:**
1. **Press and HOLD** direction button
2. Camera moves in that direction
3. **Release** to stop
4. Click center ■ to stop immediately

### Zoom

**Buttons:**
- **+ Zoom In** - Get closer
- **− Zoom Out** - See wider view

**Usage:**
1. Press and hold zoom button
2. Camera zooms
3. Release to stop

### Home Position

**Go to Home:**
- Click "Go Home" button
- Camera returns to saved home position

**Set Home:**
1. Move camera to desired position
2. Click "Set Home"
3. Current position saved as home

### Presets

**Create New Preset:**
1. Move camera to desired position
2. Click "+ New" button
3. Enter preset name (e.g., "Front Gate")
4. Click "Save"

**Go to Preset:**
- Click on any saved preset
- Camera moves to that position

**Example Presets:**
- "Front Gate"
- "Parking Lot"
- "Back Door"
- "Driveway"
- "Garden View"

---

## 🔧 Backend API Reference

All PTZ APIs are implemented and working:

### Movement Commands
```
POST /api/streams/{name}/ptz/move
Body: { "pan": 0.5, "tilt": 0.3, "zoom": 0.0 }

POST /api/streams/{name}/ptz/stop
```

### Position Commands
```
POST /api/streams/{name}/ptz/absolute
Body: { "pan": 0.5, "tilt": 0.3, "zoom": 1.0 }

POST /api/streams/{name}/ptz/relative
Body: { "pan": 0.1, "tilt": -0.1, "zoom": 0.0 }
```

### Home Position
```
POST /api/streams/{name}/ptz/home       - Go to home
POST /api/streams/{name}/ptz/sethome    - Set home
```

### Presets
```
GET  /api/streams/{name}/ptz/presets    - List presets
POST /api/streams/{name}/ptz/preset     - Go to preset
PUT  /api/streams/{name}/ptz/preset     - Save preset
```

### Capabilities
```
GET  /api/streams/{name}/ptz/capabilities - Get PTZ info
```

---

## ✨ Features

### Visual Feedback

**Movement Status:**
- "○ Idle" - Not moving
- "● Moving" - Camera is moving
- Button highlights when active

**Preset Management:**
- List all saved presets
- One-click access
- Custom naming
- Easy organization

### Touch-Optimized

- Large buttons (64×64px minimum)
- Press & hold interaction
- Touch events supported
- Mobile-friendly

### Professional Design

- Dark gradient theme
- Smooth animations
- Modern iconography
- Responsive layout
- Clear visual hierarchy

---

## 📊 Requirements

### Camera Requirements

✅ ONVIF-compliant PTZ camera
✅ PTZ support enabled in camera
✅ Network connectivity
✅ Valid credentials

### Stream Requirements

✅ PTZ enabled in stream settings
✅ Stream is online and playing
✅ Valid RTSP connection

---

## 🚨 Troubleshooting

### PTZ Button Not Showing

**Check:**
- PTZ enabled in stream settings?
- Stream is playing (green "Active")?
- Camera supports PTZ?

**Fix:**
1. Edit stream
2. Enable "PTZ Control Enabled"
3. Save
4. Refresh page

### PTZ Commands Not Working

**Check:**
- Camera supports ONVIF PTZ?
- PTZ enabled in camera settings?
- Credentials correct?
- Camera firmware up to date?

**Test:**
1. Check camera web interface
2. Verify PTZ works there
3. Check ONVIF PTZ enabled
4. Try in LightNVR

### Presets Not Saving

**Check:**
- Camera supports presets?
- PTZ home position set?
- ONVIF profile configured?

**Fix:**
1. Set home position first
2. Move to desired spot
3. Save preset with name
4. Test by clicking preset

---

## 💡 Best Practices

### Preset Naming

**Good Names:**
- "Front Entrance"
- "Parking Lot View"
- "Back Door"
- "Driveway East"
- "Garden Overview"

**Bad Names:**
- "Preset 1"
- "Test"
- "aaa"

### Using Presets

1. **Create presets for common views**
   - Main entrance
   - Parking areas
   - Loading docks
   - Emergency exits

2. **Use descriptive names**
   - Easy to remember
   - Clear purpose
   - Organized

3. **Test presets regularly**
   - Verify positions
   - Update if needed
   - Remove unused ones

### Movement Tips

- **Short presses** for small adjustments
- **Long press** for continuous movement
- **Release quickly** to stop precisely
- **Use diagonal buttons** for faster positioning

---

## 📝 Logging

All PTZ operations are logged:

```bash
# View PTZ logs
grep "PTZ" local/log/lightnvr.log

# Example logs:
# [INFO] PTZ move command for stream front_gate: pan=0.50, tilt=0.30, zoom=0.00
# [INFO] PTZ stop command for stream front_gate
# [INFO] PTZ goto home for stream front_gate
# [INFO] PTZ set home for stream front_gate
# [INFO] PTZ save preset 'Front Gate' for stream front_gate
# [INFO] PTZ goto preset 'Front Gate' for stream front_gate
```

---

## 🎯 Summary

**PTZ Controls: ✅ COMPLETE**

**What Works:**
- Joystick movement (8 directions)
- Zoom in/out
- Home position
- Preset management
- Modern UI
- Touch support
- Visual feedback
- Error handling

**How to Access:**
1. Enable PTZ on stream
2. Click ⚡ button in live view
3. Use controls

**Backend:** 100% Complete
**Frontend:** 100% Complete
**Testing:** Ready

---

**🎊 Professional PTZ control is now available in LightNVR!**

Just enable PTZ on your camera stream and click the ⚡ button!
