#!/bin/bash

echo "🚀 Setting up Browser Tools MCP for Console Debugging"
echo "=================================================="

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v chrome &> /dev/null; then
    echo "⚠️  Chrome browser is required for this setup"
    echo "Please install Google Chrome first"
    exit 1
fi

echo "✅ Chrome browser detected"

# Create downloads directory if it doesn't exist
mkdir -p ~/Downloads/browser-tools-mcp

# Download Chrome extension
echo "📥 Downloading Chrome Extension..."
curl -L -o ~/Downloads/browser-tools-mcp/BrowserTools-1.2.0-extension.zip \
  "https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip"

# Extract extension
echo "📦 Extracting extension..."
cd ~/Downloads/browser-tools-mcp
unzip -q BrowserTools-1.2.0-extension.zip
echo "✅ Extension extracted to ~/Downloads/browser-tools-mcp/"

echo ""
echo "🔧 Next Steps:"
echo "=============="
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select: ~/Downloads/browser-tools-mcp/"
echo "4. The BrowserTools MCP extension should now be installed"
echo ""
echo "5. Open Chrome DevTools (F12) and look for the 'BrowserToolsMCP' tab"
echo "6. Click on the BrowserToolsMCP tab to activate it"
echo ""
echo "🎯 To use with Claude Code:"
echo "=========================="
echo "The MCP server is already running. You can now:"
echo "• Use commands like: 'Show me all errors in the console'"
echo "• Ask: 'Check why this button click isn't working'"
echo "• Request: 'Analyze network requests to /api/users'"
echo "• Run: 'Take a screenshot of the current page'"
echo ""
echo "The browser-tools-server is running on: http://localhost:3025"
echo "You can verify it's working by opening that URL in your browser"
echo ""
echo "🔍 Available MCP Tools:"
echo "======================"
echo "• get_console_logs - Get browser console logs"
echo "• take_screenshot - Capture current page screenshot"
echo "• get_selected_element - Get currently selected DOM element"
echo "• get_network_logs - Get network request/response logs"
echo "• clear_logs - Clear stored logs"
echo "• runAccessibilityAudit - WCAG compliance check"
echo "• runPerformanceAudit - Performance analysis"
echo "• runSEOAudit - SEO optimization check"
echo "• runBestPracticesAudit - Web development best practices"
echo "• runDebuggerMode - Complete debugging sequence"
echo "• runAuditMode - Complete audit sequence"
echo ""
echo "🎉 Setup complete! Happy debugging!"