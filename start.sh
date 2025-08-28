#!/bin/bash

# Kings Choice Alliance Management - Start Script
echo "🏰 Kings Choice Alliance Management System"
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Check if python3-venv is available, install if needed
if ! python3 -m venv --help &> /dev/null; then
    echo "🔧 Installing python3-venv package..."
    apt update && apt install -y python3-venv python3-full
fi

# Remove old virtual environment if it exists and is broken
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "🧹 Cleaning up broken virtual environment..."
    rm -rf venv
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment. Trying alternative method..."
        python3 -m venv venv --without-pip
        source venv/bin/activate
        curl https://bootstrap.pypa.io/get-pip.py | python3
    fi
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip in virtual environment
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies in virtual environment
echo "📦 Installing Flask dependencies in virtual environment..."
pip install -r requirements.txt

# Verify Flask installation
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Flask installation failed. Trying alternative installation..."
    pip install Flask==2.3.3 Flask-CORS==4.0.0
fi

# Initialize database if it doesn't exist
if [ ! -f "alliance_management.db" ]; then
    echo "🗄️ Initializing database..."
    python3 models/database.py
fi

# Start the application
echo "🚀 Starting Kings Choice Alliance Management..."
echo "📍 Access the application at: http://localhost:5000"
echo "🛑 Press Ctrl+C to stop the server"
echo ""
python3 run.py