#!/bin/bash

# ANPR Setup Script for Park-Wise
# This script helps you set up the ANPR system quickly

echo "🚗 Park-Wise ANPR Setup"
echo "======================"
echo ""

# Check Python
echo "📋 Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Found: $PYTHON_VERSION"
else
    echo "❌ Python 3 not found. Please install Python 3.8+ first."
    exit 1
fi

# Check if anpr-service directory exists
if [ ! -d "anpr-service" ]; then
    echo "❌ anpr-service directory not found!"
    exit 1
fi

# Step 1: Install Python dependencies
echo ""
echo "📦 Step 1: Installing Python dependencies..."
cd anpr-service
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found!"
    exit 1
fi

echo "Installing packages (this may take a few minutes, ~500MB download)..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo "✅ Python dependencies installed"

# Step 2: Install backend dependency
echo ""
echo "📦 Step 2: Installing backend dependency (axios)..."
cd ../server
npm install axios

if [ $? -ne 0 ]; then
    echo "❌ Failed to install axios"
    exit 1
fi

echo "✅ Backend dependency installed"

# Step 3: Check/create .env file
echo ""
echo "⚙️  Step 3: Configuring environment..."
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    touch .env
    echo "# ANPR Configuration" >> .env
    echo "ANPR_SERVICE_URL=http://localhost:5000" >> .env
    echo "✅ Created .env file with ANPR_SERVICE_URL"
else
    if grep -q "ANPR_SERVICE_URL" .env; then
        echo "✅ ANPR_SERVICE_URL already in .env"
    else
        echo "Adding ANPR_SERVICE_URL to .env..."
        echo "" >> .env
        echo "# ANPR Configuration" >> .env
        echo "ANPR_SERVICE_URL=http://localhost:5000" >> .env
        echo "✅ Added ANPR_SERVICE_URL to .env"
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start the Python ANPR service:"
echo "   cd anpr-service"
echo "   python3 anpr.py"
echo ""
echo "2. In a NEW terminal, start your backend:"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "3. Open your web app and navigate to 'ANPR System' in the sidebar"
echo ""
echo "🎉 You're ready to detect license plates!"

