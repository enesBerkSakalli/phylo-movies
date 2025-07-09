# Timeline Scrubber Synchronization Debug Guide

## 🎯 Issue: Transport Control Buttons Not Updating Timeline Scrubber

### Current Implementation Status

Based on the code analysis, the synchronization should work through this flow:

1. **Button Click** → `eventHandlerRegistry.js` → GUI method
2. **GUI Method** → `NavigationCommand` → `gui.update()`
3. **gui.update()** → `updateMain()` → `sEdgeBarManager.updateCurrentPosition()`
4. **updateCurrentPosition()** → `_updateGlobalTimelineScrubber()` → GSAP animation

### 🔍 Debugging Steps

#### 1. Check Browser Console
Open http://127.0.0.1:5173 in your browser and:

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Load a phylogenetic movie** (upload MSA file)
4. **Click transport control buttons** and watch for:

```javascript
// Expected console logs:
[SEdgeBarManager] updateCurrentPosition called
[SEdgeBarManager] _updateGlobalTimelineScrubber called
[SEdgeBarManager] Global timeline scrubber positioning: {...}
```

#### 2. Test Timeline Elements
In the browser console, run:

```javascript
// Check if timeline elements exist
const container = document.querySelector('.timeline-container');
const scrubberHandle = document.getElementById('timelineScrubberHandle');
const scrubberTrack = document.getElementById('timelineScrubberTrack');
const segments = document.querySelectorAll('.timeline-segment');

console.log('Timeline elements:', {
    container: !!container,
    scrubberHandle: !!scrubberHandle,
    scrubberTrack: !!scrubberTrack,
    segmentCount: segments.length
});
```

#### 3. Test Button Event Handlers
In the browser console, run:

```javascript
// Test if buttons have event handlers
const buttons = ['forward-button', 'backward-button', 'forwardStepButton', 'backwardStepButton'];
buttons.forEach(id => {
    const button = document.getElementById(id);
    console.log(`${id}:`, !!button, button?.onclick ? 'has onclick' : 'no onclick');
});
```

#### 4. Test SEdgeBarManager
In the browser console, run:

```javascript
// Check if SEdgeBarManager exists
console.log('GUI:', !!window.gui);
console.log('SEdgeBarManager:', !!window.gui?.sEdgeBarManager);
console.log('Timeline segments:', window.gui?.sEdgeBarManager?.timelineSegments?.length);
```

### 🔧 Common Issues and Solutions

#### Issue 1: Timeline Not Rendered
**Symptom**: No timeline segments visible
**Solution**: Load MSA data first - timeline only renders after data is loaded

#### Issue 2: Missing Event Handlers
**Symptom**: Buttons don't respond to clicks
**Solution**: Check if `eventHandlerRegistry.js` is properly attached

#### Issue 3: CSS Blocking Clicks
**Symptom**: Clicks don't register on timeline segments
**Solution**: Check CSS z-index and pointer-events

#### Issue 4: GSAP Not Loaded
**Symptom**: Scrubber doesn't animate smoothly
**Solution**: Ensure GSAP library is loaded

### 🧪 Manual Testing Protocol

1. **Load Application**
   - Navigate to http://127.0.0.1:5173
   - Upload test MSA file
   - Wait for timeline to render

2. **Test Transport Controls**
   - Click Forward Button (→): Should see scrubber move right
   - Click Backward Button (←): Should see scrubber move left
   - Click Next Tree (⏭): Should jump to next major tree
   - Click Previous Tree (⏮): Should jump to previous major tree
   - Click Play/Pause (▶️): Should animate scrubber continuously

3. **Test Timeline Segments**
   - Click on timeline segments: Should jump to that tree
   - Drag scrubber handle: Should interpolate between trees
   - Hover over segments: Should show tooltips

### 🎯 Expected Behavior

#### Transport Control Synchronization:
- **Button Click** → **Scrubber Position Update** → **Tree Display Update**
- **Smooth GSAP Animation** of scrubber handle
- **Console Logs** confirming synchronization events

#### Timeline Scrubbing:
- **Segment Clicks** → **Navigation to specific tree**
- **Drag Scrubbing** → **Real-time tree interpolation**
- **Visual Feedback** → **Active segment highlighting**

### 📊 MCP Server Debugging

#### Browser Logs MCP (Port 3001):
- **Test Page**: http://127.0.0.1:3001/test-page.html
- **API Endpoint**: http://127.0.0.1:3001/api/logs
- **Purpose**: Capture frontend console logs

#### MCP Inspector (Port 6274):
- **Inspector UI**: http://127.0.0.1:6274
- **Purpose**: Test MCP tools interactively

### 🔍 Quick Diagnostic Commands

```bash
# Check if servers are running
curl -s http://127.0.0.1:5173 | grep -q "phylo-movies" && echo "Frontend OK" || echo "Frontend DOWN"
curl -s http://127.0.0.1:3001/test-page.html | grep -q "Browser Logs" && echo "MCP OK" || echo "MCP DOWN"

# Check browser logs
curl -s http://127.0.0.1:3001/api/logs | jq '.logs | length' 2>/dev/null || echo "No logs"
```

### 🚨 Critical Debug Points

1. **SEdgeBarManager Initialization**: Should happen after movie data loads
2. **Event Handler Registration**: Must be attached to correct button IDs
3. **Timeline Segment Creation**: Requires valid tree metadata
4. **GSAP Timeline Setup**: Centralized progress tracking system
5. **Element Delegation**: Click handlers use event delegation for robustness

### 🎯 Success Criteria

- ✅ Transport buttons trigger `updateCurrentPosition()` calls
- ✅ Timeline scrubber moves smoothly with GSAP animation
- ✅ Console logs confirm synchronization events
- ✅ Timeline segments are clickable and responsive
- ✅ Real-time interpolation during scrubbing works

---

**If the issue persists after these checks, the problem is likely in the event handler registration or the timeline element creation logic.**