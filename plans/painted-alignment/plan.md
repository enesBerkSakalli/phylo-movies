# Painted Alignment Feature

**Branch:** `feature/painted-alignment`
**Description:** Color MSA cells by phylogenetic affinity to reveal mosaic recombination patterns as horizontal color stripes

## Goal

Implement a "painted alignment" visualization mode that colors each MSA cell based on which phylogenetic group the taxon clusters with at that genome position. This reveals recombination breakpoints as color transitions within a sequence row, enabling biologists to visually identify mosaic genome patterns.

## Architecture Overview

```
movieData.interpolated_trees + taxaGrouping
              ↓
    affinity.worker.js (background computation)
              ↓
    affinityMap: { treeIndex: { taxonName: groupName } }
              ↓
    msaViewerSlice (Zustand state)
              ↓
    MSAContext → cellsLayer (colorScheme='painted')
              ↓
    Per-cell O(1) lookup: affinityMap[treeForColumn][rowTaxon]
```

## Existing Components to Leverage

### monophyleticColoring.js (src/js/treeVisualisation/systems/tree_color/)
Provides foundational pure functions for the worker:
| Function                           | Reuse Strategy                                      |
| ---------------------------------- | --------------------------------------------------- |
| `getSubtreeLeaves(node)`           | ✅ Copy to worker utils (handles D3 + raw nodes)     |
| `checkMonophyletic(node)`          | ✅ Adapt: remove store dependency, pass taxaGrouping |
| `_collectLeafNamesRecursive(node)` | ✅ Copy for raw tree traversal in worker             |

The worker version will be **pure** (no `useAppStore.getState()` calls).

### TaxaLegend.tsx (src/react/components/TreeStatsPanel/Shared/)
Already displays group colors from `taxaGrouping.groupColorMap`. For painted mode:
- ✅ Reuse existing `TaxaGroupsLegend` component in MSA panel
- Add "Ambiguous" entry when painted mode is active
- No new legend component needed

## Implementation Steps

### Step 1: Add MSA Window → Tree Index Mapping
**Files:** `src/js/domain/msa/msaWindowCalculator.js`
**What:** Add `getTreeIndexForColumn()` function that maps an alignment column (0-indexed) to the tree index whose sliding window covers that position. Uses the inverse of the existing `calculateWindow()` logic.
**Testing:** Unit test with known window/step sizes verifying correct tree index for edge cases (column 0, last column, overlap zones).

### Step 2: Create Affinity Worker with Pure Computation
**Files:**
- `src/js/msaViewer/workers/affinity.worker.js` (new)
- `src/js/msaViewer/workers/affinityUtils.js` (new, pure functions adapted from monophyleticColoring.js)
**What:** Create a Web Worker that computes phylogenetic affinity for **a single tree** (on-demand):

**Key Design:**
1. **Single tree computation** — worker receives ONE tree, not all trees
2. **On-demand** — only runs when user enables painted mode
3. **O(n) subtree indexing** — use post-order traversal to pre-compute group sets per node

**Adapted from monophyleticColoring.js:**
```javascript
// affinityUtils.js - Pure functions (no store access)
export function getSubtreeLeaves(node) { /* copy from monophyleticColoring.js */ }
export function collectLeafNamesRecursive(node) { /* copy _collectLeafNamesRecursive */ }

// O(n) optimization: build subtree group index via post-order traversal
export function buildSubtreeGroupIndex(root, taxaGrouping) {
  const nodeGroups = new Map();

  // Post-order: leaves first, then parents
  eachAfter(root, node => {
    if (!node.children) {
      const group = getTaxonGroup(node.data?.name || node.name, taxaGrouping);
      nodeGroups.set(node, group ? new Set([group]) : null);
    } else {
      const groups = new Set();
      for (const child of node.children) {
        const childGroups = nodeGroups.get(child);
        if (childGroups === null) { nodeGroups.set(node, null); return; }
        childGroups.forEach(g => groups.add(g));
      }
      nodeGroups.set(node, groups);
    }
  });

  return nodeGroups; // O(1) lookup: nodeGroups.get(node).size === 1 means single-group
}

export function computeAffinityForTree(treeRoot, taxaGrouping) {
  const nodeGroups = buildSubtreeGroupIndex(treeRoot, taxaGrouping);
  const affinity = {};

  // For each leaf, walk up to find smallest single-group ancestor
  for (const leaf of getLeaves(treeRoot)) {
    const taxonName = leaf.data?.name || leaf.name;
    let current = leaf;
    let foundGroup = null;

    while (current) {
      const groups = nodeGroups.get(current);
      if (groups === null || groups.size > 1) {
        foundGroup = null; // Mixed = ambiguous
        break;
      }
      foundGroup = [...groups][0];
      current = current.parent;
    }

    affinity[taxonName] = foundGroup;
  }

  return affinity;
}
```

