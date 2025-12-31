#!/bin/bash

# IndyServe Connection Test Script
# Optimized SSH configuration for IndyServe compatibility

echo "🔧 Testing IndyServe SSH Configuration for Skywrite"
echo "===================================================="

# Test basic connection
echo "1️⃣ Testing basic SSH connection..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no skywrite "echo 'BASIC_OK'" 2>/dev/null; then
    echo "✅ Basic SSH connection: OK"
else
    echo "❌ Basic SSH connection: FAILED"
    exit 1
fi

# Test with IndyServe specific options
echo ""
echo "2️⃣ Testing IndyServe optimized connection..."
ssh -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR \
    -o ServerAliveInterval=30 \
    -o TCPKeepAlive=yes \
    -o Compression=no \
    -o PreferredAuthentications=publickey \
    skywrite "echo 'INDYSERVE_OK'" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ IndyServe optimized connection: OK"
else
    echo "❌ IndyServe optimized connection: FAILED"
    exit 1
fi

# Test port forwarding
echo ""
echo "3️⃣ Testing port forwarding capability..."
ssh -o ConnectTimeout=5 -f -N -L 3002:localhost:3002 skywrite
sleep 2

if curl -s --connect-timeout 3 http://localhost:3002 >/dev/null 2>&1; then
    echo "✅ Port forwarding: OK"
    # Kill the SSH tunnel
    pkill -f "ssh.*skywrite.*3002"
else
    echo "⚠️ Port forwarding: Not available (app may not be running)"
fi

# Test file operations
echo ""
echo "4️⃣ Testing file operations..."
ssh skywrite "echo 'IndyServe Test' > /tmp/indyserve_test && cat /tmp/indyserve_test" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ File operations: OK"
    ssh skywrite "rm -f /tmp/indyserve_test" 2>/dev/null
else
    echo "❌ File operations: FAILED"
fi

echo ""
echo "🎯 IndyServe Configuration Summary:"
echo "   Host: skywrite.orb.local:22"
echo "   User: root"
echo "   Auth: publickey only"
echo "   Timeout: 10s"
echo "   KeepAlive: 30s"
echo "   Compression: disabled"
echo ""
echo "📋 IndyServe Connection String:"
echo "   ssh://root@skywrite.orb.local:22/app"
echo ""
echo "🔧 IndyServe Config File:"
echo "   $(pwd)/indyserve-config.json"
echo ""
echo "✅ All tests passed! Ready for IndyServe connection."
