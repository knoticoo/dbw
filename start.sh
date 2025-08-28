#!/bin/bash

# Kings Choice Alliance Management - Start Script
echo "🏰 Kings Choice Alliance Management System"
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies in virtual environment
echo "📦 Installing Flask dependencies in virtual environment..."
pip install -r requirements.txt

# Initialize database if it doesn't exist
if [ ! -f "alliance_management.db" ]; then
    echo "🗄️ Initializing database..."
    python3 models/database.py
fi

# Start the application
echo "🚀 Starting Kings Choice Alliance Management..."
echo ""
python3 run.py