**Worker main loop (single tree):**
```javascript
self.onmessage = ({ data }) => {
  const { tree, treeIndex, taxaGrouping } = data;

  try {
    const root = wrapWithHierarchy(tree); // D3 hierarchy for .parent pointers
    const affinity = computeAffinityForTree(root, taxaGrouping);

    self.postMessage({
      status: 'SUCCESS',
      result: { treeIndex, affinity }
    });
  } catch (error) {
    self.postMessage({ status: 'ERROR', error: error.message });
  }
};
```

**Testing:** Direct worker message test with fixture tree data, verify correct group assignment for known single-group vs mixed subtrees.

### Step 3: Add Painted Mode Toggle and Row Order Tracking to State
**Files:** `src/js/core/slices/msaViewerSlice.js`
**What:** Add state to slice:
- `msaPaintedModeEnabled`: boolean toggle (default: false)
- `msaPaintedTreeIndex`: number | null — which full tree the painted mode is showing
- Auto-stop: when current full tree changes and doesn't match `msaPaintedTreeIndex`, disable painted mode

**Auto-Stop Logic (in MSAContext or useEffect):**
```javascript
// When tree changes, check if painted mode should stop
useEffect(() => {
  if (!paintedModeEnabled) return;

  const currentFullTreeIndex = getCurrentFullTreeIndex(); // From animation state
  if (msaPaintedTreeIndex !== null && currentFullTreeIndex !== msaPaintedTreeIndex) {
    // Tree changed — stop painted mode
    setMsaPaintedMode(false);
    setMsaPaintedTreeIndex(null);
  }
}, [currentFullTreeIndex, paintedModeEnabled, msaPaintedTreeIndex]);
```

**User Flow:**
1. User enables painted mode → compute affinity for current full tree
2. Animation plays → when reaching NEXT full tree, painted mode auto-disables
3. User can re-enable to see affinity for new tree
- `setMsaPaintedMode(enabled)`: Toggle action
- `msaRowOrderTreeIndex`: number | null — which tree the MSA is currently ordered by
- `setMsaRowOrder(order, treeIndex)`: Update to also track which tree was used

**Updated setMsaRowOrder:**
```javascript
setMsaRowOrder: (order, treeIndex = null) => {
  if (!Array.isArray(order) || order.length === 0) {
    set({ msaRowOrder: null, msaRowOrderTreeIndex: null });
    return;
  }
  set({ msaRowOrder: order.slice(), msaRowOrderTreeIndex: treeIndex });
},
```

**Testing:** Store state inspection after calling actions.

**Note:** The affinity map and computation status are managed in MSAContext (Step 4) to keep worker lifecycle local.

### Step 4: Integrate Worker in MSAContext (Single-Tree On-Demand)
**Files:**
- `src/react/components/msa/MSAContext.jsx`
**What:** Add worker initialization with **single-tree on-demand computation**:
1. Create worker ref on mount
2. **Trigger computation ONLY when `msaPaintedModeEnabled` becomes true**
3. Compute affinity for **current full tree only** (not all trees)
4. Store affinity and painted tree index in local React state
5. Provide `affinityData` in context value: `{ affinity, treeIndex, status, groupColorMap }`
6. Terminate worker on unmount

**On-Demand Flow (single tree):**
```javascript
useEffect(() => {
  if (!paintedModeEnabled) return;
  if (!trees?.length || !taxaGrouping?.mode) return;

  // Get current FULL tree (skip interpolations)
  const currentFullTreeIndex = getCurrentFullTreeIndex();
  const currentTree = trees[currentFullTreeIndex];

  setAffinityStatus('computing');
  setMsaPaintedTreeIndex(currentFullTreeIndex);

  workerRef.current.postMessage({
    tree: currentTree,
    treeIndex: currentFullTreeIndex,
    taxaGrouping
  });
}, [paintedModeEnabled, taxaGrouping]); // Note: NOT trees — only recompute on enable or grouping change
```

**Auto-Stop on Tree Change:**
```javascript
useEffect(() => {
  if (!paintedModeEnabled || msaPaintedTreeIndex === null) return;

  const currentFullTreeIndex = getCurrentFullTreeIndex();
  if (currentFullTreeIndex !== msaPaintedTreeIndex) {
    // Moved to different full tree — stop painted mode
    setMsaPaintedMode(false);
  }
}, [currentFullTreeIndex]);
```

**Testing:**
- Toggle painted mode on → verify worker computes for current tree only
- Animation advances to next full tree → verify painted mode auto-disables

