# Quick Start: Integrating ALPR into Your Existing App

## Yes, you can drag and drop! Here's how:

### Step 1: Copy Files to Your Project

Copy these files from this project to your existing web app:

1. **`alpr_service.py`** - The main ALPR service module
2. **`fast-alpr-master/`** folder (if you want to use local source, otherwise install via pip)
3. **`example_registrations.csv`** - Template for your vehicle database

### Step 2: Install Dependencies

In your existing project, install:

```bash
pip install fast-alpr[onnx] opencv-python-headless numpy certifi
```

### Step 3: Create Your Vehicle Database CSV

Create a CSV file with your vehicle registrations:

```csv
registration,owner,vehicle_type,make,model,color,notes
ABC-123,John Doe,Car,Toyota,Camry,Blue,Company vehicle
XYZ-789,Jane Smith,Truck,Ford,F-150,Red,Personal vehicle
```

### Step 4: Add to Your Existing App

**For Flask apps:**

```python
from alpr_service import ALPRService

# Initialize (add this where you initialize your app)
alpr_service = ALPRService(
    registrations_csv_path="your_vehicles.csv",
    logs_dir="vehicle_logs"
)

# Add scan endpoint
@app.route('/api/scan', methods=['POST'])
def scan():
    file = request.files['image']
    import tempfile, os
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        result = alpr_service.scan_image(image_path=tmp.name)
        os.unlink(tmp.name)
    return jsonify(result)
```

### Step 5: Update Your Frontend

Add a scan button that calls your endpoint:

```javascript
async function scanPlate(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
        result.plates.forEach(plate => {
            if (plate.in_database) {
                // Vehicle found in database!
                console.log('Vehicle:', plate.vehicle_info);
                // Log the vehicle entry
            } else {
                // Unknown vehicle
                console.log('Unknown vehicle:', plate.text);
            }
        });
    }
}
```

## What You Get

✅ **Automatic database matching** - Checks scanned plates against your CSV  
✅ **Vehicle logging** - Tracks every scan with timestamp  
✅ **Statistics** - Get scan history for any vehicle  
✅ **Annotated images** - Visual results with bounding boxes  

## Response Format

When you scan, you get:

```json
{
    "success": true,
    "plates": [{
        "text": "ABC-123",
        "confidence": 0.95,
        "in_database": true,
        "vehicle_info": {
            "registration": "ABC-123",
            "owner": "John Doe",
            "vehicle_type": "Car",
            "make": "Toyota",
            "model": "Camry"
        }
    }],
    "count": 1
}
```

## Logs Location

All scans are logged to:
- `vehicle_logs/vehicle_scans.log` - All scans
- `vehicle_logs/scans_YYYY-MM-DD.json` - Daily logs

Each log entry includes:
- Timestamp
- Plate text
- Whether it matched your database
- Vehicle information (if found)

## That's It!

The ALPR service is designed to be **non-intrusive** - it works alongside your existing code without breaking anything.

See `INTEGRATION_GUIDE.md` for more detailed examples and database integration options.

