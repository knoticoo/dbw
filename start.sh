#!/bin/bash

# Dragon World Alliance Management - Start Script
echo "🐉 Dragon World Alliance Management System"
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

# Check if running as service setup
if [ "$1" = "--service" ]; then
    echo "🔧 Setting up as systemd service..."
    
    # Copy service file
    sudo cp kings-choice-alliance.service /etc/systemd/system/
    
    # Update service file with current directory
    sudo sed -i "s|/workspace|$(pwd)|g" /etc/systemd/system/kings-choice-alliance.service
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable and start service
    sudo systemctl enable kings-choice-alliance.service
    sudo systemctl start kings-choice-alliance.service
    
    echo "✅ Service installed and started!"
    echo "📊 Service status:"
    sudo systemctl status kings-choice-alliance.service --no-pager
    
    echo ""
    echo "🎉 Application is now running as a service!"
    echo "📍 Access the application at: http://localhost:5002"
    echo "🔍 Check status: sudo systemctl status kings-choice-alliance"
    echo "🛑 Stop service: sudo systemctl stop kings-choice-alliance"
    echo "🔄 Restart service: sudo systemctl restart kings-choice-alliance"
    echo "📜 View logs: sudo journalctl -u kings-choice-alliance -f"
    
    exit 0
fi

# Setup directories
echo "📁 Setting up directories..."
mkdir -p static/uploads/guides
chmod -R 755 static/uploads

# Choose how to run
echo ""
echo "Choose how to run the application:"
echo "1. Run in foreground (stops when SSH closes)"
echo "2. Run as systemd service (persistent, survives SSH disconnection)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "🚀 Starting Dragon World Alliance Management in foreground..."
        echo "📍 Access the application at: http://localhost:5002"
        echo "🛑 Press Ctrl+C to stop the server"
        echo ""
        python3 run.py
        ;;
    2)
        exec bash "$0" --service
        ;;
    *)
        echo "❌ Invalid choice. Defaulting to foreground mode."
        echo "🚀 Starting Dragon World Alliance Management..."
        echo "📍 Access the application at: http://localhost:5002"
        echo "🛑 Press Ctrl+C to stop the server"
        echo ""
        python3 run.py
        ;;
esac