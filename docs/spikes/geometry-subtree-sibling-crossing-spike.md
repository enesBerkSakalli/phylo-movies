---
title: "Subtree Animation Sibling Crossing Prevention"
category: "Geometry"
status: "🟢 Complete"
priority: "High"
timebox: "3 days"
created: 2026-02-02
updated: 2026-02-02
owner: "Berk Sakalli"
tags: ["technical-spike", "geometry", "animation", "interpolation", "radial-tree"]
---

# Subtree Animation Sibling Crossing Prevention

## Summary

**Spike Objective:** Determine the correct geometric approach to prevent animated subtrees from visually crossing through sibling branches (and the root) during radial tree interpolation.

**Why This Matters:** Current linear polar interpolation causes subtrees to take "shortest path" trajectories that may pass through the root/center of the tree, crossing sibling branches. This violates tree planarity and creates confusing visualizations where branches temporarily intersect.

**Timebox:** 3 days

**Decision Deadline:** Before next frontend release - this is a core visual correctness issue.

## Research Question(s)

**Primary Question:** What geometric interpolation strategy ensures subtrees move around the tree perimeter (preserving sibling separation) rather than through the center when transitioning between positions?

**Secondary Questions:**

- How do we detect when a node's interpolation path would cross through a sibling's angular sector?
- Should we use arc-based (constant radius) interpolation vs spiral paths?
- How do we maintain hierarchical coherence (children following parent paths) during animation?
- What is the computational cost of more sophisticated path planning?

## Investigation Plan

### Research Tasks

- [ ] Analyze current `PolarNodeInterpolator.interpolatePosition()` behavior
- [ ] Map out the geometric constraints for valid subtree movement paths
- [ ] Prototype arc-based interpolation that maintains minimum radius
- [ ] Test with known "crossing" cases (e.g., taxon moving from 10° to 350°)
- [ ] Evaluate hierarchical parent-following interpolation approach
- [ ] Benchmark performance of candidate solutions
- [ ] Document findings and recommendations

### Success Criteria

**This spike is complete when:**

- [ ] Root cause geometrically characterized (why current approach crosses siblings)
- [ ] At least 2 candidate solutions prototyped and tested
- [ ] Clear recommendation with visual evidence (before/after animations)
- [ ] Performance impact quantified
- [ ] Implementation plan documented

## Technical Context

**Related Components:**

- `src/js/treeVisualisation/deckgl/interpolation/nodes/PolarNodeInterpolator.js`
- `src/js/treeVisualisation/deckgl/interpolation/path/PolarPathInterpolator.js`
- `src/js/treeVisualisation/deckgl/interpolation/TreeInterpolator.js`
- `src/js/treeVisualisation/layout/RadialTreeGeometry.js`
- `src/js/domain/math/mathUtils.js` (shortestAngle, unwrapAngle)

**Dependencies:**

- Backend provides `subtree_highlight_tracking` data identifying per-frame subtree highlight groups
- Layout system provides polar coordinates (angle, radius) for each node

**Constraints:**

- Must maintain 60fps animation performance
- Must work for both forward and backward scrubbing
- Must handle arbitrary tree sizes (10 to 1000+ taxa)
- Should integrate with existing `subtreeRigidMode` concept

## Geometric Analysis

### Current Behavior (Problem)

```
Polar interpolation from (r₁, θ₁) to (r₂, θ₂):

   r(t) = r₁ + (r₂ - r₁) × t
   θ(t) = θ₁ + shortestAngle(θ₁, θ₂) × t

   x(t) = r(t) × cos(θ(t))
   y(t) = r(t) × sin(θ(t))
```

