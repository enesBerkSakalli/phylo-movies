# Velocity Normalisation for Phylogenetic Tree Morphing

## 1. Problem Statement

When morphing between two phylogenetic trees on a radial layout, all visual elements share the same global eased time parameter `t ∈ [0, 1]`. Two separate velocity problems arise:

1. **Angular velocity** (REORDER): Elements with large angular displacements sweep faster than those with small displacements during subtree rotation.
2. **Radial velocity** (branch length changes): Branches that change length (collapse to zero or expand from zero) travel different radial distances — a long branch reaches zero faster than a short branch, even though both should settle at the same rate.

The goal is **uniform velocity for both dimensions**: every element moves at the same angular speed during rotation, and every branch collapses/expands at the same radial speed during length changes.

## 2. The Three Animation Stages

The backend (BranchArchitect) decomposes a tree-to-tree transition into a **5-step surgery** per active-changing split:

```
IT{i}_down_{j}   → Apply reference weights to target topology    (branch lengths change)
C{i}_{j}         → Remove zero-length branches                   (topology change)
C{i}_{j}_reorder → Match reference node ordering                 (angular reorder)
IT{i}_up_{j}     → Reference topology with target weights        (branch lengths change)
IT{i}_ref_{j}    → Complete transformation with reference weights (branch lengths change)
```

On the frontend, consecutive transition frames fall into three stages detected by `animationStageDetector.js`:

| Stage | What happens | Frontend detection |
|-------|-------------|-------------------|
| **COLLAPSE** | Remove zero-length branches | Nodes in `fromTree` missing from `toTree` |
| **EXPAND** | Insert zero-length branches | Nodes in `toTree` missing from `fromTree` |
| **REORDER** | Same topology, different positions and/or branch lengths | Same node IDs in both trees |

**Key insight:** Branch length changes (steps 1, 4, 5) produce **REORDER** frames, not COLLAPSE/EXPAND. During these REORDER frames, matched elements have both angular changes (Δθ) and radial changes (Δr = branch length difference).

Each stage receives its own easing curve:
- COLLAPSE → `ease-out` (fast start, slow settle as branches vanish)
- EXPAND → `ease-in` (slow start, accelerating as branches spring into existence)
- REORDER → `ease-in-out` (S-curve for smooth transitions)

## 3. Two-Dimensional Velocity Normalisation

During REORDER frames, elements can move in two orthogonal dimensions in polar space:

| Dimension | What changes | Example |
|-----------|-------------|---------|
| **Angular** (Δθ) | Subtree rotates to new position | A subtree moves from 45° to 120° |
| **Radial** (Δr) | Branch length changes | A branch of length 0.3 collapses to 0 |

Both should be normalised with the same strategy: **find the longest path, make it the reference, and let shorter paths arrive early.**

### 3.1 Angular Velocity Normalisation (implemented)

For each matched element, compute the angular displacement `|Δθ|` (with root-crossing avoidance). The element with the largest angular displacement uses the raw `t`; all others get:

```
elementT_angular = min(1, t × maxΔθ / elementΔθ)
```

### 3.2 Radial Velocity Normalisation (proposed)

For each matched element, compute the radial displacement:

| Element type | Radial distance |
|-------------|----------------|
| **Node** | `|toNode.polarPosition - fromNode.polarPosition|` |
| **Label** | `|toLabel.polarPosition - fromLabel.polarPosition|` (label ring may shift) |
| **Link** | `|toLink.polarData.target.radius - fromLink.polarData.target.radius|` (child end) |
| **Extension** | `|toExt.polarData.source.radius - fromExt.polarData.source.radius|` (leaf end shifts) |

The element with the largest radial displacement uses the raw `t`; all others get:

```
elementT_radial = min(1, t × maxΔr / elementΔr)
```

### 3.3 Combining Angular and Radial

A single REORDER frame can have **both** angular and radial changes simultaneously (e.g., a branch that both rotates and changes length). The question: how to combine them?

**Option A — Independent normalisation (recommended)**

Normalise angular and radial independently. Each element gets TWO remapped t values — one for its angular interpolation, one for its radial interpolation. The `PolarNodeInterpolator.interpolatePosition()` already computes radius and angle separately:

```js
const interpolatedRadius = lerp(fromR, toR, elementT_radial);   // radial normalised
const interpolatedAngle  = fromAngle + delta * elementT_angular; // angular normalised
```

This means an element can arrive at its target angle before arriving at its target radius (or vice versa), which is physically coherent — the angular sweep and the radial stretch are independent motions.

**Option B — Combined path length**

Compute a single polar path length combining both dimensions:

```
pathLength = sqrt((avgR × Δθ)² + (Δr)²)
```

This gives a single `elementT` per element. Simpler, but couples two independent motions.

**Option A is recommended** because angular and radial motions are decoupled in the polar interpolation code. They use different easing characteristics and normalising them independently preserves this separation.

### 3.4 The Reference: Longest Path

