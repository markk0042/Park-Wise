# ANPR Service

Real-time Automatic Number Plate Recognition (ANPR) service using YOLO and EasyOCR.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. (Optional) Download a license plate-specific YOLO model:
   - You can train your own model or download a pre-trained one
   - Place it as `license_plate_yolo.pt` in this directory
   - The service will fallback to `yolov8n.pt` if not found

3. Run the service:
```bash
python anpr.py
```

The service will start on port 5000 (or the PORT environment variable).

## API Endpoints

### Health Check
```
GET /health
```

### Process Single Image
```
POST /process
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}
```

Response:
```json
{
  "success": true,
  "detections": [
    {
      "registration": "AB12CDE",
      "confidence": 0.95,
      "bbox": [100, 200, 300, 250]
    }
  ],
  "count": 1
}
```

### Process Batch Images
```
POST /process-batch
Content-Type: application/json

{
  "images": ["data:image/jpeg;base64,...", ...]
}
```

## Environment Variables

- `PORT`: Service port (default: 5000)
- `YOLO_MODEL_PATH`: Path to YOLO model file (default: yolov8n.pt)

## Notes

- The service uses EasyOCR for text recognition (works offline)
- YOLO model is optional - the service will use contour detection as fallback
- License plate format validation is configured for UK format, but can be adjusted
- GPU support is available if CUDA is installed (set `gpu=True` in EasyOCR initialization)

