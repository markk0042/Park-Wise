# FIX: Patch PIL.Image.ANTIALIAS before any imports that might use it
try:
    from PIL import Image
    # Fix for Pillow 10.0.0+ compatibility
    if not hasattr(Image, 'ANTIALIAS'):
        Image.ANTIALIAS = Image.LANCZOS
except ImportError:
    pass

"""
Flask web application for ALPR (Automatic License Plate Recognition).
"""

import base64
import json
import logging
import os
import ssl
import statistics
from datetime import datetime
from pathlib import Path

import certifi
import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS

# Import ALPR from the fast-alpr package
try:
    from fast_alpr import ALPR
except ImportError:
    # Try importing from local source if available
    import sys
    fast_alpr_path = os.path.join(os.path.dirname(__file__), 'fast-alpr-master')
    if os.path.exists(fast_alpr_path):
        sys.path.insert(0, fast_alpr_path)
        try:
            from fast_alpr import ALPR
        except ImportError:
            print("ERROR: Could not import fast_alpr from local source.")
            print("Please install it with: pip install fast-alpr[onnx]")
            ALPR = None
    else:
        print("ERROR: Could not import fast_alpr. Please install it with: pip install fast-alpr[onnx]")
        ALPR = None

app = Flask(__name__)
CORS(app)

# Configure logging
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Set up file logging for scanned registrations
log_file = LOG_DIR / "scanned_registrations.log"
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(message)s')
file_handler.setFormatter(formatter)

logger = logging.getLogger('alpr_scanner')
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Initialize ALPR (this will download models on first run)
# Use lazy initialization to allow app to start even if models aren't ready
alpr = None
alpr_init_error = None

def initialize_alpr():
    """Initialize ALPR system. Can be called multiple times safely."""
    global alpr, alpr_init_error
    if alpr is not None:
        return alpr
    
    if ALPR is None:
        alpr_init_error = "fast_alpr package not available"
        return None
    
    print("Initializing ALPR system...")
    try:
        # Try to fix SSL certificate issues on macOS
        import ssl
        import certifi
        import os
        
        # Set SSL certificate path
        os.environ['SSL_CERT_FILE'] = certifi.where()
        os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
        
        alpr = ALPR(
            detector_model="yolo-v9-t-384-license-plate-end2end",
            ocr_model="cct-xs-v1-global-model",
        )
        print("ALPR system initialized successfully!")
        alpr_init_error = None
        return alpr
    except Exception as e:
        error_msg = str(e)
        print(f"Error initializing ALPR: {error_msg}")
        alpr_init_error = error_msg
        alpr = None
        return None

# Try to initialize in background (non-blocking)
try:
    import threading
    init_thread = threading.Thread(target=initialize_alpr, daemon=True)
    init_thread.start()
