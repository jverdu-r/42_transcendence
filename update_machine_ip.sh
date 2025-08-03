#!/bin/bash

# Script to automatically detect and set the machine IP in .env file

# Get the current machine's IP address (excluding localhost)
CURRENT_IP=$(hostname -I | awk '{print $1}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect machine IP automatically"
    echo "Please manually set MACHINE_IP in .env file"
    exit 1
fi

echo "🔍 Detected machine IP: $CURRENT_IP"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Update the MACHINE_IP in .env file
if grep -q "MACHINE_IP=" .env; then
    # Replace existing MACHINE_IP
    sed -i "s/MACHINE_IP=.*/MACHINE_IP=$CURRENT_IP/" .env
    echo "✅ Updated MACHINE_IP to $CURRENT_IP in .env file"
else
    # Add MACHINE_IP if it doesn't exist
    echo "MACHINE_IP=$CURRENT_IP" >> .env
    echo "✅ Added MACHINE_IP=$CURRENT_IP to .env file"
fi

echo ""
echo "📡 Your monitoring services will be accessible at:"
echo "   • Grafana: http://$CURRENT_IP:3000"
echo "   • Prometheus: http://$CURRENT_IP:9090"
echo "   • Alertmanager: http://$CURRENT_IP:9093"
echo ""
echo "🔄 To apply changes, restart the services with: make re"
