# Render Environment Variables for ANPR Service

## Required Environment Variables

**None!** Render automatically sets `PORT`, and the service works with defaults.

## Optional Environment Variables

### 1. PORT (Auto-set by Render)
- **Name**: `PORT`
- **Value**: `10000` (or leave empty - Render sets this automatically)
- **Required**: ❌ No - Render sets this automatically
- **Note**: You can set it manually, but Render will override it anyway

### 2. YOLO_MODEL_PATH (Optional - for custom models)
- **Name**: `YOLO_MODEL_PATH`
- **Value**: `license_plate_yolo.pt` (only if you have a custom model)
- **Required**: ❌ No - defaults to `yolov8n.pt`
- **When to use**: Only if you've trained/downloaded a custom license plate detection model

## Recommended Setup

### For Most Users (Default):
**No environment variables needed!** Just deploy and it works.

### If You Have a Custom YOLO Model:
1. Upload your model file to the `anpr-service` directory in your repo
2. Set environment variable:
   - **Name**: `YOLO_MODEL_PATH`
   - **Value**: `license_plate_yolo.pt` (or your model filename)

## How to Set in Render

1. Go to your service in Render dashboard
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Enter:
   - **Name**: (see above)
   - **Value**: (see above)
5. Click "Save Changes"
6. Service will automatically redeploy

## What the Service Uses

The Python service checks for:
- `PORT` - Port to run on (Render sets this automatically)
- `YOLO_MODEL_PATH` - Path to YOLO model file (optional, defaults to `yolov8n.pt`)

Everything else uses defaults or is configured in code.

## Summary

**For your deployment, you don't need to set any environment variables!**

Just:
1. Deploy the service
2. Render automatically sets `PORT`
3. Service uses default YOLO model (`yolov8n.pt`)
4. It works! ✅

Only set `YOLO_MODEL_PATH` if you have a custom trained model.

