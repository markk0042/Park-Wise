# License Plate Detection Model Guide

The ANPR service currently uses a general-purpose YOLOv8n model, which may not be optimal for license plate detection. For better accuracy, especially for Irish/European plates, you should use a **license plate-specific YOLO model**.

## Recommended Models

### Option 1: Roboflow License Plate Detection
1. Go to [Roboflow Universe](https://universe.roboflow.com/)
2. Search for "license plate detection" or "ANPR"
3. Find a model trained on European/Irish plates (or train your own)
4. Export as YOLOv8 format
5. Download the `.pt` file
6. Save it as `license_plate_yolo.pt` in the `anpr-service` directory

### Option 2: HuggingFace Models
1. Visit [HuggingFace Models](https://huggingface.co/models?search=yolo+license+plate)
2. Download a license plate detection model
3. Convert to YOLOv8 format if needed
4. Save as `license_plate_yolo.pt`

### Option 3: Train Your Own
1. Collect images of Irish license plates (your own dataset)
2. Label them using [Roboflow](https://roboflow.com/) or [LabelImg](https://github.com/tzutalin/labelImg)
3. Train using Ultralytics YOLOv8:
   ```bash
   yolo train data=your_dataset.yaml model=yolov8n.pt epochs=100
   ```
4. Use the best weights as `license_plate_yolo.pt`

## Installation

Once you have a `license_plate_yolo.pt` file:

1. Copy it to `/opt/Park-Wise/anpr-service/` on your VPS
2. Restart the ANPR service:
   ```bash
   cd /opt/Park-Wise/anpr-service
   source venv/bin/activate
   python anpr.py
   ```

The service will automatically detect and use `license_plate_yolo.pt` if it exists in the directory.

## Current Status

- **Current model**: General YOLOv8n (works but not optimized for plates)
- **Better option**: License plate-specific model (significantly better accuracy)
- **Best option**: Model trained specifically on Irish/European plates

## Model Format

The model must be in YOLOv8 format (`.pt` file) compatible with Ultralytics.

