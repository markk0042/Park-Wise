# Update Backend to Use ALPR Service

## ✅ ALPR Service is Live!

Your ALPR service is deployed at: **https://park-wise-alpr.onrender.com**

## Next Step: Update Backend Environment Variable

### Step 1: Go to Backend Service on Render

1. Go to https://dashboard.render.com
2. Find your backend service: **parkinglog-backend**
3. Click on it

### Step 2: Add Environment Variable

1. Click **"Environment"** tab (left sidebar)
2. Scroll down to find **"ALPR_SERVICE_URL"** (or click "Add Environment Variable" if it doesn't exist)
3. **Key:** `ALPR_SERVICE_URL`
4. **Value:** `https://park-wise-alpr.onrender.com`
   - ⚠️ **Important:** No trailing slash!
   - ✅ Correct: `https://park-wise-alpr.onrender.com`
   - ❌ Wrong: `https://park-wise-alpr.onrender.com/`
5. Click **"Save Changes"**

### Step 3: Redeploy Backend

1. Go to **"Events"** or **"Manual Deploy"** tab
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete (2-3 minutes)

### Step 4: Test Connection

After backend redeploys, test:

```bash
curl https://parkinglog-backend.onrender.com/api/alpr/health
```

Should return:
```json
{"status":"ok","service_available":true}
```

### Step 5: Test in Frontend

1. Go to your web app: https://park-wise-two.vercel.app
2. Login
3. Navigate to **"ALPR System"**
4. Should show: ✅ **"Service Online"** (green)
5. Try uploading an image!

---

## Troubleshooting

### If health check fails:

1. **Check ALPR service is running:**
   ```bash
   curl https://park-wise-alpr.onrender.com/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

2. **Check environment variable:**
   - Make sure `ALPR_SERVICE_URL` is set correctly
   - No trailing slash
   - Backend was redeployed after setting variable

3. **Check backend logs:**
   - Go to backend service → "Logs" tab
   - Look for connection errors

---

## Summary

✅ ALPR Service: https://park-wise-alpr.onrender.com (LIVE)
⏳ Backend: Needs `ALPR_SERVICE_URL` environment variable
⏳ Frontend: Will work after backend is updated

You're almost there! 🚀

