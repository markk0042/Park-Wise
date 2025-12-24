# Deploy ALPR Service to Render - Step by Step

## Current Issue

Your backend on Render is trying to connect to the ALPR service, but it's not deployed yet. Follow these steps:

---

## Step 1: Prepare ALPR Service for Deployment

First, let's make sure the ALPR service is ready:

1. **Create Procfile** (if it doesn't exist):
   ```bash
   cd alpr/anpr-set-up
   echo "web: python app.py" > Procfile
   ```

2. **Create runtime.txt** (specify Python version):
   ```bash
   # Check your Python version first
   python3 --version
   # Then create runtime.txt (use the version you have, e.g., python-3.13)
   echo "python-3.13" > runtime.txt
   ```

3. **Verify requirements.txt exists:**
   ```bash
   ls requirements.txt
   # Should show: requirements.txt
   ```

4. **Commit these files:**
   ```bash
   git add alpr/anpr-set-up/Procfile alpr/anpr-set-up/runtime.txt
   git commit -m "Add Procfile and runtime.txt for ALPR deployment"
   git push
   ```

---

## Step 2: Deploy ALPR Service to Render

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Sign in

2. **Create New Web Service:**
   - Click "New +" button (top right)
   - Select "Web Service"

3. **Connect Repository:**
   - Click "Connect account" if needed
   - Select your GitHub repository: `markk0042/Park-Wise`
   - Click "Connect"

4. **Configure the Service:**
   
   **Basic Settings:**
   - **Name:** `park-wise-alpr` (or any name you like)
   - **Region:** Choose closest to you (e.g., Oregon)
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `alpr/anpr-set-up` ⚠️ **CRITICAL - Must be exact!**
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - **Plan:** Free (or Starter if you need always-on)

5. **Environment Variables:**
   - For now, you don't need any special environment variables
   - The service will download models on first run

6. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (first deploy takes 10-15 minutes)
   - Watch the build logs

7. **Get Your Service URL:**
   - Once deployed, you'll see: `https://park-wise-alpr.onrender.com`
   - **Copy this URL!** You'll need it in the next step

---

## Step 3: Update Backend Environment Variable

1. **Go to Your Backend Service:**
   - In Render dashboard, find your backend service (`parkinglog-backend`)
   - Click on it

2. **Go to Environment Tab:**
   - Click "Environment" in the left sidebar
   - Scroll to find `ALPR_SERVICE_URL` (or add it if it doesn't exist)

3. **Add/Update the Variable:**
   - **Key:** `ALPR_SERVICE_URL`
   - **Value:** `https://park-wise-alpr.onrender.com` (use YOUR actual URL)
   - ⚠️ **Important:** No trailing slash!
   - Click "Save Changes"

4. **Redeploy Backend:**
   - Go to "Events" or "Manual Deploy" tab
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or just push a new commit to trigger auto-deploy

---

## Step 4: Verify Everything Works

1. **Test ALPR Service Directly:**
   ```bash
   curl https://park-wise-alpr.onrender.com/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

2. **Test Backend Connection:**
   ```bash
   curl https://parkinglog-backend.onrender.com/api/alpr/health
   ```
   Should return: `{"status":"ok","service_available":true}`

3. **Test in Frontend:**
   - Go to your web app
   - Navigate to "ALPR System"
   - Should show green "Service Online" indicator
   - Try uploading an image

---

## Troubleshooting

### Issue: Build Fails

**Check:**
- Root directory is exactly: `alpr/anpr-set-up`
- `Procfile` exists with: `web: python app.py`
- `requirements.txt` exists
- Python version in `runtime.txt` matches your local version

### Issue: Service Times Out

**Solution:**
- Render free tier spins down after 15 min inactivity
- First request after spin-down takes 30-60 seconds
- Consider upgrading to Starter plan ($7/month) for always-on

### Issue: Models Not Downloading

**Check build logs:**
- Look for errors during model download
- Ensure internet connectivity during build
- Models download on first run (takes time)

### Issue: Backend Still Can't Connect

**Check:**
1. ALPR service URL is correct (no trailing slash)
2. ALPR service is actually running (check Render dashboard)
3. Backend was redeployed after setting environment variable
4. Check backend logs for connection errors

### Issue: Port Already in Use

**Solution:**
- Render automatically assigns a port via `$PORT` environment variable
- Update `app.py` to use: `port = int(os.environ.get('PORT', 5001))`
- This is already in your code, so should work!

---

## Quick Checklist

Before testing:

- [ ] ALPR service deployed to Render
- [ ] ALPR service URL copied
- [ ] `ALPR_SERVICE_URL` set in backend environment
- [ ] Backend redeployed
- [ ] ALPR service health check works
- [ ] Backend ALPR health check works
- [ ] Frontend shows "Service Online"

---

## Next Steps

Once everything is working:

1. **Monitor both services** in Render dashboard
2. **Check logs** if issues occur
3. **Consider upgrading** to Starter plan if you need always-on service
4. **Set up monitoring** for service health

Good luck! 🚀

