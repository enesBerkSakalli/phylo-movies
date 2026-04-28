# Performance Loop Audit - PhyloMovies

This document maps slow loop patterns in the codebase with severity ratings and replacement plans.

---

## 🔴 CRITICAL (60fps hot paths - fix immediately)

### 1. AnimationStageDetector - Set recreation every call

**File:** [animationStageDetector.js](src/js/treeVisualisation/deckgl/interpolation/stages/animationStageDetector.js#L23-L24)

```js
// CURRENT (O(n) allocation + O(n) iteration EVERY call)
const fromIds = new Set(dataFrom.nodes.map(n => n.id));
const toIds = new Set(dataTo.nodes.map(n => n.id));
```

**Impact:** Called every frame during animation. For 10,000 nodes = 20,000 allocations/frame = major GC pressure.

**Status:** ✅ ALREADY MITIGATED - AnimationRunner caches stage detection result via `_stageCache`

**Further optimization:**
```js
// Pre-build ID sets in InterpolationCache when data is computed
// Pass sets to detectAnimationStage instead of building them
export function detectAnimationStage(dataFrom, dataTo, precomputedSets) {
  const { fromIds, toIds } = precomputedSets || buildSets(dataFrom, dataTo);
  // ...
}
```

---

### 2. LabelLayers - Double filter() in hot path

**File:** [LabelLayers.js](src/js/treeVisualisation/deckgl/layers/factory/labels/LabelLayers.js#L48-L68)

```js
// CURRENT: Two separate filter() calls with same labels array
const sourceLabels = labels.filter(label => isLabelSource(cached, label) && !isLabelDestination(cached, label));
const destinationLabels = labels.filter(label => isLabelDestination(cached, label));
```

**Impact:** Labels array iterated twice during every layer update. For 5000 labels = 10,000 iterations.

**Replacement:**
```js
// Single-pass partitioning
export function partitionLabels(labels, cached) {
  const source = [];
  const destination = [];
  const regular = [];

  for (let i = 0, len = labels.length; i < len; i++) {
    const label = labels[i];
    const isDest = isLabelDestination(cached, label);
    const isSrc = isLabelSource(cached, label);

    if (isDest) destination.push(label);
    else if (isSrc) source.push(label);
    else regular.push(label);
  }
  return { source, destination, regular };
}
```

---

### 3. StaticRenderer - Array spread + forEach in render

**File:** [StaticRenderer.js](src/js/treeVisualisation/deckgl/layers/factory/labels/LabelLayers.js#L85-L89)

```js
// CURRENT: Creates new array + forEach callback overhead
[
  ...layerData.nodes,
  ...(layerData.links || []),
  ...(layerData.labels || []),
  ...(layerData.extensions || [])
].forEach(d => d.treeSide = 'left');
```

**Impact:** Every static render creates temp array + 4 spread operations + forEach overhead.

**Replacement:**
```js
// In-place mutation with for loops
function tagTreeSide(layerData, side) {
  const arrays = [layerData.nodes, layerData.links, layerData.labels, layerData.extensions];
  for (let a = 0; a < arrays.length; a++) {
    const arr = arrays[a];
    if (!arr) continue;
    for (let i = 0, len = arr.length; i < len; i++) {
      arr[i].treeSide = side;
    }
  }
}
```

---

### 4. ComparisonModeRenderer - Same spread+forEach pattern

**File:** [ComparisonModeRenderer.js](src/js/treeVisualisation/comparison/ComparisonModeRenderer.js#L166)

```js
// CURRENT: Same anti-pattern as StaticRenderer
[...(data.nodes || []), ...(data.links || []), ...(data.extensions || []), ...(data.labels || [])].forEach(d => d.treeSide = side);
```

**Replacement:** Same `tagTreeSide()` helper function.

---

## 🟡 MEDIUM (Called per transition, not per frame)

### 5. find() for anchor index lookup

**Files:** Multiple locations use same pattern:
- [AnimationRunner.js](src/js/treeVisualisation/systems/AnimationRunner.js#L262)
- [StaticRenderer.js](src/js/treeVisualisation/systems/StaticRenderer.js#L42)
- [useTreeController.js](src/hooks/useTreeController.js#L200)
- [playbackSlice.js](src/js/core/slices/playbackSlice.js#L136)

```js
// CURRENT: O(n) linear search
const rightIdx = full.find((i) => i > fromIndex) ?? full[full.length - 1];
```

**Impact:** Anchor arrays typically <100 elements, so not critical. BUT called repeatedly.

**Replacement:**
```js
// Pre-build anchor lookup when transitionResolver changes
class AnchorIndex {
  constructor(anchors) {
    this._sorted = [...anchors].sort((a, b) => a - b);
  }

  findNextAnchor(afterIndex) {
    // Binary search O(log n)
    let lo = 0, hi = this._sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._sorted[mid] <= afterIndex) lo = mid + 1;
      else hi = mid;
    }
    return lo < this._sorted.length ? this._sorted[lo] : this._sorted[this._sorted.length - 1];
  }
}
```

---

### 6. NodeGeometryBuilder - forEach for node sizes

**File:** [NodeGeometryBuilder.js](src/js/treeVisualisation/deckgl/builders/geometry/nodes/NodeGeometryBuilder.js#L45)

```js
// CURRENT: forEach with callback overhead
nodes.forEach(node => {
  const nodeKey = getNodeKey(node);
  const isLeaf = !node.children || node.children.length === 0;
  // ...
});
```

**Replacement:**
```js
// for-i loop
for (let i = 0, len = nodes.length; i < len; i++) {
  const node = nodes[i];
  const nodeKey = getNodeKey(node);
  const isLeaf = !node.children || node.children.length === 0;
  // ...
}
```

---

### 7. TreeNodeInteractionHandler - find() for node picking

**File:** [TreeNodeInteractionHandler.js](src/js/treeVisualisation/interaction/TreeNodeInteractionHandler.js#L73)

```js
// CURRENT: O(n) search through all descendants
return allNodes.find(node => {
  return Math.abs(node.x - targetX) < tolerance && Math.abs(node.y - targetY) < tolerance;
});
```

**Impact:** Called on click/hover - not hot path but could be faster.

**Replacement:**
```js
// Build spatial index when layout changes (using simple grid)
class SpatialNodeIndex {
  constructor(nodes, cellSize = 0.1) {
    this.cells = new Map();
    this.cellSize = cellSize;
    for (const node of nodes) {
      const key = this._cellKey(node.x, node.y);
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(node);
    }
  }

  _cellKey(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  findNear(x, y, tolerance) {
    // Check current cell + neighbors
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.cells.get(`${cx + dx},${cy + dy}`);
        if (!cell) continue;
        for (const node of cell) {
          if (Math.abs(node.x - x) < tolerance && Math.abs(node.y - y) < tolerance) {
            return node;
          }
        }
      }
    }
    return null;
  }
}
```

---

## 🟢 LOW (One-time or rare operations)

### 8. ElementMatcher - Map creation per interpolation

**File:** [ElementMatcher.js](src/js/treeVisualisation/deckgl/interpolation/ElementMatcher.js#L61)

```js
// CURRENT
_createElementMap(elements) {
  return new Map(elements.map(el => [el.id, el]));
}
```

**Status:** ✅ ALREADY OPTIMIZED - `TreeInterpolator._updateMapCache()` caches these maps and only rebuilds when data references change.

---

### 9. SubtreeConnectorBuilder - Nested loops

**File:** [SubtreeConnectorBuilder.js](src/js/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js#L283-L300)

```js
// CURRENT: O(n*m) for each leaf × each subtree set
for (var entry of leftPositions.entries()) {
  // ...
  for (var i = 0; i < jumpingSubtreeSets.length; i += 1) {
    if (isSubsetOf(splitIndices, subtreeSet)) { /* ... */ }
  }
}
```

**Status:** This is inherent to the algorithm (checking which subtree each leaf belongs to). Could optimize `isSubsetOf` with bloom filters for large subtree sets, but likely not worth the complexity.

---

### 10. ClipboardLayerFactory - map() with spread

**File:** [ClipboardLayerFactory.js](src/js/treeVisualisation/deckgl/layers/factory/clipboard/ClipboardLayerFactory.js#L72-L76)

```js
// CURRENT: Creates new objects for each element
const clipNodes = nodes?.map(n => ({ ...n, treeSide: 'clipboard' }));
```

**Impact:** Only runs when clipboard is active. Not hot path.

**Status:** Acceptable - could optimize to in-place mutation if clipboard becomes frequent.

---

## 📊 Summary Priority Matrix

| Priority | File                       | Issue              | Status                      |
| -------- | -------------------------- | ------------------ | --------------------------- |
| 🔴 HIGH   | LabelLayers.js             | Double filter()    | ✅ FIXED - partitionLabels() |
| 🔴 HIGH   | StaticRenderer.js          | Spread + forEach   | ✅ FIXED - tagTreeSide()     |
| 🔴 HIGH   | ComparisonModeRenderer.js  | Spread + forEach   | ✅ FIXED - tagTreeSide()     |
| 🟡 MED    | Multiple                   | find() for anchors | ⏳ Pending                   |
| 🟡 MED    | NodeGeometryBuilder        | forEach → for-i    | ⏳ Pending                   |
| 🟡 MED    | TreeNodeInteractionHandler | find() for picking | ⏳ Pending                   |
| 🟢 LOW    | animationStageDetector     | Set creation       | Already cached              |
| 🟢 LOW    | ElementMatcher             | Map creation       | Already cached              |

---

## 🛠️ Recommended Libraries

| Library                                                              | Use Case                       | Install                 |
| -------------------------------------------------------------------- | ------------------------------ | ----------------------- |
| **[mnemonist](https://www.npmjs.com/package/mnemonist)**             | BiMap, LRUCache, Bloom filters | `npm i mnemonist`       |
| **[fast-deep-equal](https://www.npmjs.com/package/fast-deep-equal)** | Object comparison              | `npm i fast-deep-equal` |
| **[rbush](https://www.npmjs.com/package/rbush)**                     | Spatial index for node picking | `npm i rbush`           |

---

## 🎯 Implementation Plan

### Phase 1: Quick Wins (1 hour)
1. [ ] Create `tagTreeSide()` helper, replace spread+forEach in StaticRenderer + ComparisonModeRenderer
2. [ ] Replace forEach with for-i in NodeGeometryBuilder

### Phase 2: Label Optimization (2 hours)
3. [ ] Create `partitionLabels()` single-pass function
4. [ ] Update LabelLayers to use partitioned data

### Phase 3: Anchor Index (2 hours)
5. [ ] Create `AnchorIndex` class with binary search
6. [ ] Update all find() calls for anchor lookup

### Phase 4: Spatial Picking (Optional, 3 hours)
7. [ ] Add rbush or custom grid index for node picking
8. [ ] Update TreeNodeInteractionHandler to use spatial index
