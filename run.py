#!/usr/bin/env python3
"""
Kings Choice Alliance Management - Startup Script
Run this script to start the application
"""

from app import create_app

if __name__ == '__main__':
    app = create_app()
    print("=" * 60)
    print("🏰 Kings Choice Alliance Management System")
    print("=" * 60)
    print("📊 Features Available:")
    print("  • Player Management")
    print("  • Alliance Control & Blacklisting")
    print("  • Event Tracking")
    print("  • MVP Rotation System")
    print("  • Winner Assignment")
    print("  • Strategy Guides")
    print("=" * 60)
    print("🚀 Starting server on http://localhost:5002")
    print("💡 Dashboard: http://localhost:5002/dashboard")
    print("📚 Guides: http://localhost:5002/guides")
    print("=" * 60)
    print("⚠️  Note: Running on port 5002 to avoid conflicts with your existing apps")
    print("=" * 60)
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5002)