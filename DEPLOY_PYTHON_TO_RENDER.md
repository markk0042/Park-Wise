# Deploy Python ANPR Service to Render

Step-by-step guide to deploy your Python ANPR service to Render.

## Prerequisites

- Render account (sign up at https://render.com if needed)
- GitHub repository with your code (or deploy directly from local)

## Step 1: Prepare Your Code

The Python service is already set up with:
- ✅ `requirements.txt` - Dependencies
- ✅ `Procfile` - Tells Render how to start the service
- ✅ `runtime.txt` - Python version
- ✅ `anpr.py` - Main application

## Step 2: Push to GitHub (If Not Already)

If your code isn't on GitHub yet:

```bash
cd /Users/markkelly/Documents/Park-Wise-Offical
git add anpr-service/
git commit -m "Add ANPR service for Render deployment"
git push origin main
```

## Step 3: Create New Web Service on Render

1. **Log in to Render**
   - Go to https://dashboard.render.com
   - Sign in or create account

2. **Create New Web Service**
   - Click "New +" button (top right)
   - Select "Web Service"

3. **Connect Repository**
   - If first time: Click "Connect account" and authorize GitHub
   - Select your repository: `Park-Wise-Offical` (or your repo name)
   - Click "Connect"

4. **Configure Service**

   **Basic Settings:**
   - **Name**: `park-wise-anpr` (or any name you like)
   - **Region**: Choose closest to your backend (e.g., `Oregon (US West)`)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `anpr-service` ⚠️ **IMPORTANT!**
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python anpr.py`

   **Advanced Settings (Click to expand):**
   - **Instance Type**: `Free` (or upgrade for better performance)
   - **Auto-Deploy**: `Yes` (deploys on every push)

## Step 4: Set Environment Variables

In the Render dashboard, go to "Environment" tab and add:

```
PORT=10000
```

**Note:** Render automatically sets `PORT`, but we include it just in case. The service will use whatever port Render provides.

**Optional (if you want custom YOLO model):**
```
YOLO_MODEL_PATH=license_plate_yolo.pt
```

## Step 5: Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone your repo
   - Install dependencies (this takes 5-10 minutes first time - downloads ~500MB)
   - Start the service
3. Watch the logs - you should see:
   ```
   Loading YOLO model...
   YOLO model loaded: yolov8n.pt
   Initializing EasyOCR...
   EasyOCR ready!
   Starting ANPR service on port 10000...
   ```

## Step 6: Get Your Service URL

Once deployed, Render will give you a URL like:
```
https://park-wise-anpr.onrender.com
```

**Save this URL!** You'll need it for the next step.

## Step 7: Update Backend Configuration

1. Go to your **backend service** on Render (the Node.js one)
2. Click "Environment" tab
3. Add new variable:
   ```
   ANPR_SERVICE_URL=https://park-wise-anpr.onrender.com
   ```
   (Use your actual ANPR service URL)
4. Click "Save Changes"
5. **Redeploy** your backend service

## Step 8: Test the Service

### Test Health Endpoint

Open in browser:
```
https://park-wise-anpr.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "ocr_ready": true
}
```

### Test from Your Backend

Your backend should now be able to call:
```
POST https://park-wise-anpr.onrender.com/process
```

## Important Notes

### Free Tier Limitations

- **Spins down after 15 minutes of inactivity**
- **First request after spin-down takes ~30 seconds** (cold start)
- **512MB RAM limit** - May need to upgrade for better performance
- **Consider upgrading** if you need:
  - Always-on service (no spin-down)
  - More RAM for faster processing
  - Better performance

### Performance Tips

1. **First request is slow** - Models load on first use (~10-15 seconds)
2. **Subsequent requests are faster** - Models stay in memory
3. **Image size matters** - Smaller images = faster processing
4. **Consider upgrading** if processing >100 images/day

### Troubleshooting

**Service won't start:**
- Check logs in Render dashboard
- Verify `requirements.txt` is correct
- Check Python version in `runtime.txt`

**"Service unavailable" errors:**
- Service might be spinning up (wait 30 seconds)
- Check service logs for errors
- Verify `ANPR_SERVICE_URL` is correct in backend

**Slow responses:**
- Normal on free tier (limited resources)
- First request always slow (model loading)
- Consider upgrading instance type

**Out of memory errors:**
- Free tier has 512MB limit
- Upgrade to paid tier for more RAM
- Or optimize image sizes before sending

## Alternative: Use Render's Background Worker

If you want a background worker instead of web service:

1. Create "Background Worker" instead of "Web Service"
2. Same configuration
3. No public URL (only accessible from your backend)
4. Better for internal services

## Cost Estimate

**Free Tier:**
- ✅ Free forever
- ⚠️ Spins down after inactivity
- ⚠️ Limited resources

**Starter Plan ($7/month):**
- Always on
- 512MB RAM
- Better performance

**Standard Plan ($25/month):**
- Always on
- 2GB RAM
- Much faster

## Next Steps

1. ✅ Python service deployed to Render
2. ✅ Backend updated with `ANPR_SERVICE_URL`
3. ✅ Test web app - should work now!
4. ✅ Add Android integration code

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Created Web Service on Render
- [ ] Set root directory to `anpr-service`
- [ ] Set build command: `pip install -r requirements.txt`
- [ ] Set start command: `python anpr.py`
- [ ] Service deployed successfully
- [ ] Got service URL
- [ ] Updated backend `ANPR_SERVICE_URL`
- [ ] Tested health endpoint
- [ ] Tested from web app

## Need Help?

**Common Issues:**

1. **"Module not found"** - Check `requirements.txt` has all dependencies
2. **"Port already in use"** - Render handles this automatically
3. **"Service timeout"** - First request takes time (model loading)
4. **"Out of memory"** - Upgrade instance type or optimize

**Check Logs:**
- Render dashboard → Your service → Logs tab
- Look for error messages
- First deployment takes 5-10 minutes (downloading models)

Your Python service should now be live on Render! 🚀

