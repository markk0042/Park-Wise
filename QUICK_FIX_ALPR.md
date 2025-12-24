# Quick Fix: ALPR Service Not Available

## The Problem

Your backend on Render is trying to connect to `http://localhost:5001`, but the Python ALPR service isn't running there.

## Immediate Solution

You have **2 options**:

### Option 1: Deploy ALPR Service to Render (5 minutes)

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect your GitHub repo**

3. **Configure:**
   - **Name:** `park-wise-alpr`
   - **Root Directory:** `alpr/anpr-set-up` ⚠️ **CRITICAL!**
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`

4. **Deploy and get URL:**
   - Wait for deployment
   - Copy the URL (e.g., `https://park-wise-alpr.onrender.com`)

5. **Update Backend Environment:**
   - Go to your backend service on Render
   - Environment tab
   - Add/Update: `ALPR_SERVICE_URL`
   - Value: `https://park-wise-alpr.onrender.com`
   - **Redeploy backend**

### Option 2: Test Locally First

If you want to test locally before deploying:

1. **Start Python ALPR service locally:**
   ```bash
   cd alpr/anpr-set-up
   source venv/bin/activate
   python app.py
   ```

2. **Update your local backend .env:**
   ```env
   ALPR_SERVICE_URL=http://localhost:5001
   ```

3. **Start backend locally:**
   ```bash
   cd server
   npm run dev
   ```

4. **Test locally first**, then deploy when ready.

---

## After Setting Environment Variable

Once you set `ALPR_SERVICE_URL` in Render:

1. **Redeploy your backend** (or wait for auto-deploy)
2. **Test the connection:**
   ```bash
   curl https://parkinglog-backend.onrender.com/api/alpr/health
   ```
   Should return: `{"status":"ok","service_available":true}`

3. **Try the frontend again** - it should work!

---

## Need Help?

See `DEPLOY_ALPR_SERVICE.md` for detailed deployment instructions.