When `shortestAngle` produces a path through 0° (or any sibling's sector), the node visually crosses through the center/siblings.

**Example:**
- Node at (100, 10°) → (100, 350°)
- Shortest angle = -20° (through 0°)
- At t=0.5: position is (100, 0°)
- **Problem:** Angle 0° is where a sibling branch may be located

### Geometric Constraint

In a radial tree layout:
1. **Root is at center** (0, 0)
2. **Siblings are separated by the root** - they occupy different angular sectors
3. **Subtree moving left→right should go AROUND**, not THROUGH

```
        ✗ Wrong path (through center/siblings)

        B ←-------- + --------→ B'
       /            ↑            \
      /         (root)            \
     /                             \
    A                               C


        ✓ Correct path (around perimeter)

        B ←------------------→ B'
       /    ↖               ↗    \
      /       ←  around  →        \
     /                             \
    A                               C
```

### Candidate Solutions

#### Solution A: "Long Arc" Interpolation (Simplified - Root Only)

**Key Insight:** The forbidden sector is simply the root position (angle ≈ 0° or the layout's rotation offset). When the shortest angular path crosses through 0°, take the long way around instead.

```javascript
function interpolateAngle(fromAngle, toAngle, t, rootAngle = 0) {
  const shortDelta = shortestAngle(fromAngle, toAngle);

  // Check if short path crosses the root angle (0° by default)
  if (crossesRootAngle(fromAngle, fromAngle + shortDelta, rootAngle)) {
    // Take the long arc instead
    const longDelta = -Math.sign(shortDelta) * (2 * Math.PI - Math.abs(shortDelta));
    return fromAngle + longDelta * t;
  }

  return fromAngle + shortDelta * t;
}

function crossesRootAngle(startAngle, endAngle, rootAngle) {
  // Normalize angles to [0, 2π)
  const normalize = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const start = normalize(startAngle);
  const end = normalize(endAngle);
  const root = normalize(rootAngle);

  // Check if root is between start and end (considering wrap-around)
  if (start <= end) {
    return root >= start && root <= end;
  } else {
    // Path wraps around 0
    return root >= start || root <= end;
  }
}
```

**Pros:** Very simple, no complex sector computation needed, just check if path crosses root angle
**Cons:** May produce longer animation paths (but this is geometrically correct)

#### Solution B: Constant-Radius Arc Path

Force the path to maintain maximum radius during angular transition:

```javascript
function interpolatePosition(fromNode, toNode, t) {
  const r1 = fromNode.polarRadius;
  const r2 = toNode.polarRadius;
  const θ1 = fromNode.angle;
  const θ2 = toNode.angle;

  // Phase 1 (t < 0.3): Expand to max radius
  // Phase 2 (0.3 ≤ t ≤ 0.7): Arc at constant radius
  // Phase 3 (t > 0.7): Contract to final radius

  const maxRadius = Math.max(r1, r2) * 1.1; // Slightly outside

  if (t < 0.3) {
    // Expand phase
    const localT = t / 0.3;
    const r = r1 + (maxRadius - r1) * localT;
    return polarToCartesian(r, θ1);
  } else if (t <= 0.7) {
    // Arc phase
    const localT = (t - 0.3) / 0.4;
    const θ = θ1 + (θ2 - θ1) * localT; // Can use long arc here
    return polarToCartesian(maxRadius, θ);
  } else {
    // Contract phase
    const localT = (t - 0.7) / 0.3;
    const r = maxRadius + (r2 - maxRadius) * localT;
    return polarToCartesian(r, θ2);
  }
}
```

**Pros:** Guarantees path stays outside tree, smooth arc motion
**Cons:** More complex, requires phase coordination across subtree

#### Solution C: Hierarchical Parent-Following

Interpolate parent nodes first, derive child positions relative to parent:

```javascript
function interpolateSubtree(subtreeNodes, t) {
  // Sort by depth (parents first)
  const sorted = subtreeNodes.sort((a, b) => a.depth - b.depth);
  const interpolatedPositions = new Map();

  for (const node of sorted) {
    if (node.isRoot) {
      // Root interpolates normally
      interpolatedPositions.set(node.id, interpolatePosition(node.from, node.to, t));
    } else {
      // Child follows parent, maintaining relative offset
      const parentPos = interpolatedPositions.get(node.parentId);
      const relativeOffset = computeRelativeOffset(node.from, node.to, t);
      interpolatedPositions.set(node.id, addOffset(parentPos, relativeOffset));
    }
  }

  return interpolatedPositions;
}
```

**Pros:** Maintains hierarchy, subtree moves as unit
**Cons:** Requires tree structure during interpolation, more complex

#### Solution D: Backend Pre-computation

Have BranchArchitect generate more intermediate frames for "crossing" transitions, so frontend only does small-angle interpolation.

**Pros:** Frontend stays simple
**Cons:** Larger data payloads, doesn't solve fundamental frontend issue

## Research Findings

### Solution A: "Long Arc" - Detailed Research

#### 1. Data Structures Available at Interpolation Time

**From Node Data (NodeDataBuilder output):**
```javascript
{
  id: "node-0-1-2",           // Unique key from split_indices
  position: [x, y, 0],        // Cartesian position
  angle: 1.234,               // Polar angle (radians)
  polarPosition: 150,         // Radius (distance from root)
  split_indices: [0, 1, 2],   // Taxa indices in this subtree
  isLeaf: false,
  depth: 2,                   // Tree depth
  originalNode: node          // Reference to D3 hierarchy node
}
```

**From Backend (subtree_highlight_tracking):**
```javascript
// Per tree-index, lists taxa groups highlighted for this interpolation frame.
// This is visual context, not authoritative SPR mover ownership.
subtree_highlight_tracking[treeIndex] = [[8, 9], [17, 18]]  // Two highlighted subtree groups
```

**From Backend (affected_subtrees_by_split):**
```javascript
// Maps pivot edge → list of subtrees affected by this transition
{
  "[0,1,2,...,18]": [        // For pivot edge containing all taxa
    [[10], [8,9], [17,18]]   // Affected subtrees
  ]
}
```

#### 2. How Radial Tree Layout Assigns Angles

From `RadialTreeLayout.calcAngle()`:

1. **Leaves get indexed** (0 to n-1) in tree traversal order
2. **Leaf angle** = `(angleExtent / totalLeaves) × leafIndex`
3. **Internal node angle** = average of children angles
4. **Angular sector of subtree** = [minDescendantAngle, maxDescendantAngle]

**Key insight:** In the default layout, angles are evenly distributed across leaves. Siblings occupy **non-overlapping angular sectors**.

```
Example with 8 leaves (360°):

    Leaf 0: 0° (or 360°)
    Leaf 1: 45°
    Leaf 2: 90°
    ...
    Leaf 7: 315°

Internal node with leaves {1,2} spans sector [45°, 90°]
Internal node with leaves {6,7} spans sector [270°, 315°]
```

#### 3. Defining "Forbidden Sectors"

A **forbidden sector** for a node is the angular region occupied by any **sibling subtree** (subtrees that share the same parent but are not ancestors/descendants of the moving node).

**Algorithm to compute forbidden sectors:**

```javascript
function computeForbiddenSectors(movingNode, treeRoot) {
  const forbiddenSectors = [];

  // Get parent of moving subtree
  const parent = findParentOfSubtree(movingNode, treeRoot);
  if (!parent || !parent.children) return [];

  // For each sibling subtree
  for (const sibling of parent.children) {
    if (isAncestorOrDescendant(sibling, movingNode)) continue;

    // Get angular extent of sibling subtree
    const sector = getSubtreeAngularSector(sibling);
    forbiddenSectors.push(sector);
  }

  return forbiddenSectors;
}

function getSubtreeAngularSector(node) {
  const leaves = node.leaves ? node.leaves() : [node];
  const angles = leaves.map(l => l.angle);
  return {
    min: Math.min(...angles),
    max: Math.max(...angles)
  };
}
```

**Using `split_indices` to identify siblings:**
- Two nodes are in the same subtree if their `split_indices` have a subset relationship
- Siblings have `split_indices` that are **disjoint**

```javascript
function areSiblings(node1, node2) {
  const s1 = new Set(node1.split_indices);
  const s2 = new Set(node2.split_indices);

  // No overlap means different subtrees
  const overlap = [...s1].filter(x => s2.has(x));
  return overlap.length === 0;
}
```

#### 4. Detecting When Short Path Crosses Forbidden Sector

```javascript
function crossesForbiddenSector(fromAngle, toAngle, forbiddenSectors) {
  // Normalize angles to [0, 2π)
  const from = normalizeAngle(fromAngle);
  const to = normalizeAngle(toAngle);

  // Get short path direction
  const delta = shortestAngle(from, to);

  // Generate path as [start, end] normalized
  const pathStart = from;
  const pathEnd = normalizeAngle(from + delta);

  for (const sector of forbiddenSectors) {
    if (pathCrossesSector(pathStart, pathEnd, delta, sector)) {
      return true;
    }
  }

  return false;
}

function pathCrossesSector(start, end, delta, sector) {
  // The path goes from 'start' to 'end' with angular delta
  // Check if sector [min, max] is crossed

  const { min, max } = sector;

  // For short positive delta (CCW): start → end
  // Crosses sector if sector.min is between start and end going CCW
  if (delta > 0) {
    // Going counter-clockwise
    return isAngleInArc(min, start, start + delta) ||
           isAngleInArc(max, start, start + delta);
  } else {
    // Going clockwise
    return isAngleInArc(min, start + delta, start) ||
           isAngleInArc(max, start + delta, start);
  }
}

function isAngleInArc(angle, arcStart, arcEnd) {
  // Check if 'angle' is between arcStart and arcEnd (going CCW)
  const a = normalizeAngle(angle);
  const s = normalizeAngle(arcStart);
  const e = normalizeAngle(arcEnd);

  if (s <= e) {
    return a >= s && a <= e;
  } else {
    // Arc wraps around 0
    return a >= s || a <= e;
  }
}
```

#### 5. Long Arc Interpolation Implementation

```javascript
// Modified PolarNodeInterpolator.interpolatePosition()

interpolatePosition(fromNode, toNode, t, forbiddenSectors = []) {
  if (!fromNode || !toNode) return [0, 0, 0];

  // Radius interpolation unchanged
  const fromR = fromNode.polarPosition ?? fromNode.radius ?? 0;
  const toR = toNode.polarPosition ?? toNode.radius ?? 0;
  const interpolatedRadius = this._interpolateScalar(fromR, toR, t);

  // Angle interpolation with forbidden sector awareness
  const fromAngle = fromNode.angle || 0;
  const toAngle = toNode.angle || 0;

  let angleDelta;

  if (forbiddenSectors.length > 0) {
    const shortDelta = shortestAngle(fromAngle, toAngle);

    if (this._crossesForbiddenSector(fromAngle, shortDelta, forbiddenSectors)) {
      // Take the long arc
      angleDelta = -Math.sign(shortDelta) * (2 * Math.PI - Math.abs(shortDelta));
    } else {
      angleDelta = shortDelta;
    }
  } else {
    // No forbidden sectors - use standard shortest path
    angleDelta = shortestAngle(fromAngle, toAngle);
  }

  const interpolatedAngle = fromAngle + angleDelta * t;

  // Convert to Cartesian
  const x = interpolatedRadius * Math.cos(interpolatedAngle);
  const y = interpolatedRadius * Math.sin(interpolatedAngle);

  return [x, y, 0];
}
```

#### 6. Integration Points

**Where to compute forbidden sectors:**

Option A: **At interpolation start (per tree pair)**
```javascript
// In InterpolationCache or TreeInterpolator
prepareInterpolation(dataFrom, dataTo, treeIndex) {
  const highlightedTaxa = subtreeHighlightTracking[treeIndex]?.flat() || [];
  const forbiddenSectors = this.computeForbiddenSectorsForMovingTaxa(
    highlightedTaxa, dataFrom, dataTo
  );
  this.currentForbiddenSectors = forbiddenSectors;
}
```

Option B: **Per-node during interpolation**
- More accurate but more expensive
- Compute once per node and cache

**Passing forbidden sectors to PolarNodeInterpolator:**

```javascript
// Modified TreeInterpolator._interpolateNodes()
_interpolateNodes(fromNodes, toNodes, timeFactor, forbiddenSectors) {
  return this.elementMatcher.interpolateElements(
    fromNodes,
    toNodes,
    timeFactor,
    (from, to, t, fromNode, toNode) => {
      const nodeForbiddenSectors = this._getForbiddenSectorsForNode(
        fromNode, forbiddenSectors
      );
      return this.nodeInterpolator.interpolateNode(
        fromNode, toNode, t, nodeForbiddenSectors
      );
    }
  );
}
```

#### 7. Edge Cases and Considerations

1. **Root node has no siblings** → No forbidden sectors for root
2. **Node moving very little** → Short path unlikely to cross, use threshold
3. **Multiple forbidden sectors** → Must avoid all of them
4. **180° movement** → Ambiguous which direction; prefer direction away from center of mass of siblings
5. **Sectors wrapping around 0°** → Requires careful angle normalization
6. **Subtree rigid mode** → All nodes in subtree use same angular direction

#### 8. Performance Considerations

- Computing forbidden sectors: O(n) where n = nodes in tree
- Per-frame interpolation: O(k) where k = forbidden sectors (typically small, 1-3)
- Caching: Compute once per tree pair, not per frame
- Total overhead: ~1-2ms per transition, negligible at 60fps

#### 9. Prototype Test Cases

```javascript
// Test case 1: Node at 10° → 350° with sibling at 0°
// Expected: Takes long arc (10° → 350° going CCW through 180°)

// Test case 2: Node at 45° → 135° with sibling at 90°
// Expected: Takes long arc (45° → 135° going CW through 0°/360°)

// Test case 3: Node at 45° → 90° with no siblings in path
// Expected: Takes short arc (45° → 90° directly)
```

### Investigation Results

**Key Finding:** Solution A is viable with the following requirements:

1. **Data access:** Need `split_indices` on nodes + tree structure from `originalNode` or separate hierarchy
2. **Computation:** Forbidden sectors can be computed once per tree pair and cached
3. **Complexity:** O(n) preprocessing, O(k) per interpolation call
4. **Integration:** Modify `PolarNodeInterpolator` and `TreeInterpolator` to pass forbidden sectors

### External Resources

- [D3.js radial tree transitions](https://observablehq.com/@d3/radial-tidy-tree)
- [SVG arc path animations](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs)
- [Polar coordinate interpolation theory](https://en.wikipedia.org/wiki/Polar_coordinate_system)

## Decision

### Recommendation

**Recommend Solution A: "Long Arc" (Simplified - Root Only) with the following implementation approach:**

1. **The forbidden sector is simply the root angle** (0° or `angleOffset` from layout settings)
2. **No sibling computation needed** - just check if shortest path crosses root angle
3. **Modify `PolarNodeInterpolator.interpolatePosition()`** to detect root crossing and take long arc
4. **Apply to both nodes and paths** (links must follow same angular direction as their nodes)

### Rationale

1. **Extremely simple** - only need to check if path crosses one angle (root at 0°)
2. **No preprocessing required** - check can be done inline during interpolation
3. **Zero performance impact** - O(1) check per interpolation call
4. **No new data structures** - just use existing `fromAngle`, `toAngle`, and layout's `angleOffset`
5. **Testable** - clear edge cases (10°→350° should go the long way)

### Implementation Notes

**Implementation (< 1 day):**

1. Add `crossesRootAngle(startAngle, endAngle, rootAngle)` helper to `mathUtils.js`
2. Modify `PolarNodeInterpolator.interpolatePosition()`:
   - Get root angle (default 0, or from layout offset)
   - If `crossesRootAngle(fromAngle, toAngle)` → use long arc delta
   - Else → use short arc delta (current behavior)
3. Update `PolarPathInterpolator` to use same logic for arc paths
4. Add test cases for crossing scenarios

**Code change in `PolarNodeInterpolator.interpolatePosition()`:**
```javascript
// Current:
const toAngle = unwrapAngle(toNode.angle || 0, fromAngle);
const interpolatedAngle = fromAngle + (toAngle - fromAngle) * t;

// New:
const shortDelta = shortestAngle(fromAngle, toNode.angle || 0);
const rootAngle = 0; // or get from layout offset
const useLongArc = crossesRootAngle(fromAngle, fromAngle + shortDelta, rootAngle);
const delta = useLongArc
  ? -Math.sign(shortDelta) * (2 * Math.PI - Math.abs(shortDelta))
  : shortDelta;
const interpolatedAngle = fromAngle + delta * t;
```

**Files to modify:**
- [mathUtils.js](../src/js/domain/math/mathUtils.js) - add `crossesRootAngle()` helper
- [PolarNodeInterpolator.js](../src/js/treeVisualisation/deckgl/interpolation/nodes/PolarNodeInterpolator.js) - use long arc when crossing root
- [PolarPathInterpolator.js](../src/js/treeVisualisation/deckgl/interpolation/path/PolarPathInterpolator.js) - path consistency

### Follow-up Actions

- [x] Update `PolarNodeInterpolator.js` with new algorithm
- [x] Update `PolarPathInterpolator.js` for link consistency
- [x] Add test cases for crossing scenarios (`test/root-crossing-interpolation.test.js`)
- [ ] Update animation documentation

## Status History

| Date       | Status        | Notes                                        |
| ---------- | ------------- | -------------------------------------------- |
| 2026-02-02 | 🔴 Not Started | Spike created, geometric analysis documented |
| 2026-02-02 | 🟡 In Progress | Solution A "Long Arc" research completed     |
| 2026-02-02 | 🟢 Complete    | Implementation complete - 15 tests passing   |

---

_Last updated: 2026-02-02 by GitHub Copilot (Claude Opus 4.5)_
