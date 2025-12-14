# ANPR Quick Start Guide

## Getting ANPR Working on Your Web App (Right Now)

### Step 1: Install Python Dependencies

Open a terminal and run:

```bash
cd /Users/markkelly/Documents/Park-Wise-Offical/anpr-service
pip3 install -r requirements.txt
```

**Note:** This will download ~500MB of models the first time (EasyOCR language models). This is normal and only happens once.

### Step 2: Start the Python ANPR Service

Keep the terminal open and run:

```bash
python3 anpr.py
```

You should see:
```
Loading YOLO model...
YOLO model loaded: yolov8n.pt
Initializing EasyOCR...
EasyOCR ready!
Starting ANPR service on port 5000...
 * Running on http://0.0.0.0:5000
```

**Keep this terminal window open** - the service needs to keep running.

### Step 3: Install Backend Dependency

Open a **new terminal window** and run:

```bash
cd /Users/markkelly/Documents/Park-Wise-Offical/server
npm install axios
```

### Step 4: Configure Backend Environment

Check if you have a `.env` file in the `server` directory:

```bash
cd /Users/markkelly/Documents/Park-Wise-Offical/server
ls -la .env
```

If the file exists, add this line:
```env
ANPR_SERVICE_URL=http://localhost:5000
```

If the file doesn't exist, create it:
```bash
touch .env
echo "ANPR_SERVICE_URL=http://localhost:5000" >> .env
```

### Step 5: Restart Your Backend Server

If your backend is already running, restart it:

```bash
cd /Users/markkelly/Documents/Park-Wise-Offical/server
# Stop the current server (Ctrl+C), then:
npm run dev
```

### Step 6: Test on Web App

1. **Open your web app** in a browser (make sure it's running)
2. **Log in as an admin**
3. **Look for "ANPR System"** in the sidebar menu
4. **Click on it**
5. **Click "Start Camera"** - grant camera permissions when prompted
6. **Point camera at a license plate** (or use a photo)
7. **Click "Capture & Process"**

You should see detection results!

## Troubleshooting

### "ANPR service is not available"
- Make sure the Python service is running (Step 2)
- Check the terminal shows "Running on http://0.0.0.0:5000"
- Verify `ANPR_SERVICE_URL=http://localhost:5000` is in `server/.env`

### "Could not access camera"
- Grant camera permissions in your browser
- Try Chrome or Firefox (best support)
- On Mac: System Settings > Privacy & Security > Camera > Allow browser access

### Python errors
- Make sure you're using Python 3.8+
- Check: `python3 --version`
- Try: `pip3 install --upgrade pip` then reinstall requirements

### Backend can't connect
- Check both services are running:
  - Python service on port 5000
  - Node.js backend on its port
- Test connection: Open `http://localhost:5000/health` in browser (should show JSON)

## Mobile App Integration (Future)

For mobile app integration, you have two options:

### Option 1: Use Web App in Mobile Browser (Easiest)
- The web app already works on mobile browsers
- Camera access works on mobile Safari/Chrome
- No additional setup needed!

### Option 2: Native Mobile App (React Native/Flutter)
You'll need to:

1. **Create a mobile app** (React Native, Flutter, etc.)
2. **Use the same backend API** (`/api/anpr/process`)
3. **Capture images** using mobile camera APIs
4. **Send base64 images** to the backend
5. **Display results** in the mobile UI

The backend API is already mobile-ready - it accepts base64 images which work from any platform.

### Mobile-Specific Considerations

- **Camera Permissions**: Request camera permissions in app manifest
- **Image Compression**: Compress images before sending (reduce size)
- **Offline Mode**: Consider caching detections when offline
- **Performance**: Mobile may be slower - consider image resizing

## Production Deployment

When deploying to production:

1. **Deploy Python service** separately (Docker recommended)
2. **Update `ANPR_SERVICE_URL`** to production URL
3. **Use HTTPS** for camera access (required by browsers)
4. **Add authentication** to Python service endpoints
5. **Monitor performance** and scale as needed

## Quick Test Without Camera

You can test with an uploaded image:

1. Go to ANPR page
2. Click "Upload Image"
3. Select a photo with a license plate
4. System will process and show results

This works even if camera access is denied!

