#!/bin/bash

# Dragon World Alliance Management - Service Management Script

SERVICE_NAME="kings-choice-alliance"

case "$1" in
    start)
        echo "🚀 Starting $SERVICE_NAME service..."
        sudo systemctl start $SERVICE_NAME
        sudo systemctl status $SERVICE_NAME --no-pager
        ;;
    stop)
        echo "🛑 Stopping $SERVICE_NAME service..."
        sudo systemctl stop $SERVICE_NAME
        echo "✅ Service stopped"
        ;;
    restart)
        echo "🔄 Restarting $SERVICE_NAME service..."
        sudo systemctl restart $SERVICE_NAME
        sudo systemctl status $SERVICE_NAME --no-pager
        ;;
    status)
        echo "📊 $SERVICE_NAME service status:"
        sudo systemctl status $SERVICE_NAME --no-pager
        ;;
    logs)
        echo "📜 $SERVICE_NAME service logs (press Ctrl+C to exit):"
        sudo journalctl -u $SERVICE_NAME -f
        ;;
    enable)
        echo "🔧 Enabling $SERVICE_NAME service to start on boot..."
        sudo systemctl enable $SERVICE_NAME
        echo "✅ Service enabled"
        ;;
    disable)
        echo "❌ Disabling $SERVICE_NAME service from starting on boot..."
        sudo systemctl disable $SERVICE_NAME
        echo "✅ Service disabled"
        ;;
    install)
        echo "🔧 Installing $SERVICE_NAME service..."
        sudo cp kings-choice-alliance.service /etc/systemd/system/
        sudo sed -i "s|/workspace|$(pwd)|g" /etc/systemd/system/kings-choice-alliance.service
        sudo systemctl daemon-reload
        sudo systemctl enable $SERVICE_NAME
        sudo systemctl start $SERVICE_NAME
        echo "✅ Service installed and started!"
        sudo systemctl status $SERVICE_NAME --no-pager
        ;;
    uninstall)
        echo "🗑️ Uninstalling $SERVICE_NAME service..."
        sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
        sudo systemctl disable $SERVICE_NAME 2>/dev/null || true
        sudo rm -f /etc/systemd/system/kings-choice-alliance.service
        sudo systemctl daemon-reload
        echo "✅ Service uninstalled"
        ;;
    *)
        echo "Dragon World Alliance Management - Service Manager"
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable|install|uninstall}"
        echo ""
        echo "Commands:"
        echo "  start      - Start the service"
        echo "  stop       - Stop the service"
        echo "  restart    - Restart the service"
        echo "  status     - Show service status"
        echo "  logs       - Show service logs (live)"
        echo "  enable     - Enable service to start on boot"
        echo "  disable    - Disable service from starting on boot"
        echo "  install    - Install and start the service"
        echo "  uninstall  - Stop and remove the service"
        exit 1
        ;;
esac