except Exception:
    # If threading fails, try synchronous init
    initialize_alpr()

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def log_registration(plate_text: str, confidence: float, image_filename: str = None):
    """Log a scanned registration to the log file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = {
        "timestamp": timestamp,
        "plate_text": plate_text,
        "confidence": confidence,
        "image_filename": image_filename
    }
    logger.info(json.dumps(log_entry))
    return log_entry


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/favicon.ico')
def favicon():
    """Serve favicon to avoid 404 errors."""
    return '', 204  # No content


@app.route('/api/scan', methods=['POST'])
def scan_image():
    """Process uploaded image with ALPR."""
    # Try to initialize if not already done
    if alpr is None:
        initialize_alpr()
    
    if alpr is None:
        error_msg = alpr_init_error or "ALPR system not initialized. Models may still be downloading."
        return jsonify({"error": error_msg}), 500
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Save uploaded file temporarily
        filename = file.filename
        filepath = UPLOAD_DIR / filename
        file.save(str(filepath))
        
        # Process image with ALPR
        results = alpr.predict(str(filepath))
        
        # Prepare response data
        plates = []
        for result in results:
            if result.ocr is not None and result.ocr.text:
                # Calculate average confidence
                conf = result.ocr.confidence
                if isinstance(conf, list):
                    avg_confidence = statistics.mean(conf)
                else:
                    avg_confidence = conf
                
                plate_data = {
                    "text": result.ocr.text,
                    "confidence": float(avg_confidence),
                    "detection_confidence": float(result.detection.confidence),
                    "bounding_box": {
                        "x1": result.detection.bounding_box.x1,
                        "y1": result.detection.bounding_box.y1,
                        "x2": result.detection.bounding_box.x2,
                        "y2": result.detection.bounding_box.y2,
                    }
                }
                plates.append(plate_data)
                
                # Log the registration
                log_registration(
                    plate_text=result.ocr.text,
                    confidence=float(avg_confidence),
                    image_filename=filename
                )
        
        # Generate annotated image
        annotated_image = alpr.draw_predictions(str(filepath))
        
        # Convert annotated image to base64
        _, buffer = cv2.imencode('.jpg', annotated_image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Clean up uploaded file
        filepath.unlink()
        
        return jsonify({
            "success": True,
            "plates": plates,
            "annotated_image": f"data:image/jpeg;base64,{image_base64}",
            "count": len(plates)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get scanned registration logs."""
    try:
        logs = []
        if log_file.exists():
            with open(log_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log_entry = json.loads(line.strip())
                            logs.append(log_entry)
                        except json.JSONDecodeError:
                            # Handle old format logs
                            logs.append({"raw": line.strip()})
        
        # Return most recent first
        logs.reverse()
        return jsonify({"logs": logs, "count": len(logs)})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    # Try to initialize if not already done
    if alpr is None:
        initialize_alpr()
    
    return jsonify({
        "status": "ok",
        "alpr_initialized": alpr is not None,
        "alpr_error": alpr_init_error if alpr is None else None
    })


@app.route('/health', methods=['GET'])
def health_mobile():
    """Health check endpoint for mobile app."""
    # Try to initialize if not already done
    if alpr is None:
        initialize_alpr()
    
    return jsonify({
        "status": "healthy" if alpr is not None else "initializing",
        "alpr_initialized": alpr is not None,
        "alpr_error": alpr_init_error if alpr is None else None
    })


@app.route('/process', methods=['POST'])
def process():
    """Process base64 image with ALPR (for mobile app)."""
    # Try to initialize if not already done
    if alpr is None:
        initialize_alpr()
    
    if alpr is None:
        error_msg = alpr_init_error or "ALPR system not initialized. Models may still be downloading."
        return jsonify({"success": False, "error": error_msg}), 500
    
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"success": False, "error": "No image data provided"}), 400
        
        # Decode base64 image
        image_base64 = data['image']
        image_data = base64.b64decode(image_base64)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "error": "Failed to decode image"}), 400
        
        # Save temporarily for processing
        temp_filename = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        temp_filepath = UPLOAD_DIR / temp_filename
        cv2.imwrite(str(temp_filepath), img)
        
        # Process image with ALPR
        results = alpr.predict(str(temp_filepath))
        
        # Prepare response data
        detections = []
        for result in results:
            if result.ocr is not None and result.ocr.text:
                # Calculate average confidence
                conf = result.ocr.confidence
                if isinstance(conf, list):
                    avg_confidence = statistics.mean(conf)
                else:
                    avg_confidence = conf
                
                detection = {
                    "registration": result.ocr.text,
                    "confidence": float(avg_confidence),
                    "bbox": [
                        float(result.detection.bounding_box.x1),
                        float(result.detection.bounding_box.y1),
                        float(result.detection.bounding_box.x2),
                        float(result.detection.bounding_box.y2),
                    ]
                }
                detections.append(detection)
                
                # Log the registration
                log_registration(
                    plate_text=result.ocr.text,
                    confidence=float(avg_confidence),
                    image_filename=temp_filename
                )
        
        # Clean up temporary file
        temp_filepath.unlink()
        
        return jsonify({
            "success": True,
            "detections": detections,
            "count": len(detections)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print(f"Starting ALPR web server...")
    print(f"Logs will be saved to: {log_file}")
    print(f"Uploads will be saved to: {UPLOAD_DIR}")
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.environ.get('PORT', 5001))
    print(f"Server starting on http://localhost:{port}")
    app.run(debug=True, host='0.0.0.0', port=port)

