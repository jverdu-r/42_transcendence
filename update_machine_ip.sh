#!/bin/bash

# Script to automatically detect and set the machine IP in .env file

# Get the current machine's IP address (excluding localhost)
# Try multiple methods to detect the IP address
CURRENT_IP=""

# Method 1: Using ip route (most reliable)
if command -v ip >/dev/null 2>&1; then
    CURRENT_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' 2>/dev/null)
fi

# Method 2: Using hostname -I (fallback)
if [ -z "$CURRENT_IP" ] && command -v hostname >/dev/null 2>&1; then
    CURRENT_IP=$(hostname -i 2>/dev/null | awk '{print $1}' | grep -v '127.0')
    if [ "$CURRENT_IP" = "127.0.1.1" ] || [ "$CURRENT_IP" = "127.0.0.1" ]; then
        CURRENT_IP=""
    fi
fi

# Method 3: Using ifconfig (another fallback)
if [ -z "$CURRENT_IP" ] && command -v ifconfig >/dev/null 2>&1; then
    CURRENT_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1 | cut -d' ' -f2 | cut -d':' -f2)
fi

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
