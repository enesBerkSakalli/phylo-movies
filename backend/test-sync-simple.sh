#!/bin/bash

echo "🧪 Testing Transport Control Button Synchronization"
echo "=" | head -c 60
echo ""

echo "📊 Checking Browser Logs MCP server status..."
curl -s http://127.0.0.1:3001/api/logs | jq '.logs | length' 2>/dev/null || echo "Browser Logs MCP not available"

echo ""
echo "🎯 Manual Testing Instructions:"
echo "1. Open http://127.0.0.1:5173 in your browser"
echo "2. Load a phylogenetic movie (upload MSA file)"
echo "3. Open browser console (F12) to see debug messages"
echo "4. Test each transport control button and watch for:"
echo "   - Console logs: '[SEdgeBarManager] updateCurrentPosition called'"
echo "   - Console logs: '[SEdgeBarManager] _updateGlobalTimelineScrubber called'"
echo "   - Timeline scrubber movement when buttons are clicked"
echo ""

echo "📋 Expected synchronization flow:"
echo "   Button Click → NavigationCommand → gui.update() → updateCurrentPosition() → scrubber update"
echo ""

echo "🔍 Check these elements in browser console:"
echo "   1. Click Forward Button (chevron_right) - should see updateCurrentPosition logs"
echo "   2. Click Backward Button (chevron_left) - should see updateCurrentPosition logs"
echo "   3. Click Next Tree (last_page) - should see updateCurrentPosition logs"
echo "   4. Click Previous Tree (first_page) - should see updateCurrentPosition logs"
echo "   5. Click Play/Pause (play_arrow) - should see continuous updateCurrentPosition logs"
echo ""

echo "⏰ Monitoring browser logs for 30 seconds..."
echo "   (Use transport control buttons during this time)"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + 30))

while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_LOGS=$(curl -s http://127.0.0.1:3001/api/logs | jq '.logs | length' 2>/dev/null)
    if [ ! -z "$CURRENT_LOGS" ]; then
        echo -n "📊 Logs: $CURRENT_LOGS "
        
        # Check for recent synchronization logs
        RECENT_SYNC=$(curl -s http://127.0.0.1:3001/api/logs | jq '.logs[-5:][] | select(.message | contains("updateCurrentPosition")) | .message' 2>/dev/null | wc -l)
        if [ "$RECENT_SYNC" -gt 0 ]; then
            echo "✅ Sync events detected!"
        else
            echo "⏳ Waiting for sync events..."
        fi
    else
        echo -n "."
    fi
    sleep 2
done

echo ""
echo "📊 Final Analysis:"
FINAL_LOGS=$(curl -s http://127.0.0.1:3001/api/logs | jq '.logs | length' 2>/dev/null)
echo "   Total logs captured: $FINAL_LOGS"

# Check for synchronization events
SYNC_EVENTS=$(curl -s http://127.0.0.1:3001/api/logs | jq '.logs[] | select(.message | contains("updateCurrentPosition") or contains("_updateGlobalTimelineScrubber")) | .message' 2>/dev/null | wc -l)
echo "   Synchronization events: $SYNC_EVENTS"

if [ "$SYNC_EVENTS" -gt 0 ]; then
    echo "   ✅ Transport control synchronization appears to be working"
else
    echo "   ❌ No synchronization events detected - check implementation"
fi

echo ""
echo "🔍 For detailed analysis:"
echo "   - Browser Logs MCP: http://127.0.0.1:3001/test-page.html"
echo "   - Browser Console: F12 → Console tab"
echo "   - Timeline elements: Right-click → Inspect → find .timeline-segment"