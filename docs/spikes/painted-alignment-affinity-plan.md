# Painted Alignment Implementation Plan

## Goal
Color MSA cells by **phylogenetic affinity** - showing which group a taxon clusters with at each genome position, revealing mosaic recombination patterns as horizontal color stripes.

---

## Background: Mosaic Visualization Methods

### Established Approaches in the Field

| Method                | Description                                                             | Tools                   |
| --------------------- | ----------------------------------------------------------------------- | ----------------------- |
| **SimPlot**           | Sliding window similarity plots - lines show % similarity to references | SimPlot, RDP4           |
| **BootScan**          | Sliding window phylogeny - Y-axis shows bootstrap support for grouping  | RDP4                    |
| **Tanglegrams**       | Side-by-side trees with crossing lines showing position changes         | SplitsTree, Dendroscope |
| **Painted Alignment** | Color cells by parental origin, not amino acid                          | Custom                  |
| **Heatmap + Tree**    | Tree on left, per-position similarity matrix on right                   | ggtree, iTOL            |

### PhyloMovies Advantage
We already have:
- Sliding window trees (one tree per window)
- Taxa grouping system (separator/CSV modes)
- Animation showing phylogenetic signal change
- MSA + Tree viewer together

---

## Architecture Overview

### Data Flow
```
treeList + taxaGrouping
        ↓
usePhylogeneticAffinity hook (useMemo)
        ↓
affinityMap: Map<treeIndex, Map<taxonName, groupName|null>>
        ↓
MSAContext exposes affinityData
        ↓
cellsLayer uses for coloring when colorScheme='phylogeny'
```

### Key Concept: PhylogeneticAffinityMap
```typescript
// For each tree, for each taxon, which group does it cluster with?
type PhylogeneticAffinityMap = Map<treeIndex, Map<taxonName, groupName | null>>
```

---

## Implementation Phases

### Phase 1: Core Algorithm
**File**: `src/js/domain/msa/phylogeneticAffinity.js`

```javascript
/**
 * Compute phylogenetic affinity for all taxa in a tree.
 *
 * Algorithm:
 * For each leaf taxon T:
 *   1. Get T's assigned group from taxaGrouping
 *   2. Find the smallest monophyletic clade containing T
 *   3. Check if that clade contains ONLY taxa from one group
 *   4. If yes → T has affinity with that group
 *   5. If mixed groups → T has null affinity (ambiguous)
 *
 * @param {Object} treeRoot - D3 hierarchy tree root
 * @param {Object} taxaGrouping - From store (mode, groupColorMap, etc.)
 * @returns {Map<string, string|null>} taxonName → groupName
 */
export function computeAffinityForTree(treeRoot, taxaGrouping) {
  const affinity = new Map();

  // Get all leaves
  const leaves = getAllLeaves(treeRoot);

  for (const leaf of leaves) {
    const taxonName = leaf.data?.name || leaf.name;
    const taxonGroup = getTaxonGroup(taxonName, taxaGrouping);

    // Walk up the tree to find smallest monophyletic ancestor
    let current = leaf.parent;
    let foundAffinity = taxonGroup; // Default to own group

    while (current) {
      const cladeGroup = getCladeGroup(current, taxaGrouping);
      if (cladeGroup === null) {
        // Mixed clade - ambiguous
        foundAffinity = null;
        break;
      } else if (cladeGroup !== taxonGroup) {
        // Clade is monophyletic for a DIFFERENT group
        // This taxon is nested within another group's clade
        foundAffinity = cladeGroup;
        break;
      }
      current = current.parent;
    }

    affinity.set(taxonName, foundAffinity);
  }

  return affinity;
}

/**
 * Check if a clade contains only taxa from one group.
 * @returns {string|null} Group name if monophyletic, null if mixed
 */
function getCladeGroup(node, taxaGrouping) {
  const leaves = getSubtreeLeaves(node);
  const groups = new Set();

  for (const leafName of leaves) {
    const group = getTaxonGroup(leafName, taxaGrouping);
    if (group) groups.add(group);
    else return null; // Ungrouped taxon = not monophyletic
  }

  return groups.size === 1 ? [...groups][0] : null;
}
```

