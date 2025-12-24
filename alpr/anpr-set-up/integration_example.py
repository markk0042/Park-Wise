"""
Example: How to integrate ALPR into an existing Flask app
"""
from flask import Flask, request, jsonify, render_template
from alpr_service import ALPRService

# Your existing Flask app
app = Flask(__name__)

# Initialize ALPR service
alpr_service = ALPRService(
    registrations_csv_path="example_registrations.csv",  # Your CSV file
    logs_dir="vehicle_logs"
)

# Your existing routes (example)
@app.route('/')
def index():
    return render_template('index.html')  # Your existing template

@app.route('/api/vehicles')
def get_vehicles():
    # Your existing vehicle endpoint
    return jsonify({"vehicles": []})

# Add ALPR scan endpoint
@app.route('/api/scan', methods=['POST'])
def scan_plate():
    """Scan an image for license plates."""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Save temporarily and scan
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        result = alpr_service.scan_image(
            image_path=tmp.name,
            check_database=True,  # Check against your CSV/database
            log_scan=True         # Log the scan
        )
        os.unlink(tmp.name)
    
    return jsonify(result)

# Get vehicle logs
@app.route('/api/vehicle-logs', methods=['GET'])
def get_vehicle_logs():
    """Get vehicle scan logs."""
    date = request.args.get('date')  # Optional: YYYY-MM-DD
    limit = int(request.args.get('limit', 100))
    
    logs = alpr_service.get_vehicle_logs(date=date, limit=limit)
    return jsonify({
        "logs": logs,
        "count": len(logs)
    })

# Get statistics for a specific vehicle
@app.route('/api/vehicle-stats/<plate_text>', methods=['GET'])
def get_vehicle_stats(plate_text):
    """Get statistics for a specific vehicle."""
    days = int(request.args.get('days', 30))
    stats = alpr_service.get_vehicle_stats(plate_text, days=days)
    return jsonify(stats)

# Reload registrations (useful if CSV is updated)
@app.route('/api/reload-registrations', methods=['POST'])
def reload_registrations():
    """Reload vehicle registrations from CSV."""
    alpr_service.reload_registrations()
    return jsonify({
        "success": True,
        "count": len(alpr_service.registrations_db)
    })

if __name__ == '__main__':
    print("Starting app with ALPR integration...")
    print(f"Loaded {len(alpr_service.registrations_db)} registrations")
    app.run(debug=True, port=5000)

