"""
Real-time ANPR (Automatic Number Plate Recognition) Service
Uses YOLO for license plate detection and EasyOCR for text recognition
"""

import cv2
import numpy as np
from ultralytics import YOLO
import easyocr
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image
import io
import os
import urllib.request

app = Flask(__name__)
CORS(app)

# License plate detection model URLs (SOTA models trained on license plate datasets)
# These are community-trained models specifically for license plate detection
LICENSE_PLATE_MODEL_URLS = [
    # Roboflow license plate detection model (YOLOv8, trained on diverse license plates)
    'https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt',  # Fallback to general model
    # You can add more specific license plate models here
]

def download_model(url, dest_path):
    """Download a model file from URL"""
    try:
        print(f"Downloading license plate model from {url}...")
        urllib.request.urlretrieve(url, dest_path)
        print(f"Model downloaded to {dest_path}")
        return True
    except Exception as e:
        print(f"Failed to download model: {e}")
        return False

# Initialize YOLO model for license plate detection
# Try to use a license plate-specific model, fallback to general YOLOv8n
print("Loading YOLO model...")
try:
    # Fix for PyTorch 2.6+ security change - patch torch.load to use weights_only=False
    # This bypasses the need to add every class to safe_globals
    import torch
    original_load = torch.load
    
    def patched_load(*args, **kwargs):
        # Force weights_only=False for YOLO model loading
        kwargs['weights_only'] = False
        return original_load(*args, **kwargs)
    
    # Monkey-patch torch.load before YOLO imports
    torch.load = patched_load
    
    # Try custom license plate model first
    model_path = os.getenv('YOLO_MODEL_PATH', None)
    
    if not model_path:
        # Check for local license plate models (in order of preference)
        if os.path.exists('lp_yolo.pt'):
            model_path = 'lp_yolo.pt'
        elif os.path.exists('license_plate_yolo.pt'):
            model_path = 'license_plate_yolo.pt'
        elif os.path.exists('license_plate_detector.pt'):
            model_path = 'license_plate_detector.pt'
        elif os.path.exists('yolov8n.pt'):
            model_path = 'yolov8n.pt'
        else:
            # Download default YOLOv8n model (general purpose, but better than nothing)
            model_path = 'yolov8n.pt'
            if not os.path.exists(model_path):
                print("Downloading YOLOv8n model (general purpose)...")
                download_model('https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt', model_path)
    
    # Load model - torch.load is now patched to use weights_only=False
    model = YOLO(model_path, task='detect')
    print(f"YOLO model loaded: {model_path}")
    if 'lp_yolo' in model_path or 'license_plate' in model_path:
        print("✓ Using license plate-specific model - optimized for plate detection!")
    else:
        print("Note: For best results, use a license plate-specific model trained on your region's plates.")
        print("You can download one from Roboflow, HuggingFace, or train your own.")
except Exception as e:
    print(f"Warning: Could not load YOLO model: {e}")
    print("Using basic image processing instead")
    model = None

# Initialize EasyOCR reader (English)
# Use quantized model to reduce memory usage
print("Initializing EasyOCR...")
try:
    # Try to use quantized model for lower memory usage
    reader = easyocr.Reader(['en'], gpu=False, quantize=True, model_storage_directory='/tmp/easyocr')
    print("EasyOCR ready!")
except Exception as e:
    print(f"Warning: EasyOCR initialization failed: {e}")
    print("Trying without quantization...")
    try:
        reader = easyocr.Reader(['en'], gpu=False)
        print("EasyOCR ready!")
    except Exception as e2:
        print(f"Error: Could not initialize EasyOCR: {e2}")
        reader = None

def preprocess_image(image):
    """Preprocess image for better OCR results"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Apply morphological operations to clean up
    kernel = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    return cleaned

def detect_license_plate_yolo(image):
    """Detect license plates using YOLO"""
    if model is None:
        return []
    
    # Use a low confidence threshold to avoid missing plates
    # License plate models are typically trained to detect plates specifically,
    # so we can be more aggressive with confidence thresholds
    results = model(image, conf=0.25, iou=0.45, imgsz=640)
    detections = []
    
    for result in results:
        boxes = result.boxes
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            width = x2 - x1
            height = y2 - y1
            aspect_ratio = width / height if height > 0 else 0
            area = width * height
            
            # For license plate-specific models, accept all detections above threshold
            # For general models, filter by aspect ratio (plates are typically wide rectangles)
            # Irish/European plates: typically 2:1 to 5:1 aspect ratio
            is_valid = False
            
            if confidence > 0.25:
                # If using a license plate-specific model, accept based on confidence
                # Otherwise, also check aspect ratio
                if aspect_ratio >= 1.5 and aspect_ratio <= 6.0 and area > 400:
                    is_valid = True
            
            if is_valid:
                detections.append({
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'confidence': confidence
                })
    
    # Sort by confidence (highest first)
    detections.sort(key=lambda x: x['confidence'], reverse=True)
    
    return detections

def detect_license_plate_contours(image):
    """Fallback: Detect license plates using contour detection"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply edge detection
    edges = cv2.Canny(gray, 50, 150)
    
    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    detections = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = w / h if h > 0 else 0
        area = cv2.contourArea(contour)
        
        # Be a bit more permissive on aspect ratio and area so we don't miss plates
        if 1.5 <= aspect_ratio <= 7.0 and area > 500:
            detections.append({
                'bbox': [x, y, x + w, y + h],
                'confidence': 0.5
            })
    
    return detections

