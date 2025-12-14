# Railway Setup Guide - Step by Step

## Step 1: Delete Render Service (Optional)

**Yes, you can delete it!**

1. Go to Render dashboard
2. Click on your ANPR service
3. Go to "Settings" tab
4. Scroll down to "Danger Zone"
5. Click "Delete Service"
6. Confirm deletion

**Or just leave it** - it won't cost anything if not running, but deleting is cleaner.

## Step 2: Sign Up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)
4. Authorize Railway to access your GitHub

## Step 3: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `Park-Wise-Offical` (or your repo name)
4. Click "Deploy Now"

## Step 4: Add ANPR Service

Railway will detect your repo. Now add the ANPR service:

1. Click "New" → "Service"
2. Select "GitHub Repo"
3. Choose your `Park-Wise-Offical` repository
4. Railway will show configuration options

## Step 5: Configure Service

**Important settings:**

1. **Name**: `anpr-service` (or any name)
2. **Root Directory**: `anpr-service` ⚠️ **CRITICAL!**
3. **Build Command**: Railway auto-detects (should be `pip install -r requirements.txt`)
4. **Start Command**: Railway auto-detects (should be `python anpr.py`)

Railway should auto-detect Python and set these, but verify:
- **Language**: Python
- **Build**: `pip install -r requirements.txt`
- **Start**: `python anpr.py`

## Step 6: Set Resource Limits (Optional)

Railway will auto-allocate resources, but you can set:

1. Go to service → "Settings" → "Resources"
2. **RAM**: Set to 1GB (0.7GB needed, 1GB gives buffer)
3. **CPU**: 0.5 vCPU is fine
4. This ensures you have enough resources

## Step 7: Deploy

Railway will automatically:
1. Clone your repo
2. Install Python dependencies (takes 5-10 minutes first time)
3. Start the service
4. Give you a public URL

**Watch the logs** - you should see:
- Installing dependencies...
- Loading YOLO model...
- Initializing EasyOCR...
- Starting ANPR service...

## Step 8: Get Your Service URL

Once deployed:
1. Click on your service
2. Go to "Settings" → "Networking"
3. **Generate Domain** (if not auto-generated)
4. Copy the URL (e.g., `https://anpr-service-production.up.railway.app`)

## Step 9: Update Backend Configuration

1. Go to your **Render backend** dashboard
2. Go to "Environment" tab
3. Update `ANPR_SERVICE_URL`:
   ```
   ANPR_SERVICE_URL=https://your-railway-url.railway.app
   ```
4. **Save** and **redeploy** backend

## Step 10: Test

1. Open your web app
2. Go to ANPR System page
3. Test camera/upload
4. Should work! ✅

## Quick Checklist

- [ ] Signed up for Railway
- [ ] Created new project from GitHub
- [ ] Added service with root directory `anpr-service`
- [ ] Verified Python auto-detection
- [ ] Set RAM to 1GB (optional but recommended)
- [ ] Service deployed successfully
- [ ] Got Railway service URL
- [ ] Updated backend `ANPR_SERVICE_URL`
- [ ] Tested from web app

## Troubleshooting

### Service won't start
- Check logs in Railway dashboard
- Verify root directory is `anpr-service`
- Check Python version (should auto-detect)

### Out of memory
- Increase RAM in service settings
- Railway allows up to 8GB

### Can't find service URL
- Go to Settings → Networking
- Generate domain if needed

## Cost Estimate

**Monthly cost:**
- 1GB RAM × $10 = $10/month
- $5 credit = -$5
- **Total: ~$5/month** (or less if you use less RAM)

**Much cheaper than Render Standard ($25/month)!**

Ready to start? Let me know if you need help with any step!

