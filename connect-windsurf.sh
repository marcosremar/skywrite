#!/bin/bash

# Windsurf Connection Script for Skywrite
# Usage: ./connect-windsurf.sh

echo "🚀 Connecting to Skywrite via Windsurf..."
echo "=================================="

# Configuration
HOST="skywrite.orb.local"
USER="root"
PORT="22"
REMOTE_PATH="/app"
LOCAL_PATH="/Users/marcos/Documents/projects/microsass/dumont-writer/thesis-writer"

# Check if SSH connection works
echo "🔍 Testing SSH connection..."
if ssh -o ConnectTimeout=5 skywrite "echo 'SSH OK' &>/dev/null"; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    exit 1
fi

# Windsurf connection command
echo "📝 Windsurf Connection Details:"
echo "   Host: $HOST"
echo "   User: $USER"
echo "   Port: $PORT"
echo "   Remote Path: $REMOTE_PATH"
echo "   Local Path: $LOCAL_PATH"
echo ""
echo "🔗 Use this in Windsurf SSH configuration:"
echo "   ssh://$USER@$HOST:$PORT$REMOTE_PATH"
echo ""
echo "🌐 Or connect via VS Code/Windsurf Remote SSH:"
echo "   1. Install Remote SSH extension"
echo "   2. Press Cmd+Shift+P"
echo "   3. Type 'Remote-SSH: Connect to Host'"
echo "   4. Enter 'skywrite' or 'root@skywrite.orb.local'"
echo ""
echo "🎯 Quick connect command:"
echo "   code --remote ssh-remote+skywrite $REMOTE_PATH"

# Optional: Open in VS Code/Windsurf if available
if command -v code &> /dev/null; then
    echo ""
    echo "🚀 Opening in Windsurf/VS Code..."
    code --remote ssh-remote+skywrite $REMOTE_PATH
else
    echo ""
    echo "💡 Install Windsurf or VS Code to use remote development"
fi
