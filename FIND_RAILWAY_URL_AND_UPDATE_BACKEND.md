# Find Railway URL & Update Backend - Step by Step

## Part 1: Find Your Railway Service URL

### Step 1: Go to Your Railway Service
1. In Railway dashboard, click on your service (the one you just configured)
2. You should see tabs at the top: **Settings**, **Deployments**, **Metrics**, etc.

### Step 2: Find the URL
**Option A: Settings Tab**
1. Click **"Settings"** tab
2. Scroll down to **"Networking"** section
3. Under **"Public Networking"**, you should see:
   - A domain like: `https://your-service-name.up.railway.app`
   - Or a button that says **"Generate Domain"** (click it if you see this)

**Option B: Service Overview**
1. On the main service page (not in Settings)
2. Look at the top of the page
3. You might see the URL displayed there
4. Or look for a **"Networking"** or **"Domains"** section

**Option C: Deployments Tab**
1. Click **"Deployments"** tab
2. Click on the latest deployment
3. Look for the URL in the deployment details

### Step 3: Copy the URL
- Copy the full URL (should look like: `https://something.up.railway.app`)
- **Save this URL** - you'll need it in the next step!

**Example URLs:**
- `https://anpr-service-production.up.railway.app`
- `https://park-wise-anpr.up.railway.app`
- `https://your-service-name.up.railway.app`

---

## Part 2: Update Render Backend Environment Variable

### Step 1: Go to Render Dashboard
1. Open a new tab/window
2. Go to: https://dashboard.render.com
3. Log in if needed

### Step 2: Find Your Backend Service
1. You should see a list of services
2. Find your **backend service** (probably named something like "parkinglog-backend" or "park-wise-backend")
3. Click on it

### Step 3: Go to Environment Tab
1. Look for tabs at the top: **Overview**, **Logs**, **Environment**, **Settings**, etc.
2. Click **"Environment"** tab
3. You'll see a list of environment variables

### Step 4: Add/Update ANPR_SERVICE_URL
**If ANPR_SERVICE_URL doesn't exist:**
1. Click **"Add Environment Variable"** or **"Add Variable"** button
2. **Key**: `ANPR_SERVICE_URL`
3. **Value**: Paste your Railway URL (e.g., `https://your-service.up.railway.app`)
4. Click **"Save"** or **"Add"**

**If ANPR_SERVICE_URL already exists:**
1. Find `ANPR_SERVICE_URL` in the list
2. Click the **pencil/edit icon** next to it
3. Update the **Value** to your Railway URL
4. Click **"Save"** or **"Update"**

### Step 5: Redeploy Backend
1. After saving the environment variable
2. Go to **"Manual Deploy"** or **"Deploy"** tab
3. Click **"Deploy latest commit"** or **"Redeploy"**
4. Wait for deployment to complete (2-5 minutes)

---

## Quick Checklist

- [ ] Found Railway service URL
- [ ] Copied the URL
- [ ] Went to Render backend dashboard
- [ ] Opened Environment tab
- [ ] Added/updated `ANPR_SERVICE_URL` with Railway URL
- [ ] Saved the environment variable
- [ ] Redeployed backend
- [ ] Backend deployment completed

---

## Troubleshooting

### Can't find Railway URL?
- Make sure your Railway service is deployed (check Deployments tab)
- If you see "Generate Domain" button, click it
- The URL might take a few minutes to appear after first deployment

### Can't find Environment tab on Render?
- Make sure you're in the **backend service**, not the frontend
- Look for "Environment Variables" or "Env" tab
- Some Render interfaces show it under "Settings" → "Environment"

### Backend not updating?
- Make sure you **redeployed** after changing the environment variable
- Environment variables only take effect after redeploy
- Check backend logs to see if it's using the new URL

---

## Test It Works

After everything is set up:
1. Go to your web app
2. Log in as admin
3. Navigate to "ANPR System" page
4. Try uploading an image or using camera
5. Should work! ✅

If it doesn't work, check browser console for errors.

