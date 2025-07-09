# SEdgeBarManager Context Documentation

## Overview
The SEdgeBarManager is a critical component of the phylo-movies frontend that creates and manages a visual timeline interface for phylogenetic tree interpolation sequences. It displays the progression of tree transformations, including s-edge operations and intermediate interpolation steps.

## What SEdgeBarManager Displays

### 1. Main Timeline Visualization
- **Purpose**: Shows a horizontal timeline representing the entire phylogenetic movie sequence
- **Components**:
  - Timeline segments (visual blocks representing each tree state)
  - Progress scrubber for interactive navigation
  - Phase-based color coding
  - Tooltip information for each segment

### 2. Visual Elements Created
- **Timeline Container**: `.interpolation-timeline-container`
- **Timeline Track**: `.interpolation-timeline-track`
- **Timeline Segments**: `.timeline-segment` (one per tree state)
- **Scrubber Handle**: `.timeline-scrubber-handle`
- **Progress Indicators**: Phase-specific progress bars
- **Info Panel**: Current position and phase information

## Data Flow Architecture

### Backend → Frontend Flow

1. **Backend Processing** (`/treedata` endpoint):
   ```
   User uploads tree file → TreeProcessor → InterpolationSequence → MovieData → JSON Response
   ```

2. **Key Data Structures**:
   - `tree_metadata`: Array of metadata for each tree state
   - `tree_pair_solutions`: Solutions for tree transitions with s-edge data
   - `interpolated_trees`: Array of tree objects in interpolation sequence
   - `lattice_edge_tracking`: S-edge transformation tracking
   - `highlighted_elements`: Elements to highlight during transitions

### Frontend Data Processing

#### MovieData Structure (from backend):
```javascript
{
  tree_metadata: [
    {
      tree_name: "Tree_1",
      phase: "ORIGINAL" | "DOWN_PHASE" | "COLLAPSE_PHASE" | "REORDER_PHASE" | "PRE_SNAP_PHASE" | "SNAP_PHASE",
      tree_pair_key: "pair_0_1" | null,
      step_in_pair: 1..n | null,
      s_edge_tracker: "(leaf_indices)" | "None"
    }
  ],
  tree_pair_solutions: {
    "pair_0_1": {
      lattice_edge_solutions: {
        "s_edge_key": {...}
      }
    }
  },
  interpolated_trees: [...],
  lattice_edge_tracking: [...],
  highlighted_elements: [...]
}
```

#### SEdgeBarManager Data Processing Flow:

1. **Constructor Phase**:
   ```javascript
   constructor(movieData, gui) → _initializeSEdgeBars() → _createTimelineSegments()
   ```

2. **Timeline Segment Creation**:
   - Analyzes `tree_metadata` to identify tree types
   - Filters trees based on `tree_pair_solutions` data
   - Creates timeline segments for:
     - Original trees (stable states)
     - Interpolated trees (transition states)
   - Determines interpolation status using `_hasActualInterpolation()`

3. **UI Generation**:
   - Creates visual timeline with segments
   - Applies CSS classes based on tree phase and type
   - Sets up interactive scrubber
   - Configures GSAP animation timeline

## Key Processing Logic

### Tree Type Classification
```javascript
// Original trees (stable states)
if (!metadata.tree_pair_key || metadata.phase === 'ORIGINAL') {
  // Display as stable tree segment
}

// Interpolated trees (transition states)
if (metadata.tree_pair_key && metadata.step_in_pair) {
  // Check if actual interpolation occurred
  if (pairSolution.lattice_edge_solutions && Object.keys(pairSolution.lattice_edge_solutions).length > 0) {
    // Display as interpolated segment
  }
}
```

### S-Edge Detection
The manager determines if actual interpolation occurred by:
1. Checking for `tree_pair_key` (indicates transition)
2. Verifying `tree_pair_solutions` contains lattice edge data
3. Confirming `lattice_edge_solutions` has s-edge operations

### Phase-Based Visualization
Different phases are color-coded:
- **ORIGINAL**: Base tree state (green)
- **DOWN_PHASE**: Downward tree movement (blue)
- **COLLAPSE_PHASE**: Node collapse operations (orange)
- **REORDER_PHASE**: Branch reordering (purple)
- **PRE_SNAP_PHASE**: Pre-snapping state (yellow)
- **SNAP_PHASE**: Final snapping operations (red)

## Interactive Features

### Timeline Scrubbing
- **Drag Navigation**: Users can drag the scrubber to navigate through time
- **Click Navigation**: Click on segments to jump to specific tree states
- **Interpolation**: Smooth transitions between tree states during scrubbing
- **Position Tracking**: Real-time position and phase information

### Animation Control
- **GSAP Timeline**: Centralized animation system
- **Progress Tracking**: `lastTimelineProgress` maintains current position
- **Smooth Transitions**: Interpolated rendering between tree states

## Debug Logging Structure

The enhanced debug version logs:
1. **Constructor**: Complete movieData structure analysis
2. **Segment Creation**: Individual segment processing details
3. **UI Updates**: Timeline header and visual element updates
4. **User Interactions**: Scrubbing and navigation events

## Technical Implementation Details

### CSS Classes and Styling
- `.timeline-segment`: Base segment styling
- `.interpolated-tree` vs `.original-tree`: Type-specific styling
- `.phase-*`: Phase-specific color coding
- `.small-change`, `.medium-change`, `.large-change`: S-edge impact visualization

### Performance Considerations
- Lazy DOM updates during scrubbing
- GSAP-optimized animations
- Efficient segment filtering based on actual interpolation data

### Integration Points
- **GUI Class**: Main interface controller
- **TreeAnimationController**: Handles tree rendering
- **TransitionIndexResolver**: Manages transition indices
- **NavigationController**: Handles navigation commands

## Usage in Context

The SEdgeBarManager serves as the visual timeline interface that:
1. Displays the progression of phylogenetic tree transformations
2. Provides interactive navigation through the tree sequence
3. Shows interpolation phases and s-edge operations
4. Enables smooth scrubbing between tree states
5. Gives users visual feedback on transformation complexity

This component is essential for understanding the tree interpolation process and provides the primary interface for temporal navigation through phylogenetic movies.