### Phase 2: Position → Tree Mapping
**File**: Extend `src/js/domain/msa/msaWindowCalculator.js`

```javascript
/**
 * Get the tree index whose window covers this alignment column.
 * For overlapping windows, returns the tree whose window CENTER is closest.
 *
 * @param {number} columnIndex - 0-indexed alignment position
 * @param {number} windowSize - Sliding window size
 * @param {number} stepSize - Step between windows
 * @param {number} totalTrees - Total number of trees
 * @returns {number} Tree index
 */
export function getTreeIndexForColumn(columnIndex, windowSize, stepSize, totalTrees) {
  // Each tree's window is centered at: treeIndex * stepSize
  // Find tree whose center is closest to columnIndex
  const treeIndex = Math.round(columnIndex / stepSize);
  return Math.max(0, Math.min(treeIndex, totalTrees - 1));
}
```

### Phase 3: State Management
**File**: Extend `src/js/core/slices/msaViewerSlice.js`

```javascript
// New state
affinityColorMode: false,  // Toggle for painted mode

// New actions
setAffinityColorMode: (enabled) => set({ affinityColorMode: enabled }),
```

### Phase 4: Precompute Affinity (Hook)
**File**: `src/hooks/usePhylogeneticAffinity.js`

```javascript
import { useMemo } from 'react';
import { useAppStore } from '../state/phyloStore/store.js';
import { computeAffinityForTree } from '../domain/msa/phylogeneticAffinity.js';

/**
 * Hook that computes phylogenetic affinity for all trees.
 * Memoized to only recompute when trees or grouping changes.
 *
 * PERFORMANCE: This runs ONCE when dependencies change, not per-render.
 */
export function usePhylogeneticAffinity() {
  const treeList = useAppStore(s => s.treeList);
  const taxaGrouping = useAppStore(s => s.taxaGrouping);
  const msaWindowSize = useAppStore(s => s.msaWindowSize);
  const msaStepSize = useAppStore(s => s.msaStepSize);

  const affinityMap = useMemo(() => {
    if (!treeList?.length || !taxaGrouping?.mode) return null;

    const map = new Map();
    for (let i = 0; i < treeList.length; i++) {
      const tree = treeList[i];
      if (tree?.root || tree?.children) {
        map.set(i, computeAffinityForTree(tree.root || tree, taxaGrouping));
      }
    }
    return map;
  }, [treeList, taxaGrouping]);

  return {
    affinityMap,
    windowSize: msaWindowSize,
    stepSize: msaStepSize,
    groupColorMap: taxaGrouping?.groupColorMap || {}
  };
}
```

### Phase 5: Extend cellsLayer
**File**: Modify `src/js/msaViewer/layers/cellsLayer.js`

```javascript
/**
 * Extended createCellsLayer with affinity coloring mode.
 *
 * @param {Object} affinityData - { map, windowSize, stepSize, groupColorMap }
 */
export function createCellsLayer(
  cellData,
  sequenceType,
  selection,
  colorScheme = 'default',
  consensus = null,
  previousSelection = null,
  affinityData = null,      // NEW
  sequenceIdMap = null      // NEW: row index → sequence ID
) {
  // ... existing setup ...

  getFillColor: d => {
    // NEW: Phylogeny color mode
    if (colorScheme === 'phylogeny' && affinityData && sequenceIdMap) {
      const treeIndex = getTreeIndexForColumn(
        d.col,
        affinityData.windowSize,
        affinityData.stepSize,
        affinityData.map.size
      );
      const taxonName = sequenceIdMap.get(d.row);
      const group = affinityData.map.get(treeIndex)?.get(taxonName);

      if (group && affinityData.groupColorMap[group]) {
        return hexToRgba(affinityData.groupColorMap[group]);
      }
      return [200, 200, 200, 255]; // Gray for ambiguous
    }

    // ... existing color logic ...
  }
}
```

