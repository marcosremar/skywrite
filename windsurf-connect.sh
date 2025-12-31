#!/bin/bash

# Direct Windsurf Connection Script
# Usage: ./windsurf-connect.sh

echo "🚀 Opening Skywrite in Windsurf..."
echo "=================================="

# Check if Windsurf/VS Code is available
if command -v windsurf &> /dev/null; then
    echo "📱 Using Windsurf..."
    windsurf --remote ssh-remote+skywrite /app
elif command -v code &> /dev/null; then
    echo "📱 Using VS Code..."
    code --remote ssh-remote+skywrite /app
else
    echo "❌ Neither Windsurf nor VS Code found in PATH"
    echo ""
    echo "🔗 Manual connection instructions:"
    echo "1. Open Windsurf/VS Code"
    echo "2. Press Cmd+Shift+P"
    echo "3. Type: Remote-SSH: Connect to Host"
    echo "4. Enter: skywrite"
    echo "5. Navigate to: /app"
    echo ""
    echo "🌐 Or use SSH URL:"
    echo "   ssh://root@skywrite.orb.local:22/app"
fi
