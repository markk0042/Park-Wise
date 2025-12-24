# Deploy ALPR Service to Production

Your backend is deployed on Render, but it needs to connect to the Python ALPR service. Here's how to deploy it.

## Option 1: Deploy ALPR Service to Render (Recommended)

### Step 1: Prepare for Deployment

1. **Create a Procfile** (if not exists):
   ```bash
   cd alpr/anpr-set-up
   echo "web: python app.py" > Procfile
   ```

2. **Create a runtime.txt** (specify Python version):
   ```bash
   echo "python-3.13" > runtime.txt
   # Or use: python-3.11, python-3.12, etc.
   ```

3. **Check requirements.txt exists:**
   ```bash
   # Should already exist at: alpr/anpr-set-up/requirements.txt
   ```

### Step 2: Deploy to Render

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Repository:**
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service:**
   - **Name:** `park-wise-alpr` (or any name)
   - **Root Directory:** `alpr/anpr-set-up` ⚠️ **IMPORTANT!**
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`
   - **Plan:** Free (or paid if needed)

4. **Environment Variables:**
   - No special variables needed for basic setup
   - The service will download models on first run

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (first deploy may take 10-15 minutes)

6. **Get the URL:**
   - Once deployed, you'll get a URL like: `https://park-wise-alpr.onrender.com`
   - Note this URL!

### Step 3: Update Backend Environment Variable

1. **Go to your Backend Service on Render:**
   - https://dashboard.render.com
   - Click on your backend service (`parkinglog-backend`)

2. **Go to Environment:**
   - Click "Environment" tab
   - Find or add: `ALPR_SERVICE_URL`
   - Set value to: `https://your-alpr-service.onrender.com`
   - Example: `https://park-wise-alpr.onrender.com`

3. **Redeploy Backend:**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or push a new commit to trigger auto-deploy

### Step 4: Verify

1. **Test ALPR Service:**
   ```bash
   curl https://your-alpr-service.onrender.com/api/health
   ```
   Should return: `{"status":"ok","alpr_initialized":true}`

2. **Test Backend Connection:**
   ```bash
   curl https://parkinglog-backend.onrender.com/api/alpr/health
   ```
   Should return: `{"status":"ok","service_available":true}`

---

## Option 2: Deploy to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your repository

### Step 2: Add Python Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. **Configure:**
   - **Root Directory:** `alpr/anpr-set-up`
   - **Start Command:** `python app.py`
   - Railway will auto-detect Python

### Step 3: Get URL and Update Backend

1. Railway will provide a URL like: `https://alpr-production.up.railway.app`
2. Update `ALPR_SERVICE_URL` in your backend environment

---

## Option 3: Use Existing VPS (OVH)

If you have the OVH VPS from before:

1. **SSH into VPS:**
   ```bash
   ssh root@54.37.18.249
   ```

2. **Navigate to ALPR:**
   ```bash
   cd /opt/Park-Wise/alpr/anpr-set-up
   # Or wherever you placed it
   ```

3. **Start Service:**
   ```bash
   source venv/bin/activate
   python app.py
   ```

4. **Keep it running (use screen/tmux):**
   ```bash
   # Install screen if needed
   apt-get install screen
   
   # Start in screen
   screen -S alpr
   source venv/bin/activate
   python app.py
   # Press Ctrl+A then D to detach
   ```

5. **Update Backend:**
   - Set `ALPR_SERVICE_URL=http://54.37.18.249:5001`
   - Make sure port 5001 is open in firewall

---

## Quick Fix: Test Locally First

If you want to test locally before deploying:

1. **Update your local backend .env:**
   ```env
   ALPR_SERVICE_URL=http://localhost:5001
   ```

2. **Start services locally:**
   - Terminal 1: Python ALPR service (`python app.py`)
   - Terminal 2: Backend (`npm run dev`)
   - Terminal 3: Frontend (`npm run dev`)

3. **Test locally first**, then deploy when ready.

---

## Troubleshooting

### Issue: Render deployment fails

**Check:**
- Root directory is correct: `alpr/anpr-set-up`
- `requirements.txt` exists
- `Procfile` exists with: `web: python app.py`
- Python version in `runtime.txt` matches your local version

### Issue: Models not downloading

**Solution:**
- First deployment takes longer (models download)
- Check build logs for errors
- Ensure internet connectivity during build

### Issue: Service times out

**Solution:**
- Render free tier spins down after 15 min inactivity
- Consider paid tier for always-on
- Or use Railway/Railway free tier

### Issue: Backend still can't connect

**Check:**
1. ALPR service URL is correct in Render environment
2. No trailing slash: `https://service.onrender.com` (not `https://service.onrender.com/`)
3. Service is actually running (check Render dashboard)
4. Redeploy backend after setting environment variable

---

## Recommended Setup

For production, I recommend:

1. **Deploy ALPR to Render** (easiest)
2. **Set environment variable** in backend
3. **Test the connection**
4. **Monitor both services**

Good luck! 🚀

