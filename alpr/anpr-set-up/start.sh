#!/bin/bash

# ALPR Web Application Startup Script

echo "🚗 Starting ALPR Web Application..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
echo "📥 Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

# Install dependencies
echo "📦 Installing dependencies (this may take a few minutes)..."
pip install -r requirements.txt

# Try to install local fast-alpr source if available
if [ -d "fast-alpr-master" ]; then
    echo "📦 Installing local fast-alpr source code..."
    cd fast-alpr-master
    pip install -e .[onnx] 2>/dev/null || {
        echo "⚠️  Could not install local fast-alpr, will use PyPI version"
        cd ..
    }
    cd ..
else
    echo "📦 fast-alpr will be installed from PyPI (local source not found)"
fi

# Create necessary directories
mkdir -p logs uploads templates

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Starting web server..."
echo "   Open your browser and go to: http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the Flask app
python3 app.py

