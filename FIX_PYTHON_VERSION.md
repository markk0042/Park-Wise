# Fix: Python Version Compatibility Issue

## The Problem

Render is using **Python 3.13.4** (very new), but:
- `numpy==1.24.3` doesn't have pre-built wheels for Python 3.13
- It tries to build from source, but `setuptools` is missing
- Build fails with: `Cannot import 'setuptools.build_meta'`

## The Fix

I've updated two files:

### 1. `requirements.txt` - Added setuptools and made numpy more flexible:
```
setuptools>=65.0.0
wheel>=0.40.0
numpy>=1.24.3,<2.0.0  (was: numpy==1.24.3)
```

### 2. `runtime.txt` - Specify Python 3.11 (more compatible):
```
python-3.11.9
```

## What You Need to Do

### Option 1: Use Python 3.11 (Recommended)

1. **In Render Dashboard:**
   - Go to your service
   - Click "Settings"
   - Find "Python Version" or "Environment Variables"
   - Add environment variable:
     - **Name:** `PYTHON_VERSION`
     - **Value:** `3.11.9`
   - OR use the `runtime.txt` file (already updated)

2. **Redeploy** the service

### Option 2: Update Requirements (Already Done)

The `requirements.txt` has been updated with:
- `setuptools` and `wheel` (needed for building)
- More flexible numpy version (works with Python 3.11-3.13)

## Next Steps

1. **Commit the changes:**
   ```bash
   cd /Users/markkelly/Documents/Park-Wise-Offical
   git add anpr-service/requirements.txt anpr-service/runtime.txt
   git commit -m "Fix Python 3.13 compatibility - use Python 3.11"
   git push origin main
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)

3. **Or manually redeploy** in Render dashboard

## Why Python 3.11?

- ✅ Better compatibility with ML libraries
- ✅ numpy, opencv, easyocr all work well
- ✅ More stable for production
- ✅ Python 3.13 is too new (released Oct 2024)

## Alternative: If You Want to Keep Python 3.13

You'd need to update all packages to latest versions, but Python 3.11 is safer for now.

**Recommendation: Use Python 3.11.9** ✅

