# Railway Configuration Steps - Exact Instructions

## Step 1: Set Root Directory

1. Find **"Add Root Directory"** section
2. Click **"Add Root Directory"**
3. Enter: `anpr-service`
4. This tells Railway to look in the `anpr-service` folder

## Step 2: Change Builder to Python

1. Find **"Builder"** section (currently shows "Railpack" with Node.js)
2. Click the dropdown
3. Select **"Nixpacks"** or **"Dockerfile"** (Railway should auto-detect Python)
4. OR: Railway might auto-detect Python once you set the root directory

**If Railway doesn't auto-detect Python:**
- Look for "Language" or "Runtime" option
- Select "Python" or "Python 3.11"

## Step 3: Set Build Command

1. Find **"Custom Build Command"** section
2. Click to enable it
3. Enter: `pip install -r requirements.txt`

## Step 4: Set Start Command

1. Find **"Custom Start Command"** section
2. Click to enable it
3. Enter: `python anpr.py`

## Step 5: Set Resource Limits

1. Find **"Resource Limits"** section
2. Set **Memory** to: `1 GB` (or more if you have the plan)
3. Set **CPU** to: `1 vCPU` (or keep at 2 if available)

## Step 6: Generate Public Domain

1. Find **"Networking"** section
2. Under **"Public Networking"**
3. Click **"Generate Domain"**
4. This gives you the URL for your backend

## Step 7: Save

1. Scroll to bottom
2. Click **"Update"** button
3. Railway will start deploying!

## What Happens Next

Railway will:
1. Clone your repo
2. Navigate to `anpr-service` folder
3. Install Python dependencies (takes 5-10 minutes)
4. Start the service
5. Give you a public URL

## Important Notes

- **Root Directory MUST be `anpr-service`** - this is critical!
- Railway should auto-detect Python, but if not, manually set it
- The build will take longer the first time (downloading YOLO model, etc.)

## After Deployment

1. Copy the generated domain URL
2. Update your backend `ANPR_SERVICE_URL` environment variable
3. Test from your web app!

