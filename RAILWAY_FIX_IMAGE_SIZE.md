# Fix Railway Image Size Limit (8.7 GB > 4.0 GB)

## Problem
Railway build is creating an 8.7 GB image, but the limit is 4.0 GB.

## Solution: Use Dockerfile for Optimized Build

I've created a `Dockerfile` that uses a slim Python image and excludes model files.

## Step 1: Configure Railway to Use Dockerfile

1. Go to Railway service settings
2. Find **"Builder"** section
3. Change from **"Nixpacks"** to **"Dockerfile"**
4. Railway will now use the `Dockerfile` I created

## Step 2: Ensure Models Download at Runtime

The code already downloads models at runtime:
- YOLO models download on first use
- EasyOCR models download to `/tmp/easyocr` (not in image)

## Step 3: Redeploy

1. After changing builder to Dockerfile
2. Railway will automatically trigger a new build
3. The new build should be much smaller (< 2 GB)

## Why This Works

**Before (Nixpacks):**
- Includes all Python packages and dependencies
- May cache model files
- Creates large image

**After (Dockerfile):**
- Uses Python slim image (smaller base)
- Excludes model files (`.dockerignore`)
- Models download at runtime
- Much smaller image

## Expected Image Size

- **Before**: 8.7 GB ❌
- **After**: ~1.5-2.5 GB ✅ (well under 4.0 GB limit)

## If Still Too Large

If the image is still too large, we can:

1. **Use multi-stage build** (more complex)
2. **Remove unused dependencies** from requirements.txt
3. **Use Alpine Linux** (even smaller, but may have compatibility issues)

## Alternative: Upgrade Railway Plan

If you need more than 4.0 GB:
- Railway Pro plan has higher limits
- But the optimized Dockerfile should work fine

## Next Steps

1. Change Railway builder to "Dockerfile"
2. Redeploy
3. Check new image size
4. Should be under 4.0 GB! ✅

