# ALPR Integration Guide

This guide explains how to integrate the ALPR functionality into your existing web application.

## Quick Integration

### Option 1: Copy the ALPR Service Module

1. **Copy the ALPR service file** to your existing project:
   ```
   Copy: alpr_service.py → your_project/
   ```

2. **Copy the fast-alpr source** (if using local source):
   ```
   Copy: fast-alpr-master/ → your_project/
   ```

3. **Install dependencies** in your existing project:
   ```bash
   pip install fast-alpr[onnx] opencv-python-headless numpy certifi
   ```

### Option 2: Use as a Package

If your existing app is in a different location, you can import the service:

```python
import sys
sys.path.append('/path/to/anpr-set-up')
from alpr_service import ALPRService, create_flask_routes
```

## Integration Steps

### 1. Initialize ALPR Service

In your existing Flask/Django/other app:

```python
from alpr_service import ALPRService

# Initialize with your registrations CSV file
alpr_service = ALPRService(
    registrations_csv_path="path/to/your/vehicles.csv",
    logs_dir="path/to/logs"  # Optional, defaults to vehicle_logs/
)
```

### 2. Add Routes to Your Flask App

**For Flask apps:**

```python
from flask import Flask, request, jsonify
from alpr_service import ALPRService, create_flask_routes

app = Flask(__name__)

# Initialize ALPR service
alpr_service = ALPRService(
    registrations_csv_path="vehicles.csv",
    logs_dir="logs"
)

# Add ALPR routes to your existing app
create_flask_routes(app, alpr_service)

# Your existing routes...
@app.route('/')
def index():
    return "Your existing app"
```

**Or add routes manually:**

```python
@app.route('/api/alpr/scan', methods=['POST'])
def scan_plate():
    if 'image' not in request.files:
        return jsonify({"error": "No image"}), 400
    
    file = request.files['image']
    # Save temporarily and scan
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        result = alpr_service.scan_image(image_path=tmp.name)
        os.unlink(tmp.name)
    
    return jsonify(result)
```

### 3. Create Your Registrations CSV File

Create a CSV file with your vehicle registrations:

```csv
registration,owner,vehicle_type,make,model,color,notes
ABC-123,John Doe,Car,Toyota,Camry,Blue,Company vehicle
XYZ-789,Jane Smith,Truck,Ford,F-150,Red,Personal vehicle
```

**CSV Format:**
- `registration`: License plate number (required)
- `owner`: Vehicle owner name
- `vehicle_type`: Car, Truck, Van, etc.
- `make`: Vehicle manufacturer
- `model`: Vehicle model
- `color`: Vehicle color
- `notes`: Additional notes

### 4. Use in Your Frontend

**JavaScript example:**

```javascript
// Scan an image
async function scanPlate(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch('/api/alpr/scan', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
        result.plates.forEach(plate => {
            console.log(`Plate: ${plate.text}`);
            console.log(`In database: ${plate.in_database}`);
            if (plate.in_database) {
                console.log(`Vehicle info:`, plate.vehicle_info);
            }
        });
    }
}

// Get vehicle logs
async function getLogs(date) {
    const response = await fetch(`/api/alpr/logs?date=${date}&limit=100`);
    const data = await response.json();
    return data.logs;
}

// Get vehicle statistics
async function getVehicleStats(plateText) {
    const response = await fetch(`/api/alpr/stats/${plateText}?days=30`);
    return await response.json();
}
```

## API Endpoints

### POST `/api/alpr/scan`
Scan an image for license plates.

**Request:**
- `image`: Image file (multipart/form-data)

**Response:**
```json
{
    "success": true,
    "plates": [
        {
            "text": "ABC-123",
            "confidence": 0.95,
            "detection_confidence": 0.92,
            "in_database": true,
            "vehicle_info": {
                "registration": "ABC-123",
                "owner": "John Doe",
                "vehicle_type": "Car",
                "make": "Toyota",
                "model": "Camry",
                "color": "Blue"
            },
            "bounding_box": {...}
        }
    ],
    "count": 1,
    "annotated_image": "data:image/jpeg;base64,..."
}
```

### GET `/api/alpr/logs`
Get vehicle scan logs.

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format (optional, defaults to today)
- `limit`: Maximum number of logs (optional, defaults to 100)

### GET `/api/alpr/stats/<plate_text>`
Get statistics for a specific vehicle.

**Query Parameters:**
- `days`: Number of days to look back (optional, defaults to 30)

### POST `/api/alpr/reload`
Reload the registrations database from CSV.

## Database Integration

If you want to use a database instead of CSV:

```python
class ALPRService:
    def _load_registrations(self):
        # Replace CSV loading with database query
        # Example for SQLite:
        import sqlite3
        conn = sqlite3.connect('your_database.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vehicles")
        rows = cursor.fetchall()
        
        registrations = {}
        for row in rows:
            reg = row[0].strip().upper()  # Assuming first column is registration
            registrations[reg] = {
                'registration': reg,
                'owner': row[1],
                # ... map other fields
            }
        return registrations
```

## Integration with Existing Database

If your app already has a database:

```python
# In your existing app
from alpr_service import ALPRService

class CustomALPRService(ALPRService):
    def _load_registrations(self):
        # Use your existing database connection
        from your_app import db, Vehicle
        
        vehicles = Vehicle.query.all()
        registrations = {}
        for vehicle in vehicles:
            reg = vehicle.registration.upper().strip()
            registrations[reg] = {
                'registration': reg,
                'owner': vehicle.owner,
                'vehicle_type': vehicle.type,
                # ... map your fields
            }
        return registrations

# Use custom service
alpr_service = CustomALPRService()
```

## Logging

Vehicle scans are automatically logged to:
- `vehicle_logs/vehicle_scans.log` - All scans (JSON format)
- `vehicle_logs/scans_YYYY-MM-DD.json` - Daily logs

Each log entry includes:
- Timestamp
- Plate text
- Confidence score
- Whether it was found in database
- Vehicle information (if found)

## Example: Complete Integration

```python
# app.py (your existing Flask app)
from flask import Flask, render_template, request, jsonify
from alpr_service import ALPRService

app = Flask(__name__)

# Initialize ALPR
alpr_service = ALPRService(
    registrations_csv_path="vehicles.csv",
    logs_dir="logs"
)

# Your existing routes
@app.route('/')
def index():
    return render_template('index.html')

# Add ALPR scan endpoint
@app.route('/api/scan', methods=['POST'])
def scan():
    if 'image' not in request.files:
        return jsonify({"error": "No image"}), 400
    
    file = request.files['image']
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        result = alpr_service.scan_image(image_path=tmp.name)
        os.unlink(tmp.name)
    
    return jsonify(result)

# Get logs
@app.route('/api/logs', methods=['GET'])
def get_logs():
    date = request.args.get('date')
    logs = alpr_service.get_vehicle_logs(date=date)
    return jsonify({"logs": logs})

if __name__ == '__main__':
    app.run(debug=True)
```

## Troubleshooting

1. **Import errors**: Make sure `fast-alpr` is installed:
   ```bash
   pip install fast-alpr[onnx]
   ```

2. **SSL errors**: Certificates should be installed automatically, but if issues persist:
   ```bash
   pip install certifi
   ```

3. **Model download**: First run will download models (may take a few minutes)

4. **CSV not loading**: Check file path and CSV format matches the example

## Next Steps

1. Copy `alpr_service.py` to your project
2. Create your `vehicles.csv` file
3. Initialize the service in your app
4. Add the scan endpoint
5. Update your frontend to use the new endpoint

The service is designed to be non-intrusive and work alongside your existing code!

