# Render Deployment Error Troubleshooting

## Those WebSocket Errors Are NOT Your Problem! ✅

The errors you're seeing:
```
WebSocket connection to 'wss://nexus-websocket-a.intercom.io/...'
```

**These are from Intercom** (Render's chat/support widget), NOT your deployment!

**They are:**
- ❌ Not related to your ANPR service
- ❌ Not causing deployment failures
- ✅ Just browser console noise from Intercom widget
- ✅ Can be safely ignored

## How to Find the REAL Error

### Step 1: Check Render's Build Logs

1. **In Render Dashboard:**
   - Go to your service
   - Click on **"Logs"** tab (or "Events" tab)
   - Look for **red error messages**
   - Scroll to see the full error

2. **Look for errors like:**
   - `ModuleNotFoundError`
   - `ImportError`
   - `Build failed`
   - `Command failed`
   - `Port already in use`
   - `Permission denied`

### Step 2: Check Build Status

1. **In Render Dashboard:**
   - Look at the top of your service page
   - See if it says:
     - ✅ "Live" (deployed successfully)
     - ⚠️ "Build failed" (check logs)
     - 🔄 "Building..." (still deploying)

### Step 3: Common Deployment Errors

#### Error: "Module not found" or "ImportError"
**Fix:** Check `requirements.txt` has all dependencies

#### Error: "Command failed: pip install"
**Fix:** 
- Check Python version compatibility
- Some packages might need specific versions
- Check build logs for specific package error

#### Error: "Port already in use"
**Fix:** Render handles this automatically - shouldn't happen

#### Error: "Build timeout"
**Fix:** 
- First build takes 5-10 minutes (downloading models)
- Be patient, it's normal
- If it times out, try again

#### Error: "Root directory not found"
**Fix:** 
- Make sure "Root Directory" is set to: `anpr-service`
- Not the repo root!

## Quick Checklist

- [ ] Ignore Intercom WebSocket errors (they're harmless)
- [ ] Check Render dashboard "Logs" tab for real errors
- [ ] Verify "Root Directory" is `anpr-service`
- [ ] Verify "Build Command" is `pip install -r requirements.txt`
- [ ] Verify "Start Command" is `python anpr.py`
- [ ] Check if build is still running (first build takes 5-10 min)

## What to Look For in Logs

**Good signs:**
```
Installing dependencies...
Successfully installed...
Loading YOLO model...
YOLO model loaded: yolov8n.pt
Initializing EasyOCR...
EasyOCR ready!
Starting ANPR service on port 10000...
```

**Bad signs:**
```
ERROR: Could not find a version...
ModuleNotFoundError: No module named...
Command failed: pip install...
Build failed
```

## Next Steps

1. **Open Render Dashboard**
2. **Go to your service**
3. **Click "Logs" tab**
4. **Copy the actual error message**
5. **Share it with me** - I'll help fix it!

The Intercom errors are just noise - the real error is in Render's logs! 🔍