### Step 5: Extend cellsLayer with Painted Color Scheme
**Files:**
- `src/js/msaViewer/layers/cellsLayer.js`
- `src/js/msaViewer/utils/colorUtils.js`
**What:**
1. Add `affinityData` and `sequenceIdMap` parameters to `createCellsLayer()`
2. When `colorScheme='painted'`:
   - **All cells use same affinity** (from the single painted tree)
   - Map `d.row` → taxon name using `sequenceIdMap`
   - Lookup group in `affinityData.affinity[taxonName]`
   - Return group color from `affinityData.groupColorMap`, or gray (`[180, 180, 180, 255]`) for null/ambiguous
3. Add `affinityData` to `updateTriggers`

**Simplified Color Logic (single tree affinity):**
```javascript
getFillColor: d => {
  if (colorScheme === 'painted' && affinityData?.affinity) {
    const taxonName = sequenceIdMap.get(d.row);
    const group = affinityData.affinity[taxonName];
    if (group && affinityData.groupColorMap[group]) {
      return hexToRgba(affinityData.groupColorMap[group]);
    }
    return [180, 180, 180, 255]; // Gray for ambiguous
  }
  // ... existing color logic
}
```

**Testing:** Visual test — all cells in a row have same color (based on that taxon's affinity in the painted tree).

### Step 6: Wire Through MSADeckGLViewer
**Files:** `src/js/msaViewer/MSADeckGLViewer.js`
**What:**
1. Accept `affinityData` in options
2. Build `sequenceIdMap` from processed sequences (row index → taxon name)
3. Pass both to `buildCellsLayer()` call
4. Update render when affinityData changes
**Testing:** Verify layer receives correct props, no regressions in existing color schemes.

### Step 7: Add UI Toggle for Painted Mode with Tree-Order Warning
**Files:**
- `src/react/components/msa/MSAControls.jsx`
- `src/react/components/msa/MSAViewerPanel.jsx` (if controls are there)
**What:**
1. Add "Phylogenetic Affinity" option to color scheme selector dropdown
2. Only enable when `taxaGrouping.mode !== null` (groups must be defined)
3. Show tooltip: "Color cells by which phylogenetic group each taxon clusters with at this position"
4. Display computing status indicator when `affinityStatus === 'computing'`
5. **Tree-Order Warning:** When enabling painted mode AND `msaRowOrder === null`:
   - Show inline warning: "⚠️ MSA is not ordered by tree. Enable 'Order by Tree' for best visualization."
   - Or show a toast/alert with option to auto-enable tree ordering
6. **Current Order Indicator:** When MSA is tree-ordered, show which tree it's ordered by:
   - Display: "Ordered by: Tree {N}" or "Ordered by: Original Tree" in MSA panel header/status bar
   - This helps user understand which tree's leaf order is being used

**Warning Logic:**
```javascript
const msaRowOrder = useAppStore(s => s.msaRowOrder);
const currentTreeIndex = useAppStore(s => s.currentTreeIndex);
const showTreeOrderWarning = paintedModeEnabled && !msaRowOrder;
```

**Order Indicator UI:**
```jsx
{msaRowOrder && (
  <span className="text-xs text-muted-foreground">
    Ordered by: Tree {msaRowOrderTreeIndex ?? 'Original'}
  </span>
)}
```

**Testing:**
- Toggle painted mode with MSA unordered → verify warning appears
- Toggle painted mode with MSA ordered → verify no warning
- Click "Order by Tree" → warning disappears
- Verify current tree index is displayed when MSA is ordered

### Step 8: Integrate TaxaLegend in MSA Panel
**Files:**
- `src/react/components/msa/MSAViewerPanel.jsx`
- `src/react/components/TreeStatsPanel/Shared/TaxaLegend.tsx` (extend)
**What:**
1. Import and render `TaxaGroupsLegend` in MSA panel when painted mode is active
2. Extend `TaxaGroupsLegend` to show "Ambiguous (mixed subtree)" entry with gray swatch when in painted mode context
3. Pass `showAmbiguous` prop to conditionally render the gray entry
**Testing:** Verify legend appears in painted mode with all groups + ambiguous entry.

---

## GPU Acceleration (Future Enhancement)

For large alignments (>100K cells), the following GPU acceleration approaches are available:

### Phase 1: Binary Attributes (Recommended First)
**Complexity:** Medium | **Impact:** 3-5× performance improvement

Pre-compute typed arrays and pass directly to GPU:
```javascript
// In buildCellData, return typed arrays
const positions = new Float32Array(numCells * 2);  // x, y per cell
const colors = new Uint8Array(numCells * 4);       // RGBA per cell

return {
  length: numCells,
  attributes: {
    getPosition: { value: positions, size: 2 },
    getFillColor: { value: colors, size: 4, normalized: true }
  }
};
```

**Files to modify:**
- `src/js/msaViewer/layers/cellsLayer.js` - return binary format
- `src/js/msaViewer/MSADeckGLViewer.js` - handle binary data

### Phase 2: Selection Shader Extension
**Complexity:** Medium-High | **Impact:** Instant selection updates (no data re-upload)

Create `MSAColorExtension` that moves selection dimming to GPU:
```javascript
import { LayerExtension } from '@deck.gl/core';

class MSAColorExtension extends LayerExtension {
  getShaders() {
    return {
      inject: {
        'fs:DECKGL_FILTER_COLOR': `
          // Selection bounds as uniforms (no data re-upload on change!)
          uniform vec2 selectionRange;
          uniform vec2 prevSelectionRange;

          float col = geometry.position.x / cellSize;
          bool inCurrent = col >= selectionRange.x && col <= selectionRange.y;
          bool inPrevious = col >= prevSelectionRange.x && col <= prevSelectionRange.y;

          if (!inCurrent && !inPrevious) {
            color.rgb = mix(color.rgb, vec3(0.7), 0.7); // Dim
          } else if (inPrevious && !inCurrent) {
            color.rgb = mix(color.rgb, vec3(0.8), 0.3); // Slight dim
          }
        `
      }
    };
  }
}
```

### Phase 3: Texture-Based Rendering (BitmapLayer)
**Complexity:** High | **Impact:** Handle 1M+ cells

Render entire alignment as a single texture:
```javascript
// Pre-render to ImageData
const imageData = new ImageData(alignmentLength, numSequences);
for (let row = 0; row < numSequences; row++) {
  for (let col = 0; col < alignmentLength; col++) {
    const color = getAffinityColor(row, col);
    const idx = (row * alignmentLength + col) * 4;
    imageData.data.set(color, idx);
  }
}

// Use BitmapLayer with nearest-neighbor sampling (pixelated)
new BitmapLayer({
  image: imageData,
  textureParameters: { minFilter: 'nearest', magFilter: 'nearest' }
});
```

### Recommended Path
| Phase | When to Implement                | Trigger                     |
| ----- | -------------------------------- | --------------------------- |
| 1     | After core feature works         | User reports slow rendering |
| 2     | When selection lag is noticeable | Alignments >50K cells       |
| 3     | For genome-scale data            | Alignments >500K cells      |

---

## Data Structures

### AffinityData (passed through context)
```typescript
interface AffinityData {
  map: { [treeIndex: number]: { [taxonName: string]: string | null } };
  status: 'idle' | 'computing' | 'ready' | 'error';
  groupColorMap: Record<string, string>;  // groupName → hex color
  windowSize: number;
  stepSize: number;
  totalTrees: number;
}
```

### Worker Message Protocol
```typescript
// Request
{ command: 'COMPUTE_AFFINITY', data: { trees, taxaGrouping } }

// Response (SUCCESS)
{
  status: 'SUCCESS',
  result: {
    [treeIndex: number]: { [taxonName: string]: string | null }
  }
}

// Response (ERROR)
{ status: 'ERROR', error: string }
```

---

## Design Decisions

### Ambiguous Affinity Handling
When a taxon doesn't cluster with any single group (mixed subtree):
- **Color:** Gray (`#B4B4B4` / `[180, 180, 180, 255]`)
- **Legend:** Show "Ambiguous (mixed subtree)" entry with gray swatch

### Transition Frames
For interpolated trees (between full trees):
- Use the **previous full tree's** affinity (stable until next full tree)
- Rationale: Matches the sliding window concept where each window corresponds to a specific tree

### Legend Placement
- Reuse existing `TaxaGroupsLegend` component from TreeStatsPanel
- Render in MSA panel header/toolbar area when painted mode is active
- No floating panel needed

---

## Performance Considerations

| Concern                        | Mitigation                                        |
| ------------------------------ | ------------------------------------------------- |
| Worker computation time        | Background thread, status indicator in UI         |
| Memory (100 trees × 100 taxa)  | ~10K entries as plain object, negligible          |
| Cell render performance        | O(1) object property lookup per cell              |
| Re-computation on data change  | Only recompute when trees or taxaGrouping changes |
| Large alignments (>100K cells) | GPU acceleration phases (future)                  |

## Testing Strategy

1. **Unit tests:** `msaWindowCalculator.js`, affinity pure functions in `affinityUtils.js`
2. **Worker tests:** Direct postMessage with fixture data
3. **Integration tests:** MSAContext + store state flow
4. **Visual tests:** Manual verification with norovirus recombinant dataset
5. **Regression tests:** Existing color schemes still work

## Dependencies

- **Adapt:** `monophyleticColoring.js` → pure `affinityUtils.js` (copy + modify)
- **Reuse:** `GroupingUtils.js` (getTaxonColor, getGroupForTaxon)
- **Reference:** `layout.worker.js` (worker pattern)
- **Extend:** `msaWindowCalculator.js`
- **Reuse:** `TaxaLegend.tsx` (legend component)
- Existing: `msaWindowCalculator.js` (extend)
