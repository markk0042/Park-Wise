# Reducing Railway Image Size - Multi-Stage Build

## Problem
Image is still 8.3 GB even with optimized Dockerfile. The issue is ML libraries (PyTorch, ultralytics, EasyOCR) are massive.

## Solution: Multi-Stage Docker Build

I've updated the Dockerfile to use a **multi-stage build**:

### How It Works

**Stage 1 (Builder):**
- Installs build tools (gcc, g++)
- Installs all Python packages
- Creates a "fat" image with everything

**Stage 2 (Runtime):**
- Starts fresh with slim Python image
- Only copies installed Python packages (not build tools)
- Removes all build dependencies
- Much smaller final image

### Expected Size Reduction

- **Before**: 8.3 GB (includes build tools + runtime)
- **After**: ~2-3 GB (only runtime, no build tools)

### What Changed

1. **Multi-stage build** - separates build and runtime
2. **Removed build tools** from final image (gcc, g++ are huge)
3. **Only runtime libraries** in final image
4. **Enhanced .dockerignore** - excludes more unnecessary files

## Next Steps

1. Railway will automatically detect the updated Dockerfile
2. New build will start
3. Should complete with image under 4.0 GB ✅

## If Still Too Large

If image is still over 4.0 GB, we can:

1. **Use Alpine Linux** (even smaller base image)
2. **Remove EasyOCR** (use Tesseract instead - much smaller)
3. **Use ONNX Runtime** (smaller than PyTorch)
4. **Upgrade Railway plan** (if needed)

But the multi-stage build should fix it!

