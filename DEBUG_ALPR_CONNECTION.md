# Debug ALPR Connection Issue

## Current Status

✅ **ALPR Service:** Working at `https://park-wise-alpr.onrender.com`  
❌ **Backend Connection:** Failing - returns `service_available: false`

## The Problem

The backend on Render can't connect to the ALPR service. This is almost always because the `ALPR_SERVICE_URL` environment variable isn't set correctly.

## Step-by-Step Fix

### Step 1: Verify Environment Variable on Render

1. Go to: https://dashboard.render.com
2. Click on your **backend service** (parkinglog-backend)
3. Click **"Environment"** tab (left sidebar)
4. Look for `ALPR_SERVICE_URL` in the list

**What to check:**
- ✅ **Key:** `ALPR_SERVICE_URL` (exact spelling, case-sensitive)
- ✅ **Value:** `https://park-wise-alpr.onrender.com` (no trailing slash)
- ❌ **Wrong:** `http://localhost:5001` (this is the default)
- ❌ **Wrong:** `https://park-wise-alpr.onrender.com/` (trailing slash)

### Step 2: If Variable is Missing or Wrong

1. Click **"Add Environment Variable"** (or edit existing)
2. Set:
   - **Key:** `ALPR_SERVICE_URL`
   - **Value:** `https://park-wise-alpr.onrender.com`
3. Click **"Save Changes"**

### Step 3: Redeploy Backend (CRITICAL!)

**You MUST redeploy after changing environment variables!**

1. Go to **"Events"** tab (or **"Manual Deploy"**)
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes for deployment

### Step 4: Check Backend Logs

After redeployment, check the logs:

1. Go to backend service → **"Logs"** tab
2. Look for this line (should appear on startup):
   ```
   [ALPR Service] ALPR_SERVICE_URL configured as: https://park-wise-alpr.onrender.com
   ```

**If you see:**
- ✅ `https://park-wise-alpr.onrender.com` → Variable is set correctly
- ❌ `http://localhost:5001` → Variable is NOT set, go back to Step 2

### Step 5: Test Health Check

After redeployment, test:

```bash
curl https://parkinglog-backend.onrender.com/api/alpr/health
```

**Expected response:**
```json
{"status":"ok","service_available":true}
```

**If still failing:**
- Check backend logs for error messages
- Look for `[ALPR Health]` log entries
- Check if there are connection timeout errors

---

## Common Issues

### Issue 1: Variable Set But Not Redeployed
**Symptom:** Variable is set in Render, but health check still fails  
**Fix:** You MUST redeploy after setting environment variables. Render doesn't apply them to running instances.

### Issue 2: Typo in Variable Name
**Symptom:** Variable exists but backend still uses default  
**Fix:** Check exact spelling: `ALPR_SERVICE_URL` (all caps, underscores)

### Issue 3: Trailing Slash
**Symptom:** Connection errors or 404s  
**Fix:** Remove trailing slash: `https://park-wise-alpr.onrender.com` (not `/`)

### Issue 4: ALPR Service Sleeping (Free Tier)
**Symptom:** Timeout errors  
**Fix:** The ALPR service on Render free tier sleeps after 15 minutes. First request may take 30-60 seconds to wake it up. This is normal.

---

## Verify Everything is Working

1. ✅ Backend logs show: `ALPR_SERVICE_URL configured as: https://park-wise-alpr.onrender.com`
2. ✅ Health check returns: `{"status":"ok","service_available":true}`
3. ✅ Web app shows: "Service Online" (green badge)
4. ✅ Can upload/scan images successfully

---

## Still Not Working?

If you've verified all steps above and it's still not working:

1. **Check backend logs** for specific error messages
2. **Test ALPR service directly:**
   ```bash
   curl https://park-wise-alpr.onrender.com/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

3. **Check if ALPR service is sleeping:**
   - Free tier services sleep after 15 minutes
   - First request may take 30-60 seconds
   - This is normal behavior

4. **Share backend logs** - Look for `[ALPR Health]` entries to see what's happening

