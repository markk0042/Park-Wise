# Fix ALPR Service Connection - URGENT

## ✅ Good News: ALPR Service is Running!

Your ALPR service is **live and working** at:
- **URL:** `https://park-wise-alpr.onrender.com`
- **Health Check:** ✅ Responding correctly

## ❌ Problem: Backend Can't Connect

Your backend on Render is trying to connect to `http://localhost:5001` instead of the deployed service.

## 🔧 Fix: Set Environment Variable (2 minutes)

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Find your backend service: **parkinglog-backend**
3. Click on it

### Step 2: Add Environment Variable
1. Click **"Environment"** tab (left sidebar)
2. Look for **"ALPR_SERVICE_URL"** in the list
3. If it exists, click to edit it
4. If it doesn't exist, click **"Add Environment Variable"**

5. **Set these values:**
   - **Key:** `ALPR_SERVICE_URL`
   - **Value:** `https://park-wise-alpr.onrender.com`
   - ⚠️ **CRITICAL:** No trailing slash!
   - ✅ Correct: `https://park-wise-alpr.onrender.com`
   - ❌ Wrong: `https://park-wise-alpr.onrender.com/`

6. Click **"Save Changes"**

### Step 3: Redeploy Backend
1. Go to **"Events"** tab (or **"Manual Deploy"**)
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes for deployment

### Step 4: Verify It Works
After deployment completes, test:

```bash
curl https://parkinglog-backend.onrender.com/api/alpr/health
```

**Expected response:**
```json
{"status":"ok","service_available":true}
```

If you see `"service_available":true`, you're done! ✅

---

## Quick Test in Browser

1. Go to: https://park-wise-two.vercel.app
2. Login
3. Navigate to **"ALPR System"**
4. Should show: ✅ **"Service Online"** (green badge in top right)

---

## Troubleshooting

### If health check still fails:

1. **Double-check the environment variable:**
   - Go to backend → Environment tab
   - Verify `ALPR_SERVICE_URL` = `https://park-wise-alpr.onrender.com` (no trailing slash)
   - Make sure you clicked "Save Changes"

2. **Verify backend was redeployed:**
   - Go to backend → Events tab
   - Look for a recent deployment after you set the variable
   - If not, trigger a manual deploy

3. **Check backend logs:**
   - Go to backend → Logs tab
   - Look for errors mentioning "ALPR" or "ECONNREFUSED"
   - Should see successful health checks if working

4. **Test ALPR service directly:**
   ```bash
   curl https://park-wise-alpr.onrender.com/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

---

## Summary

✅ **ALPR Service:** Running at `https://park-wise-alpr.onrender.com`  
⏳ **Backend:** Needs `ALPR_SERVICE_URL` environment variable  
⏳ **Action:** Set variable → Redeploy → Test

You're 2 minutes away from fixing this! 🚀

