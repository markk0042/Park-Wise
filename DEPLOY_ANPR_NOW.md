# Deploy ANPR to Your Existing Web & Android Apps

Quick guide to get ANPR working on your **already deployed** apps.

## Your Current Setup

- ✅ **Web App**: https://park-wise-two.vercel.app (Vercel)
- ✅ **Backend**: https://parkinglog-backend.onrender.com (Render)
- ✅ **Android App**: Already deployed

## Step 1: Deploy Python ANPR Service

You need to deploy the Python service somewhere. Options:

### Option A: Same Server as Backend (Render)

**If Render supports Python:**
1. Create new Python service on Render
2. Point to `anpr-service` directory
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python anpr.py`
5. Note the URL (e.g., `https://anpr-service.onrender.com`)

### Option B: Separate Server (Recommended)

**Use a service like:**
- **Railway** (easy Python deployment)
- **Heroku** (if you have account)
- **DigitalOcean** (Droplet)
- **AWS/GCP/Azure** (if you have accounts)

**Quick Railway Setup:**
1. Sign up at railway.app
2. New Project → Deploy from GitHub
3. Select `anpr-service` directory
4. Railway auto-detects Python
5. Deploys automatically
6. Get URL: `https://your-app.railway.app`

### Option C: Run on Your Own Server

If you have a VPS/server:
```bash
# SSH into server
cd /path/to/anpr-service
pip3 install -r requirements.txt
python3 anpr.py
# Or use PM2/systemd to keep it running
```

## Step 2: Update Backend Environment Variables

### On Render Dashboard:

1. Go to your backend service
2. Click "Environment" tab
3. Add new variable:
   ```
   ANPR_SERVICE_URL=https://your-python-service-url.com
   ```
4. **Redeploy** the backend

### Also Install axios:

If not already installed, add to `server/package.json`:
```json
"dependencies": {
  "axios": "^1.6.0"
}
```

Then redeploy.

## Step 3: Verify Web App Works

1. **Web app already has ANPR page** ✅
2. Open: https://park-wise-two.vercel.app
3. Log in as admin
4. Click "ANPR System" in sidebar
5. Test camera/upload

**If it doesn't work:**
- Check browser console for errors
- Verify backend has `ANPR_SERVICE_URL` set
- Check backend logs on Render

## Step 4: Add to Android App

### 4.1 Add Dependencies

In your Android app's `build.gradle`:

```gradle
dependencies {
    // HTTP client
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Camera (if not already)
    implementation 'androidx.camera:camera-core:1.3.0'
    implementation 'androidx.camera:camera-camera2:1.3.0'
    implementation 'androidx.camera:camera-lifecycle:1.3.0'
    implementation 'androidx.camera:camera-view:1.3.0'
}
```

### 4.2 Add Permissions

In `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 4.3 Create API Client

See `INTEGRATE_ANPR_WEB_ANDROID.md` for full Kotlin/Java code.

**Quick version - Add to your existing API client:**

```kotlin
// Add this method to your existing API client class
fun processANPR(imageBase64: String): AnprResult {
    val url = "${baseUrl}/api/anpr/process"
    
    val json = JSONObject()
    json.put("image", "data:image/jpeg;base64,$imageBase64")
    
    val request = Request.Builder()
        .url(url)
        .post(json.toString().toRequestBody("application/json".toMediaType()))
        .addHeader("Authorization", "Bearer ${getAuthToken()}")
        .build()
    
    val response = httpClient.newCall(request).execute()
    return parseAnprResponse(response.body?.string() ?: "")
}
```

### 4.4 Add ANPR Screen

1. Create new Activity/Fragment for ANPR
2. Add camera preview
3. Add capture button
4. Call API on capture
5. Display results

**See `INTEGRATE_ANPR_WEB_ANDROID.md` for complete code.**

### 4.5 Add Navigation

Add ANPR button/menu item in your main activity:
```kotlin
// In your main activity
findViewById<Button>(R.id.anprButton).setOnClickListener {
    startActivity(Intent(this, AnprActivity::class.java))
}
```

## Step 5: Test Everything

### Test Web App:
1. ✅ Open web app
2. ✅ Navigate to ANPR
3. ✅ Test camera
4. ✅ Verify results

### Test Android App:
1. ✅ Build and install
2. ✅ Open ANPR screen
3. ✅ Grant camera permissions
4. ✅ Capture image
5. ✅ Verify API call
6. ✅ Check results

## Quick Checklist

**Backend:**
- [ ] Python service deployed and running
- [ ] `ANPR_SERVICE_URL` set in Render environment
- [ ] `axios` installed in backend
- [ ] Backend redeployed

**Web App:**
- [ ] Already has ANPR page (done ✅)
- [ ] Test in browser
- [ ] Verify camera works

**Android App:**
- [ ] Dependencies added
- [ ] Permissions added
- [ ] API client method added
- [ ] ANPR screen created
- [ ] Navigation added
- [ ] Tested on device

## API Endpoints (For Reference)

**Your backend already exposes:**

```
POST /api/anpr/process
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
  {
    "image": "data:image/jpeg;base64,..."
  }
Response:
  {
    "success": true,
    "detections": [...],
    "vehicles": [...],
    "summary": {...}
  }
```

```
GET /api/anpr/health
Response:
  {
    "status": "healthy",
    "serviceAvailable": true
  }
```

## Troubleshooting

### Web App: "ANPR service is not available"
- Check Python service is running
- Verify `ANPR_SERVICE_URL` in Render
- Check backend logs

### Android: Network errors
- Verify backend URL is correct
- Check auth token is valid
- Ensure HTTPS (required)

### Android: Camera not working
- Check permissions granted
- Test on physical device
- Verify manifest permissions

## Need Help?

1. **Check backend logs** on Render dashboard
2. **Check Python service logs** (wherever deployed)
3. **Check browser console** for web app errors
4. **Check Android logcat** for mobile errors

## Next Steps After Setup

1. **Monitor performance** - Check response times
2. **Optimize images** - Compress before sending
3. **Add error handling** - Better user feedback
4. **Add caching** - Cache results for same images
5. **Add analytics** - Track usage

Your apps are ready! Just deploy the Python service and update the backend config.

