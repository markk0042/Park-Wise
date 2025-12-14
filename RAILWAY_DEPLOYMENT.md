# Deploy ANPR Service to Railway

Railway is a great alternative to Render - better free tier and easier setup!

## Railway Plans

### Hobby Plan (Free Tier)
- **$5 free credit/month** (usually enough for small services)
- **512MB RAM** (same as Render free, but better CPU)
- **Pay-as-you-go** after $5 credit
- **No spin-down** (always on!)

### Developer Plan ($5/month)
- **1GB RAM** ✅ **MIGHT BE ENOUGH**
- **Better CPU**
- **Always on**

### Pro Plan ($20/month)
- **2GB RAM** ✅ **DEFINITELY ENOUGH**
- **Best performance**

## Will Hobby Plan Work?

**Probably not** - 512MB is still too small for EasyOCR + YOLO.

**But:** Railway's free tier is better because:
- ✅ No spin-down (always on)
- ✅ Better CPU allocation
- ✅ $5 free credit (can try Developer plan for free first month)

## Recommendation

**Start with Railway Hobby (free):**
1. Deploy and test
2. If out of memory → upgrade to Developer ($5/month) for 1GB RAM
3. If still not enough → Pro ($20/month) for 2GB RAM

**Or go straight to Developer ($5/month)** - 1GB RAM might work with optimized code!

## How to Deploy to Railway

### Step 1: Sign Up
1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `Park-Wise-Offical` repository
4. Railway will detect it's a monorepo

### Step 3: Configure Service
1. Railway will show you services to deploy
2. Click "Add Service" → "GitHub Repo"
3. Select your repo
4. **Set Root Directory:** `anpr-service` ⚠️ IMPORTANT
5. Railway auto-detects Python

### Step 4: Set Environment Variables (Optional)
- `PORT` - Railway sets this automatically
- `YOLO_MODEL_PATH` - Only if you have custom model

### Step 5: Deploy
Railway will:
- Auto-detect Python
- Install dependencies
- Start the service
- Give you a public URL

### Step 6: Update Backend
In your Render backend, update:
```
ANPR_SERVICE_URL=https://your-service.railway.app
```

## Railway vs Render

| Feature | Railway Free | Render Free |
|---------|-------------|-------------|
| RAM | 512MB | 512MB |
| Spin-down | ❌ No (always on!) | ✅ Yes (15 min) |
| CPU | Better | Limited |
| Free Credit | $5/month | $0 |
| Cost after | Pay-as-you-go | Free forever |

## My Recommendation

**Try Railway Hobby (free) first:**
- Deploy and test
- If it works → great! (unlikely but possible)
- If out of memory → upgrade to Developer ($5/month) for 1GB

**Or go straight to Developer ($5/month):**
- 1GB RAM might work with optimized code
- Only $5/month (cheaper than Render Standard $25)
- Always-on service

**Best value:** Railway Developer ($5/month) with 1GB RAM!

## Quick Setup Checklist

- [ ] Sign up at railway.app
- [ ] Create new project from GitHub
- [ ] Set root directory to `anpr-service`
- [ ] Deploy (auto-detects Python)
- [ ] Get service URL
- [ ] Update backend `ANPR_SERVICE_URL`
- [ ] Test from web app

Railway is often easier than Render - give it a try! 🚂

