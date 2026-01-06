# Local Testing Guide for ALPR Integration

This guide will help you test the ALPR integration locally before pushing to GitHub.

## Prerequisites

- Python 3.10+ installed
- Node.js installed
- All dependencies installed

## Step-by-Step Testing

### 1. Start the Python ALPR Service

Open a **Terminal Window 1**:

```bash
cd alpr/anpr-set-up

# Activate virtual environment (if not already activated)
source venv/bin/activate

# Start the ALPR service
python app.py
```

**Expected Output:**
```
Initializing ALPR system...
ALPR system initialized successfully!
Starting ALPR web server...
Server starting on http://localhost:5001
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
```

**Note:** First run will download models (may take a few minutes)

**Verify it's running:**
- Open browser: `http://localhost:5001/api/health`
- Should see: `{"status":"ok","alpr_initialized":true}`

---

### 2. Start the Node.js Backend

Open a **Terminal Window 2**:

```bash
cd server

# Install dependencies (if not already done)
npm install

# Check if .env file exists and has ALPR_SERVICE_URL
# If not, create/update .env file:
# ALPR_SERVICE_URL=http://localhost:5001

# Start the backend
npm run dev
```

**Expected Output:**
```
[server] listening on port 4000
```

**Verify it's running:**
- Open browser: `http://localhost:4000/api/health`
- Should see: `{"status":"ok","timestamp":"..."}`

**Test ALPR health endpoint:**
- Open browser: `http://localhost:4000/api/alpr/health`
- Should see: `{"status":"ok","service_available":true}`

---

### 3. Start the Frontend

Open a **Terminal Window 3**:

```bash
# From project root
npm run dev
```

**Expected Output:**
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Verify it's running:**
- Open browser: `http://localhost:5173`
- Should see the login page

---

## Testing the ALPR Integration

### Test 1: Health Check

1. **Backend Health:**
   ```bash
   curl http://localhost:4000/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **ALPR Service Health (via Backend):**
   ```bash
   curl http://localhost:4000/api/alpr/health
   ```
   Should return: `{"status":"ok","service_available":true}`

3. **Direct ALPR Service Health:**
   ```bash
   curl http://localhost:5001/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

---

### Test 2: Frontend UI

1. **Login to the app:**
   - Go to `http://localhost:5173`
   - Login with your credentials

2. **Navigate to ALPR System:**
   - Click "ALPR System" in the sidebar
   - Should see the ALPR page with:
     - Service status indicator (green "Service Online")
     - Image input section
     - Results section

3. **Check Service Status:**
   - Top right should show: ✅ Service Online
   - If red, check that Python service is running

---

### Test 3: Image Upload & Processing

1. **Upload an Image:**
   - Click "Upload Image" button
   - Select an image with a license plate
   - Image preview should appear

2. **Process Image:**
   - Click "Process Image" button
   - Wait for processing (may take 5-10 seconds)
   - Results should appear showing:
     - Detected plate text
     - Confidence score
     - Annotated image with bounding boxes
     - Database match status (if vehicle exists)

3. **Verify Results:**
   - Check that plate text is detected correctly
   - Check confidence scores
   - If vehicle exists in database, should show "In Database" with vehicle info

---

### Test 4: Camera Capture (if available)

1. **Start Camera:**
   - Click "Start Camera" button
   - Allow camera permissions
   - Camera preview should appear

2. **Capture & Process:**
   - Click "Capture & Process"
   - Should capture image and process automatically

3. **Auto Capture:**
   - Click "Auto Capture"
   - Should capture and process every 3 seconds
   - Click again to stop

---

### Test 5: Database Integration

1. **Test with Known Vehicle:**
   - Upload image of a vehicle that exists in your database
   - Should show "In Database" badge
   - Should display vehicle information (permit, parking type, etc.)

2. **Test with Unknown Vehicle:**
   - Upload image of a vehicle NOT in database
   - Should show "Not Found" badge
   - Should still display detected plate text

---

## Troubleshooting

### Issue: ALPR Service Not Starting

**Symptoms:**
- `ModuleNotFoundError` or import errors
- Port 5001 already in use

**Solutions:**
```bash
# Make sure venv is activated
cd alpr/anpr-set-up
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Check if port is in use
lsof -i :5001
# If something is using it, kill it or change port in app.py
```

---

### Issue: Backend Can't Connect to ALPR Service

**Symptoms:**
- `ALPR service is not available` error
- Health check returns `service_available: false`

**Solutions:**
1. **Check ALPR service is running:**
   ```bash
   curl http://localhost:5001/api/health
   ```

2. **Check environment variable:**
   ```bash
   # In server/.env file
   ALPR_SERVICE_URL=http://localhost:5001
   ```

3. **Check CORS (if needed):**
   - ALPR service should have CORS enabled (already in app.py)

---

### Issue: Frontend Shows "Service Offline"

**Symptoms:**
- Red "Service Offline" indicator
- Can't process images

**Solutions:**
1. Check Python ALPR service is running
2. Check backend is running
3. Check browser console for errors
4. Verify API endpoint: `http://localhost:4000/api/alpr/health`

---

### Issue: No Plates Detected

**Symptoms:**
- Image processes but no results
- "No license plates detected" message

**Solutions:**
1. **Try a clearer image:**
   - Good lighting
   - Plate clearly visible
   - Not too blurry

2. **Check image format:**
   - Use JPEG or PNG
   - Not too large (max 10MB)

3. **Check ALPR service logs:**
   - Look at Python terminal for errors
   - Check if models loaded correctly

---

### Issue: Models Not Downloading

**Symptoms:**
- ALPR service starts but models don't load
- `alpr_initialized: false` in health check

**Solutions:**
1. **Check internet connection:**
   - Models download on first run
   - Need active internet

2. **Check disk space:**
   - Models can be large (100MB+)

3. **Manual model download:**
   - Models are cached after first download
   - Check `~/.cache/fast-alpr/` directory

---

## Quick Test Checklist

Before pushing to GitHub, verify:

- [ ] Python ALPR service starts without errors
- [ ] Backend starts and connects to ALPR service
- [ ] Frontend loads and shows ALPR page
- [ ] Service status shows "Online"
- [ ] Can upload and process an image
- [ ] Detected plates show correctly
- [ ] Database matching works (if vehicle exists)
- [ ] Camera capture works (if available)
- [ ] No console errors in browser
- [ ] No errors in backend terminal
- [ ] No errors in Python service terminal

---

## Testing with Sample Images

You can test with the sample image in the ALPR project:
```bash
# Test image is at:
alpr/anpr-set-up/fast-alpr-master/assets/test_image.png
```

Or use any image with a clear license plate.

---

## Environment Variables

Make sure your `server/.env` file has:

```env
# ALPR Service URL (defaults to http://localhost:5001 if not set)
ALPR_SERVICE_URL=http://localhost:5001

# Other required variables...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
# etc...
```

---

## Next Steps After Testing

Once everything works locally:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add ALPR integration"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Deploy:**
   - Deploy Python ALPR service to Render (recommended: Starter plan for Zero Downtime)
   - Update `ALPR_SERVICE_URL` in production environment
   - Deploy backend and frontend as usual

---

## Need Help?

If you encounter issues:

1. Check all three terminals for error messages
2. Check browser console (F12) for frontend errors
3. Verify all services are running on correct ports
4. Check environment variables are set correctly
5. Review the logs in each service

Good luck testing! 🚀