For both angular and radial normalisation, the reference is the **global maximum** across ALL element types (nodes, labels, links, extensions):

- `maxΔθ` = largest angular displacement among any element of any type
- `maxΔr` = largest radial displacement among any element of any type

This ensures the entire tree transitions as one coherent unit. A node with a tiny radial change finishes its collapse quickly while a node with a long branch collapses at the same radial speed.

## 4. COLLAPSE / EXPAND Stages — No Normalisation

During COLLAPSE/EXPAND frames (topology changes — nodes being inserted/removed):

- **Exiting/entering elements** are not smoothly interpolated. They snap in/out with `isEntering`/`isExiting` flags. No velocity map applies.
- **Matched elements** barely move (topology is nearly identical minus the zero-length branch being removed/inserted).
- Angular and radial displacements are negligible.

**No velocity normalisation is applied.** The easing curve alone handles the perceptual timing.

## 5. Implementation Design

### 5.1 VelocityNormalizer Changes

Add radial distance computation alongside existing angular distance:

```js
// New export
export function computeRadialDistance(fromNode, toNode) {
  if (!fromNode || !toNode) return 0;
  const fromR = fromNode.polarPosition ?? fromNode.radius ?? 0;
  const toR = toNode.polarPosition ?? toNode.radius ?? 0;
  return Math.abs(toR - fromR);
}

// New export
export function computeRadialDistances(fromMap, toMap) {
  // Same pattern as computeAngularDistances, but for radius
}

// Extend buildGlobalVelocityMaps
export function buildGlobalVelocityMaps(angularDistanceMaps, radialDistanceMaps, t) {
  // Find global max angular distance → maxΔθ
  // Find global max radial distance  → maxΔr
  // For each element: compute angularT and radialT
  // Return { velocityMaps: { type → Map<id, { angularT, radialT }> }, maxAngle, maxRadius }
}
```

### 5.2 Velocity Map Shape Change

Current velocity map: `Map<id, number>` (single remapped t).

New velocity map: `Map<id, { angularT: number, radialT: number }>` (two remapped t values).

### 5.3 Interpolator Changes

`PolarNodeInterpolator.interpolatePosition()` currently uses a single `t` for both radius and angle. With dual normalisation:

```js
interpolatePosition(fromNode, toNode, t, velocityEntry) {
  const angularT = velocityEntry?.angularT ?? t;
  const radialT  = velocityEntry?.radialT ?? t;

  const interpolatedRadius = lerp(fromR, toR, radialT);
  const interpolatedAngle  = fromAngle + delta * angularT;
  // ... convert to Cartesian
}
```

Similarly for `PolarPathInterpolator`, `PolarLabelInterpolator`, `PolarExtensionInterpolator`.

### 5.4 ElementMatcher Changes

Currently passes a single `elementT` to the interpolation function. Needs to pass the velocity entry `{ angularT, radialT }` so the interpolator can split them:

```js
const elementVelocity = velocityMap?.get(id) ?? null;
// Pass to interpolateFn which forwards to the polar interpolator
```

### 5.5 Stage Gating

Thread `stage` from `AnimationRunner` → `InterpolationRenderer` → `TreeInterpolator`:

```js
if (stage === 'REORDER') {
  // Compute angular + radial distances, build velocity maps
} else {
  // COLLAPSE/EXPAND — no velocity maps, use raw t for everything
}
```

### 5.6 Link/Extension Radial Distance

For links, the radial change of interest is the **target end** (child node), since that's the tip of the branch that collapses/expands:

```js
function _polarRadiusMap(elementMap) {
  const result = new Map();
  for (const [id, el] of elementMap) {
    result.set(id, {
      polarPosition: el.polarData?.target?.radius ?? 0
    });
  }
  return result;
}
```

## 6. Call Chain

```
AnimationRunner._processFrame()
  → detectAnimationStage() → stage
  → applyStageEasing(localT, stage) → easedT
  → _render(state, fromTree, toTree, easedT, fromIndex, toIndex, stage)
      → renderSingleFrame(fromTree, toTree, easedT, { stage, ... })
          → TreeInterpolator.interpolateTreeData(dataFrom, dataTo, t, branchTransformation, stage)
              if REORDER:
                → computeAngularDistances() for all types
                → computeRadialDistances() for all types
                → buildGlobalVelocityMaps(angularMaps, radialMaps, t)
                → pass { angularT, radialT } per element to interpolators
              else:
                → raw t, no velocity maps
```

## 7. Summary

| Stage | Angular normalisation | Radial normalisation | Reference |
|-------|----------------------|---------------------|-----------|
| COLLAPSE | None | None | — |
| EXPAND | None | None | — |
| REORDER | `elementT = min(1, t × maxΔθ / Δθ)` | `elementT = min(1, t × maxΔr / Δr)` | Global max across all element types |

Both normalisations use the "early arrival" strategy: elements with shorter displacements arrive first and hold at their target. The element with the longest path (angular or radial, independently) dictates the animation duration for that dimension.
