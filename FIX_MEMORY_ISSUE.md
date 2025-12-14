# Fix: Out of Memory Error on Render Free Tier

## The Problem

Your service is hitting the **512MB RAM limit** on Render's free tier:
```
==> Out of memory (used over 512Mi)
```

EasyOCR + YOLO + all ML libraries need more than 512MB.

## Solutions

### Option 1: Upgrade to Starter Plan ($7/month) - RECOMMENDED

**This is the easiest fix:**
1. Go to Render dashboard
2. Click on your service
3. Click "Settings"
4. Change "Instance Type" from "Free" to "Starter" ($7/month)
5. Redeploy

**Starter plan gives you:**
- ✅ 512MB RAM (same, but better CPU)
- ✅ Always-on (no spin-down)
- ✅ Better performance

**Wait, that's still 512MB...**

Actually, the issue is that EasyOCR needs more memory. Let me optimize the code first.

### Option 2: Optimize Code for Lower Memory (Free)

I've updated the code to:
- Use quantized EasyOCR models (smaller)
- Fix YOLO loading issue
- Reduce memory footprint

**Try this first** - push the updated code and see if it works on free tier.

### Option 3: Use Lighter OCR Alternative

If EasyOCR still uses too much memory, we could:
- Use Tesseract OCR (lighter, but less accurate)
- Or use cloud OCR API (Google Vision, etc.)

## What I've Fixed

1. **YOLO Model Loading** - Fixed PyTorch 2.6 compatibility
2. **EasyOCR Memory** - Added quantization and temp directory
3. **Error Handling** - Better fallbacks

## Next Steps

1. **Push the updated code:**
   ```bash
   git add anpr-service/anpr.py
   git commit -m "Fix YOLO loading and optimize memory usage"
   git push origin main
   ```

2. **Redeploy on Render**

3. **If still out of memory:**
   - Upgrade to Starter plan ($7/month)
   - OR use Standard plan ($25/month) for 2GB RAM

## Memory Requirements

- **EasyOCR**: ~300-400MB
- **YOLO**: ~100-200MB
- **Python/Base**: ~100MB
- **Total**: ~500-700MB needed

**Free tier (512MB) is too small!** You'll need at least Starter, but Standard ($25/month) is better for production.

## Recommendation

**For production:** Upgrade to **Standard plan ($25/month)** with 2GB RAM.

**For testing:** Try the optimized code first, but you'll likely need to upgrade.

