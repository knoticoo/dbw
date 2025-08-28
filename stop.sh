#!/bin/bash

# Dragon World Alliance Management - Stop Script
echo "🛑 Stopping Dragon World Alliance Management System"
echo "=================================================="

# Find and kill any running Flask processes
FLASK_PIDS=$(ps aux | grep '[p]ython3 run.py' | awk '{print $2}')

if [ -z "$FLASK_PIDS" ]; then
    echo "ℹ️  No running Flask processes found."
else
    echo "🔍 Found running Flask processes: $FLASK_PIDS"
    for pid in $FLASK_PIDS; do
        echo "🛑 Stopping process $pid..."
        kill $pid
        sleep 1
        if kill -0 $pid 2>/dev/null; then
            echo "⚡ Force stopping process $pid..."
            kill -9 $pid
        fi
    done
    echo "✅ All Flask processes stopped."
fi

echo "👋 Dragon World Alliance Management System stopped."