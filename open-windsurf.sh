#!/bin/bash

# Windsurf Direct Connection
# Open Skywrite project in Windsurf via SSH

echo "🌊 Opening Skywrite in Windsurf..."
echo "==============================="

# Direct command to open Windsurf with SSH remote
open -a "Windsurf" "ssh://root@skywrite.orb.local:22/app"

echo "✅ Windsurf opening with remote connection..."
echo ""
echo "📋 Connection Details:"
echo "   Host: skywrite.orb.local"
echo "   User: root"
echo "   Path: /app"
echo "   Port: 22"
echo ""
echo "🌐 Web App: http://skywrite.orb.local:3002"
echo "🔐 Login: marcosremar@gmail.com / marcos123"
