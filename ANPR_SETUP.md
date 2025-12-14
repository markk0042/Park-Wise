# ANPR System Setup Guide

This guide will help you set up the Real-time Automatic Number Plate Recognition (ANPR) system for the Park-Wise application.

## Overview

The ANPR system consists of:
1. **Python ANPR Service** - Processes images using YOLO and EasyOCR
2. **Backend API** - Node.js endpoints that communicate with the Python service
3. **Frontend Interface** - React component for camera access and results display

## Prerequisites

- Python 3.8 or higher
- Node.js (already installed for the backend)
- Camera access (for real-time detection)
- Internet connection (for initial model downloads)

## Step 1: Install Python Dependencies

Navigate to the `anpr-service` directory:

```bash
cd anpr-service
```

Create a virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

**Note:** The first time you run this, EasyOCR will download language models (~500MB). This is a one-time download.

## Step 2: (Optional) Download License Plate YOLO Model

The service works with the default YOLOv8n model, but for better accuracy, you can:

1. Train your own license plate detection model
2. Download a pre-trained license plate model
3. Use a general object detection model (default)

If you have a custom model, place it as `license_plate_yolo.pt` in the `anpr-service` directory.

## Step 3: Start the Python ANPR Service

From the `anpr-service` directory:

```bash
python anpr.py
```

The service will start on port 5000 (or the PORT environment variable if set).

You should see:
```
Loading YOLO model...
YOLO model loaded: yolov8n.pt
Initializing EasyOCR...
EasyOCR ready!
Starting ANPR service on port 5000...
```

## Step 4: Configure Backend Environment

Add the ANPR service URL to your backend `.env` file:

```env
ANPR_SERVICE_URL=http://localhost:5000
```

If the Python service is running on a different machine or port, update this URL accordingly.

## Step 5: Install Backend Dependencies

The backend needs `axios` to communicate with the Python service:

```bash
cd server
npm install axios
```

## Step 6: Start the Backend Server

Make sure your backend server is running:

```bash
cd server
npm run dev
```

## Step 7: Access the ANPR Interface

1. Log in to the web application as an admin
2. Navigate to "ANPR System" in the sidebar
3. Grant camera permissions when prompted
4. Start the camera and capture images

## Usage

### Real-time Camera Mode
1. Click "Start Camera" to access your device camera
2. Position license plates in view
3. Click "Capture & Process" to analyze the current frame
4. Enable "Auto Capture" for continuous processing every 3 seconds

### Image Upload Mode
1. Click "Upload Image"
2. Select an image file containing license plates
3. The system will automatically process and display results

### Results Display
- **Detected**: Total number of license plates found
- **Matched**: Number of plates found in your vehicle database
- **Unmatched**: Number of plates not in the database

For matched vehicles, you can:
- View vehicle details (permit number, parking type)
- Create parking logs directly from the detection

## Troubleshooting

### "ANPR service is not available"
- Ensure the Python service is running on port 5000
- Check that `ANPR_SERVICE_URL` in your backend `.env` matches the service URL
- Verify the service is accessible: `curl http://localhost:5000/health`

### "Could not access camera"
- Grant camera permissions in your browser
- Ensure no other application is using the camera
- Try a different browser (Chrome/Firefox recommended)

### Poor Detection Accuracy
- Ensure good lighting conditions
- Position license plates clearly in frame
- Use higher resolution images
- Consider training a custom YOLO model for your specific license plate format

### Slow Processing
- First-time processing may be slow (model loading)
- Reduce image resolution if needed
- Consider using GPU acceleration (requires CUDA setup)

## API Endpoints

### Health Check
```
GET /api/anpr/health
```

### Process Image
```
POST /api/anpr/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/jpeg;base64,..."
}
```

## Production Deployment

For production:

1. **Python Service**: Deploy as a separate service (Docker recommended)
2. **Environment Variables**: Set `ANPR_SERVICE_URL` to production URL
3. **Security**: Ensure proper authentication and rate limiting
4. **Performance**: Consider GPU acceleration for faster processing
5. **Monitoring**: Add logging and health check monitoring

## License Plate Format

The system is configured for UK license plate formats by default. To adjust for other formats, modify the regex patterns in `anpr-service/anpr.py`:

```python
# UK format: e.g., AB12 CDE, AB123 CDE
uk_pattern = r'^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3}$'
```

## Support

For issues or questions:
1. Check the Python service logs
2. Verify backend API connectivity
3. Review browser console for frontend errors
4. Ensure all dependencies are correctly installed

