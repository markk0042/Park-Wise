"""
Standalone ALPR Service Module
Can be easily integrated into existing web applications.
"""
import base64
import csv
import json
import logging
import os
import statistics
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple

import cv2
import numpy as np

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
            ALPR = None
    else:
        ALPR = None


class ALPRService:
    """
    Standalone ALPR service that can be integrated into existing applications.
    """
    
    def __init__(
        self,
        detector_model: str = "yolo-v9-t-384-license-plate-end2end",
        ocr_model: str = "cct-xs-v1-global-model",
        registrations_csv_path: Optional[str] = None,
        logs_dir: Optional[str] = None
    ):
        """
        Initialize ALPR Service.
        
        Args:
            detector_model: ALPR detector model name
            ocr_model: ALPR OCR model name
            registrations_csv_path: Path to CSV file with vehicle registrations
            logs_dir: Directory to store vehicle logs
        """
        self.alpr = None
        self.registrations_csv_path = registrations_csv_path
        self.logs_dir = Path(logs_dir) if logs_dir else Path(__file__).parent / "vehicle_logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        # Load registrations database
        self.registrations_db = self._load_registrations()
        
        # Setup logging
        self._setup_logging()
        
        # Initialize ALPR (lazy initialization)
        self._initialize_alpr(detector_model, ocr_model)
    
    def _setup_logging(self):
        """Setup logging for vehicle scans."""
        log_file = self.logs_dir / "vehicle_scans.log"
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
        self.logger = logging.getLogger('alpr_service')
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(handler)
    
    def _initialize_alpr(self, detector_model: str, ocr_model: str):
        """Initialize ALPR system."""
        if ALPR is None:
            print("WARNING: fast_alpr not available. Install with: pip install fast-alpr[onnx]")
            return
        
        try:
            import certifi
            import ssl
            os.environ['SSL_CERT_FILE'] = certifi.where()
            os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
            
            self.alpr = ALPR(
                detector_model=detector_model,
                ocr_model=ocr_model,
            )
            print("ALPR system initialized successfully!")
        except Exception as e:
            print(f"Error initializing ALPR: {e}")
            self.alpr = None
    
    def _load_registrations(self) -> Dict[str, Dict]:
        """
        Load vehicle registrations from CSV file.
        
        CSV format should be:
        registration,owner,vehicle_type,make,model,color,notes
        ABC-123,John Doe,Car,Toyota,Camry,Blue,Company vehicle
        
        Returns:
            Dictionary mapping registration -> vehicle info
        """
        if not self.registrations_csv_path or not os.path.exists(self.registrations_csv_path):
            return {}
        
        registrations = {}
        try:
            with open(self.registrations_csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Normalize registration (uppercase, remove spaces)
                    reg = row.get('registration', '').strip().upper()
                    if reg:
                        registrations[reg] = {
                            'registration': reg,
                            'owner': row.get('owner', ''),
                            'vehicle_type': row.get('vehicle_type', ''),
                            'make': row.get('make', ''),
                            'model': row.get('model', ''),
                            'color': row.get('color', ''),
                            'notes': row.get('notes', ''),
                        }
            print(f"Loaded {len(registrations)} registrations from database")
        except Exception as e:
            print(f"Error loading registrations: {e}")
        
        return registrations
    
    def reload_registrations(self):
        """Reload registrations from CSV file."""
        self.registrations_db = self._load_registrations()
    
    def check_registration(self, plate_text: str) -> Tuple[bool, Optional[Dict]]:
        """
        Check if a registration exists in the database.
        
        Args:
            plate_text: Scanned license plate text
            
        Returns:
            Tuple of (found, vehicle_info)
        """
        # Normalize the plate text
        normalized = plate_text.strip().upper().replace(' ', '')
        
        # Direct match
        if normalized in self.registrations_db:
            return True, self.registrations_db[normalized]
        
        # Try with/without dashes
        normalized_no_dash = normalized.replace('-', '')
        for reg, info in self.registrations_db.items():
            reg_no_dash = reg.replace('-', '').replace(' ', '')
            if normalized_no_dash == reg_no_dash:
                return True, info
        
        return False, None
    
    def scan_image(
        self,
        image_path: str = None,
        image_data: bytes = None,
        image_array: np.ndarray = None,
        check_database: bool = True,
        log_scan: bool = True
    ) -> Dict:
        """
        Scan an image for license plates.
        
        Args:
            image_path: Path to image file
            image_data: Image as bytes
            image_array: Image as numpy array (BGR format)
            check_database: Whether to check against registration database
            log_scan: Whether to log the scan
            
        Returns:
            Dictionary with scan results
        """
        if self.alpr is None:
            return {
                "success": False,
                "error": "ALPR system not initialized"
            }
        
        try:
            # Load image
            if image_path:
                img = cv2.imread(image_path)
                if img is None:
                    return {"success": False, "error": f"Failed to load image: {image_path}"}
            elif image_data:
                nparr = np.frombuffer(image_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            elif image_array is not None:
                img = image_array
            else:
                return {"success": False, "error": "No image provided"}
            
            # Process with ALPR
            results = self.alpr.predict(img)
            
            # Prepare response
            plates = []
            for result in results:
                if result.ocr is not None and result.ocr.text:
                    conf = result.ocr.confidence
                    if isinstance(conf, list):
                        avg_confidence = statistics.mean(conf)
                    else:
                        avg_confidence = conf
                    
                    plate_text = result.ocr.text.strip()
                    
                    # Check database if requested
                    in_database = False
                    vehicle_info = None
                    if check_database:
                        in_database, vehicle_info = self.check_registration(plate_text)
                    
                    plate_data = {
                        "text": plate_text,
                        "confidence": float(avg_confidence),
                        "detection_confidence": float(result.detection.confidence),
                        "in_database": in_database,
                        "vehicle_info": vehicle_info,
                        "bounding_box": {
                            "x1": result.detection.bounding_box.x1,
                            "y1": result.detection.bounding_box.y1,
                            "x2": result.detection.bounding_box.x2,
                            "y2": result.detection.bounding_box.y2,
                        }
                    }
                    plates.append(plate_data)
                    
                    # Log the scan
                    if log_scan:
                        self._log_vehicle_scan(plate_text, avg_confidence, in_database, vehicle_info)
            
            # Generate annotated image
            annotated_image = self.alpr.draw_predictions(img)
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return {
                "success": True,
                "plates": plates,
                "count": len(plates),
                "annotated_image": f"data:image/jpeg;base64,{image_base64}"
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _log_vehicle_scan(
        self,
        plate_text: str,
        confidence: float,
        in_database: bool,
        vehicle_info: Optional[Dict]
    ):
        """Log a vehicle scan."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        log_entry = {
            "timestamp": timestamp,
            "plate_text": plate_text,
            "confidence": confidence,
            "in_database": in_database,
            "vehicle_info": vehicle_info
        }
        
        # Log to file
        self.logger.info(json.dumps(log_entry))
        
        # Also save to daily log file
        daily_log_file = self.logs_dir / f"scans_{datetime.now().strftime('%Y-%m-%d')}.json"
        try:
            logs = []
            if daily_log_file.exists():
                with open(daily_log_file, 'r') as f:
                    logs = json.load(f)
            logs.append(log_entry)
            with open(daily_log_file, 'w') as f:
                json.dump(logs, f, indent=2)
        except Exception as e:
            print(f"Error writing daily log: {e}")
    
    def get_vehicle_logs(self, date: str = None, limit: int = 100) -> List[Dict]:
        """
        Get vehicle scan logs.
        
        Args:
            date: Date in YYYY-MM-DD format. If None, uses today.
            limit: Maximum number of logs to return
            
        Returns:
            List of log entries
        """
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        log_file = self.logs_dir / f"scans_{date}.json"
        if not log_file.exists():
            return []
        
        try:
            with open(log_file, 'r') as f:
                logs = json.load(f)
            return logs[-limit:]  # Return most recent
        except Exception as e:
            print(f"Error reading logs: {e}")
            return []
    
    def get_vehicle_stats(self, plate_text: str, days: int = 30) -> Dict:
        """
        Get statistics for a specific vehicle.
        
        Args:
            plate_text: License plate text
            days: Number of days to look back
            
        Returns:
            Statistics dictionary
        """
        from datetime import timedelta
        
        scans = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            daily_logs = self.get_vehicle_logs(date_str, limit=1000)
            for log in daily_logs:
                if log.get('plate_text', '').upper().replace('-', '').replace(' ', '') == \
                   plate_text.upper().replace('-', '').replace(' ', ''):
                    scans.append(log)
            current_date += timedelta(days=1)
        
        return {
            "plate_text": plate_text,
            "total_scans": len(scans),
            "first_seen": scans[0]['timestamp'] if scans else None,
            "last_seen": scans[-1]['timestamp'] if scans else None,
            "scans": scans[-50:]  # Last 50 scans
        }


# Example usage and Flask integration helper
def create_flask_routes(app, alpr_service: ALPRService):
    """
    Add ALPR routes to an existing Flask app.
    
    Usage:
        from alpr_service import ALPRService, create_flask_routes
        
        alpr = ALPRService(registrations_csv_path="vehicles.csv")
        create_flask_routes(app, alpr)
    """
    
    @app.route('/api/alpr/scan', methods=['POST'])
    def alpr_scan():
        """Scan image endpoint."""
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            file.save(tmp.name)
            result = alpr_service.scan_image(image_path=tmp.name)
            os.unlink(tmp.name)
        
        return jsonify(result)
    
    @app.route('/api/alpr/logs', methods=['GET'])
    def alpr_logs():
        """Get vehicle logs."""
        date = request.args.get('date')
        limit = int(request.args.get('limit', 100))
        logs = alpr_service.get_vehicle_logs(date=date, limit=limit)
        return jsonify({"logs": logs, "count": len(logs)})
    
    @app.route('/api/alpr/stats/<plate_text>', methods=['GET'])
    def alpr_stats(plate_text):
        """Get vehicle statistics."""
        days = int(request.args.get('days', 30))
        stats = alpr_service.get_vehicle_stats(plate_text, days=days)
        return jsonify(stats)
    
    @app.route('/api/alpr/reload', methods=['POST'])
    def alpr_reload():
        """Reload registrations database."""
        alpr_service.reload_registrations()
        return jsonify({"success": True, "count": len(alpr_service.registrations_db)})
    
    # Import request and jsonify if not already imported
    try:
        from flask import request, jsonify
    except ImportError:
        print("WARNING: Flask not available. Routes not created.")

