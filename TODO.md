# UI Clarity Improvements - TODO

## ✅ Phase 1: Must Have (COMPLETED)

### Show which leaves are changing in UI text
- ✅ Display actual leaf names during transitions
- ✅ Show format: `T0 → T5 (moving: A1, B2, C1)`
- ✅ Limit display to first 3 leaves with "+N more" for longer lists
- ✅ Update timeline segment tooltips to show leaf names

### Simplify main display
- ✅ Remove "Stable/Transition" terminology
- ✅ Show just tree names: `T0` for complete trees
- ✅ Show transitions as: `T0 → T5`
- ✅ Simplify tooltips to be more user-friendly

---

## 📋 Phase 2: Visual Highlighting (PENDING)

### Connect UI to tree visualization
- [ ] Pass active edge data from timeline to visualization controller
- [ ] Highlight moving nodes/branches during transitions
- [ ] Show visual feedback for which elements are changing

### Implementation tasks
- [ ] Pass `activeChangeEdge` data to DeckGLTreeAnimationController
  - [ ] Add method to highlight specific edges/nodes
  - [ ] Use existing `activeChangeEdgeTracking` from store
- [ ] Use ColorManager to highlight moving elements
  - [ ] Apply `activeChangeEdgeColor` (#2196f3) to moving edges
  - [ ] Ensure color updates during transitions
  - [ ] Clear highlighting when on complete trees

### Technical components to modify
- [ ] `MovieTimelineManager.js` - Send edge data to controller
- [ ] `DeckGLTreeAnimationController.js` - Receive and apply highlighting
- [ ] `LayerStyles.js` - Update edge colors based on active state

---

## 🔄 Phase 3: Interactive Connection (FUTURE)

### Bidirectional interaction
- [ ] Timeline hover highlights tree elements
  - [ ] On timeline segment hover, get `activeChangeEdge`
  - [ ] Pass to tree controller for highlighting
  - [ ] Show visual pulse/glow effect

- [ ] Tree element hover highlights timeline segment
  - [ ] On tree node/edge hover, find containing segment
  - [ ] Highlight corresponding timeline segment
  - [ ] Show tooltip with transition info

### Additional enhancements
- [ ] Animation preview on timeline hover
- [ ] Color legend for different change types
- [ ] Keyboard shortcuts for navigation
- [ ] Help overlay for first-time users

---

## 🎯 Quick Wins (Can do immediately)

1. **Remove all unused CSS selectors** (instant file size reduction)
2. **Add keyboard shortcuts legend** in help menu
3. **Cache leaf name lookups** for performance

---

## 📝 Notes

- Users are familiar with phylogenetic trees but not necessarily the technical implementation
- Focus on clarity over technical accuracy
- Visual feedback is more important than text descriptions
- Keep the UI responsive during animations

---

## 🐛 Known Issues to Fix

- [ ] Backward scrubbing occasionally skips trees (rounding issue fixed, needs testing)
- [ ] Timeline segment colors need better contrast
- [ ] Large leaf sets (>10) make tooltips too long

---

## 💡 Future Ideas

- Progressive disclosure of information (basic → detailed on demand)
- Customizable UI density (compact vs detailed view)
- Export current view state as URL for sharing
- Undo/redo for navigation actions