def extract_text_from_roi(image, bbox):
    """Extract text from a region of interest"""
    x1, y1, x2, y2 = bbox
    
    # Add padding
    padding = 10
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(image.shape[1], x2 + padding)
    y2 = min(image.shape[0], y2 + padding)
    
    roi = image[y1:y2, x1:x2]
    
    if roi.size == 0:
        return None, 0.0
    
    # EasyOCR generally works best on RGB images; start with a color ROI,
    # and only rely on heavy preprocessing implicitly inside EasyOCR.
    if reader is None:
        return None, 0.0

    # Convert BGR (OpenCV) to RGB for EasyOCR
    roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)

    # If the plate region is small, upscale it to help OCR
    h, w = roi_rgb.shape[:2]
    if h < 40 or w < 100:
        roi_rgb = cv2.resize(
            roi_rgb,
            None,
            fx=2.0,
            fy=2.0,
            interpolation=cv2.INTER_CUBIC,
        )

    # First attempt: EasyOCR on color ROI
    results = reader.readtext(roi_rgb)
    # If nothing is found, try a high‑contrast, thresholded version as a fallback.
    if not results:
        gray = cv2.cvtColor(roi_rgb, cv2.COLOR_RGB2GRAY)
        # Adaptive threshold to emphasize dark characters on light background
        thresh = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY_INV,
            15,
            10,
        )
        thresh_rgb = cv2.cvtColor(thresh, cv2.COLOR_GRAY2RGB)
        results = reader.readtext(thresh_rgb)

    # Debug: log raw OCR results for this ROI
    try:
        raw_texts = [r[1] for r in results]
        print(f"[ANPR OCR] ROI {bbox} -> {raw_texts}")
    except Exception:
        pass
    
    if not results:
        return None, 0.0
    
    # Combine all detected text
    text_parts = []
    total_confidence = 0.0
    
    for (bbox, text, confidence) in results:
        # Clean text (remove spaces, special chars, keep alphanumeric)
        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
        if cleaned:
            text_parts.append(cleaned)
            total_confidence += confidence
    
    if not text_parts:
        return None, 0.0
    
    # Combine text parts
    combined_text = ''.join(text_parts)
    avg_confidence = total_confidence / len(results)
    
    # Validate license plate format (adjust regex for your country's format)
    # Irish format: e.g., 12-D-56582 (year-county-number)
    irish_pattern = r'^[0-9]{1,2}[A-Z][0-9]{4,6}$'  # Matches "12D56582" (without dashes)
    
    # UK format: e.g., AB12 CDE, AB123 CDE, etc.
    uk_pattern = r'^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3}$'
    
    # European format variations
    european_pattern = r'^[A-Z0-9]{2,10}$'
    
    # More flexible pattern for various formats (accept any alphanumeric 2-10 chars)
    flexible_pattern = r'^[A-Z0-9]{2,10}$'
    
    # Check if text matches any known format
    if (re.match(irish_pattern, combined_text) or 
        re.match(uk_pattern, combined_text) or 
        re.match(european_pattern, combined_text) or
        re.match(flexible_pattern, combined_text)):
        return combined_text, avg_confidence
    
    # Even if format doesn't match exactly, return it if it looks reasonable
    # (OCR might have misread some characters, but we'll let the DB lookup filter it)
    if len(combined_text) >= 3 and len(combined_text) <= 12:
        return combined_text, avg_confidence * 0.8  # Slightly lower confidence for non-standard format
    
    return combined_text, avg_confidence

def process_image(image_array):
    """Main processing function"""
    # Convert numpy array to BGR (OpenCV format)
    if len(image_array.shape) == 2:
        image = cv2.cvtColor(image_array, cv2.COLOR_GRAY2BGR)
    else:
        image = image_array
    
    # Detect license plates
    detections = []
    
    if model is not None:
        detections = detect_license_plate_yolo(image)
    
    # Fallback to contour detection if YOLO finds nothing
    if not detections:
        detections = detect_license_plate_contours(image)
    
    results = []
    
    for detection in detections:
        bbox = detection['bbox']
        text, confidence = extract_text_from_roi(image, bbox)
        
        if text and len(text) >= 2:  # Minimum 2 characters
            results.append({
                'registration': text,
                'confidence': float(confidence),
                'bbox': bbox
            })
    
    # If no detections found, try OCR on entire image
    if not results:
        text, confidence = extract_text_from_roi(image, [0, 0, image.shape[1], image.shape[0]])
        if text and len(text) >= 2:
            results.append({
                'registration': text,
                'confidence': float(confidence),
                'bbox': [0, 0, image.shape[1], image.shape[0]]
            })

    print(f"[ANPR] Final detections: {results}")
    return results

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'ocr_ready': reader is not None
    })

@app.route('/process', methods=['POST'])
def process():
    """Process an image and return detected license plates"""
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        image_data = data['image']
        if image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Process image
        results = process_image(image_array)
        
        return jsonify({
            'success': True,
            'detections': results,
            'count': len(results)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/process-batch', methods=['POST'])
def process_batch():
    """Process multiple images"""
    try:
        data = request.get_json()
        
        if 'images' not in data or not isinstance(data['images'], list):
            return jsonify({'error': 'No images array provided'}), 400
        
        all_results = []
        
        for image_data in data['images']:
            # Decode base64 image
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_array = np.array(image)
            
            results = process_image(image_array)
            all_results.extend(results)
        
        return jsonify({
            'success': True,
            'detections': all_results,
            'count': len(all_results)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting ANPR service on port {port}...")
    # For production (Render), use threaded mode
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)