### Phase 6: Wire Through MSAContext
**File**: Modify `src/react/components/msa/MSAContext.jsx`

```javascript
// Add to context value
const affinityData = usePhylogeneticAffinity();

const value = useMemo(() => ({
  // ... existing ...
  affinityData,
}), [/* ... */, affinityData]);
```

### Phase 7: UI Toggle
**File**: `src/react/components/msa/MSAControls.jsx`

```jsx
<SelectItem value="phylogeny">Phylogenetic Affinity</SelectItem>
```

Or as a dedicated switch:
```jsx
<div className="flex items-center gap-2">
  <Switch
    checked={colorScheme === 'phylogeny'}
    onCheckedChange={(v) => setColorScheme(v ? 'phylogeny' : 'default')}
  />
  <Label>Color by Phylogeny</Label>
</div>
```

---

## Implementation Order

| Step | Task                                                             | Files                    | Effort |
| ---- | ---------------------------------------------------------------- | ------------------------ | ------ |
| 1    | Create `phylogeneticAffinity.js` with `computeAffinityForTree()` | `src/js/domain/msa/`     | Medium |
| 2    | Add `getTreeIndexForColumn()`                                    | `msaWindowCalculator.js` | Small  |
| 3    | Create `usePhylogeneticAffinity` hook                            | `src/hooks/`             | Medium |
| 4    | Extend `cellsLayer.js` with phylogeny mode                       | `layers/cellsLayer.js`   | Medium |
| 5    | Wire through MSAContext → MSAViewer → MSADeckGLViewer            | Multiple                 | Medium |
| 6    | Add UI toggle in MSAControls                                     | `MSAControls.jsx`        | Small  |
| 7    | Test with recombinant data                                       | -                        | -      |

---

## Expected Visual Result

For a recombinant norovirus (Groups GI and GII):

```
Non-recombinant GI:  ████████████████████████████████ (solid blue)
Non-recombinant GII: ████████████████████████████████ (solid orange)
Recombinant:         ██████████████░░░░░░░░░░░░░░░░░░ (blue→orange)
                     ^--- breakpoint visible!
```

- **Stable taxa**: Solid horizontal stripe in their group color
- **Recombinant taxa**: Color changes at breakpoint positions
- **Ambiguous**: Gray where phylogenetic signal is unclear

---

## Performance Considerations

### Computed Once
- `affinityMap` is computed in `useMemo` - only recalculates when `treeList` or `taxaGrouping` changes
- NOT computed per-render or per-frame

### Cached Lookups
- Tree index lookup is O(1) - simple arithmetic
- Affinity lookup is O(1) - Map.get()
- Group color lookup is O(1) - object property access

### Memory
- `affinityMap` stores: `numTrees × numTaxa × (string pointer)`
- For 100 trees × 100 taxa ≈ 10K entries ≈ negligible

---

## Integration with Pivot Edge

The pivot edge (`pivotEdgeTracking`) tells us which taxa are currently "in motion":

```javascript
export function getMovingTaxaForTree(treeIndex, pivotEdgeTracking) {
  const pivotEdge = pivotEdgeTracking[treeIndex];
  if (!pivotEdge) return new Set(); // Original tree, no movers
  return new Set(pivotEdge); // Taxa IDs in the pivot
}
```

### Enhanced Visualization Options

| Taxon Status                 | Color Treatment                   |
| ---------------------------- | --------------------------------- |
| Stable, clear group affinity | Solid group color                 |
| Moving (in pivot)            | Striped/hatched OR gradient blend |
| Ambiguous affinity           | Gray                              |

This lets users see which sequences are phylogenetically stable vs "jumping" (potential recombinants).

---

## Future Enhancements

1. **Breakpoint markers**: Vertical lines where color transitions
2. **Uncertainty shading**: Fade opacity where affinity confidence is low
3. **Animation sync**: Highlight current window's region as animation plays
4. **Export**: Generate static painted alignment image
5. **Bootstrap integration**: Use bootstrap support to weight affinity confidence
