# ALPR Web Application

A web-based interface for testing the FastALPR license plate recognition system. This application allows you to upload images, scan for license plates, and view logged registrations.

## Features

- 🖼️ **Image Upload**: Upload images containing license plates
- 🔍 **ALPR Processing**: Automatic detection and OCR of license plates
- 📊 **Results Display**: View detected plates with confidence scores and annotated images
- 📝 **Registration Logging**: All scanned plates are automatically logged with timestamps
- 📋 **Log Viewer**: View all previously scanned registrations

## Setup Instructions

### Option 1: Quick Start (Recommended)

Use the provided startup script:

```bash
./start.sh
```

This script will:
- Create a virtual environment (if needed)
- Install all dependencies
- Start the web server

### Option 2: Manual Setup

1. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

   **Note**: The first time you run the application, it will download the ALPR models automatically. This may take a few minutes depending on your internet connection.

3. **Run the Application**:
   ```bash
   python app.py
   ```

The application will be available at: `http://localhost:5000`

### 3. Using the Web Interface

1. **Upload an Image**: Click "Choose Image File" and select an image containing a license plate
2. **Scan**: Click "Scan License Plate" to process the image
3. **View Results**: See detected plates with confidence scores and an annotated image
4. **Check Logs**: View all previously scanned registrations in the log section

## Project Structure

```
anpr-set-up/
├── app.py                      # Flask backend application
├── templates/
│   └── index.html             # Frontend web page
├── requirements.txt            # Python dependencies
├── logs/                      # Scanned registration logs (created automatically)
│   └── scanned_registrations.log
├── uploads/                   # Temporary upload directory (created automatically)
└── fast-alpr-master/          # FastALPR library source
```

## API Endpoints

- `GET /` - Main web page
- `POST /api/scan` - Upload and process an image
- `GET /api/logs` - Get scanned registration logs
- `GET /api/health` - Health check endpoint

## Logging

All scanned license plates are automatically logged to `logs/scanned_registrations.log` with:
- Timestamp
- Plate text
- Confidence score
- Image filename

## Troubleshooting

### Models Not Downloading
If models fail to download, ensure you have an active internet connection. The models will be cached after the first download.

### Performance
- First run may be slow as models are downloaded and initialized
- Processing time depends on image size and your hardware
- For better performance, consider using GPU acceleration (see FastALPR documentation)

### Port Already in Use
If port 5000 is already in use, modify the port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5000)  # Change 5000 to another port
```

## Notes

- Images are temporarily stored in the `uploads/` directory and deleted after processing
- Logs are stored in JSON format in `logs/scanned_registrations.log`
- The application uses the default FastALPR models: `yolo-v9-t-384-license-plate-end2end` for detection and `cct-xs-v1-global-model` for OCR

