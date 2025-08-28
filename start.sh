#!/bin/bash

# Kings Choice Alliance Management - Start Script
echo "🏰 Kings Choice Alliance Management System"
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Installing Flask dependencies..."
    pip3 install --break-system-packages Flask Flask-CORS
fi

# Initialize database if it doesn't exist
if [ ! -f "alliance_management.db" ]; then
    echo "🗄️ Initializing database..."
    python3 models/database.py
fi

# Start the application
echo "🚀 Starting Kings Choice Alliance Management..."
echo ""
python3 run.py