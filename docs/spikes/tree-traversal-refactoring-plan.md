# Tree Traversal Anti-Pattern Refactoring Plan

## Overview

This document maps all instances of manual tree traversal that could be replaced with D3 hierarchy methods, categorizes them by severity and fixability, and provides a prioritized refactoring plan.

---

## Anti-Pattern Categories

### Category A: Direct D3 Method Replacement (Easy Fix)
These functions receive D3 hierarchy nodes and can directly use D3 methods.

### Category B: Dual-Mode Support Needed (Medium Fix)
Functions that might receive either D3 hierarchy nodes OR raw tree data. Need runtime detection.

### Category C: Justified Manual Traversal (No Fix Needed)
Functions where manual traversal is necessary due to mutation, accumulation, or specific ordering requirements.

---

## Detailed Mapping

### 1. `monophyleticColoring.js` - **Category A** ✅ FIXED

| Function                       | Line  | Pattern                     | D3 Replacement                         | Status  |
| ------------------------------ | ----- | --------------------------- | -------------------------------------- | ------- |
| `getSubtreeLeaves()`           | 52-67 | Manual leaf name collection | `node.leaves().map(l => l.data?.name)` | ✅ Fixed |
| `_collectLeafNamesRecursive()` | 73-83 | Fallback for raw nodes      | Keep as fallback                       | ✅ Added |

**Context**: Nodes come from `linkData.target` which originates from `tree.links()` - always D3 hierarchy.

---

### 2. `subtreeExtractor.js` - **Category B** ✅ FIXED

| Function           | Line    | Pattern                      | D3 Replacement                    | Status  |
| ------------------ | ------- | ---------------------------- | --------------------------------- | ------- |
| `getDescendants()` | 94-106  | Manual descendant collection | `node.descendants()`              | ✅ Fixed |
| `getLeaves()`      | 112-127 | Manual leaf collection       | `node.leaves()`                   | ✅ Fixed |
| `_cloneNode()`     | 47-63   | Manual tree cloning          | **Keep manual** (mutation)        | N/A     |
| `_nodeToNewick()`  | 68-87   | Manual newick generation     | **Keep manual** (string building) | N/A     |

**Context**: Used by context menu for subtree extraction. May receive either D3 or raw nodes.

---

### 3. `RadialTreeLayout.js` - **Category C** (Justified)

| Function           | Line    | Pattern                     | Reason to Keep Manual                                                     |
| ------------------ | ------- | --------------------------- | ------------------------------------------------------------------------- |
| `indexLeafNodes()` | 32-46   | Pre-order with counter      | Modifies `node.index` during traversal, needs return value accumulation   |
| `calcRadius()`     | 100-113 | Recursive with accumulator  | Modifies `node.radius` during traversal, passes accumulated radius down   |
| `calcAngle()`      | 124-155 | Post-order with aggregation | Computes `node.angle` from children's angles, complex aggregation pattern |

**Why Not Use D3**: These methods **mutate** nodes during traversal and require return values or accumulators that D3's `.each()` doesn't support well.

---

### 4. `TidyTreeLayout.js` - **Category C** (Justified)

| Function       | Line  | Pattern                    | Reason to Keep Manual                                        |
| -------------- | ----- | -------------------------- | ------------------------------------------------------------ |
| `calcRadius()` | 55-70 | Recursive with accumulator | Same as RadialTreeLayout - modifies nodes, needs accumulator |

---

### 5. `branchTransform.js` - **Category B** (Could Improve)

| Function                               | Line    | Pattern                   | D3 Alternative                                        | Priority |
| -------------------------------------- | ------- | ------------------------- | ----------------------------------------------------- | -------- |
| `_applyIgnoreBranchLengthsRecursive()` | 82-97   | Manual mutation traversal | `root.each(n => { n.length = 1; })`                   | **LOW**  |
| `_applyTransformationRecursive()`      | 104-123 | Manual mutation traversal | `root.each(n => { n.length = transform(n.length); })` | **LOW**  |

**Assessment**: These operate on raw tree data BEFORE `d3.hierarchy()` is applied, so D3 methods are NOT available. Keep manual.

---

### 6. `scaleUtils.js` - **Category C** (Justified)

| Function            | Line  | Pattern                         | Reason to Keep Manual                                      |
| ------------------- | ----- | ------------------------------- | ---------------------------------------------------------- |
| `_calculateScale()` | 86-98 | Post-order with max aggregation | Computes max radius recursively, returns value up the tree |

**Why Not Use D3**: This is computing a max depth by summing branch lengths. D3's `.sum()` doesn't work for this pattern (it's bottom-up aggregation, not summation).

---

### 7. Leaf Detection Patterns - **Category A** (Consistency Fix)

| File                     | Line  | Current Pattern                                  | Standardized Pattern |
| ------------------------ | ----- | ------------------------------------------------ | -------------------- |
| `projections.js`         | 41    | `!node.children \|\| node.children.length === 0` | `!node.children`     |
| `NodeGeometryBuilder.js` | 47    | `!node.children \|\| node.children.length === 0` | `!node.children`     |
| `NodeDataBuilder.js`     | 36-37 | `!node.children`                                 | ✅ Already correct    |
| `RadialTreeLayout.js`    | 35    | `!("children" in node)`                          | `!node.children`     |

**Recommendation**: Standardize on `!node.children` (D3 hierarchy nodes always have `children` as `undefined` for leaves, not an empty array).

---

## Refactoring Priority

### ✅ Phase 1: Completed
- [x] `monophyleticColoring.js` - Use `node.leaves()` with fallback
- [x] `subtreeExtractor.js` - Use `node.descendants()` and `node.leaves()` with fallbacks

### 🔜 Phase 2: Consistency (Low Effort, Low Risk)
- [ ] Standardize leaf detection pattern across codebase
- [ ] Add JSDoc type annotations for tree parameters

### ⏸️ Phase 3: Deferred (No Change Needed)
- RadialTreeLayout.js - Keep manual (justified)
- TidyTreeLayout.js - Keep manual (justified)
- branchTransform.js - Keep manual (raw data, not D3)
- scaleUtils.js - Keep manual (justified aggregation)

---

## Code Pattern Reference

### ✅ Preferred: D3 Method with Fallback
```javascript
function getLeaves(node) {
  if (!node) return [];

  // Use D3's built-in method when available
  if (typeof node.leaves === 'function') {
    return node.leaves();
  }

  // Fallback for raw tree data
  return _collectLeavesManual(node);
}
```

### ✅ Preferred: Leaf Detection
```javascript
// D3 hierarchy nodes have children=undefined for leaves
const isLeaf = !node.children;
```

### ⚠️ Avoid (Unless Justified)
```javascript
// Manual recursion when D3 method exists
function getLeaves(node) {
  if (!node.children) return [node];
  return node.children.flatMap(getLeaves);
}
```

### ✅ Justified Manual Traversal
```javascript
// Accumulator pattern - D3's .each() can't return values
function calcRadius(node, radius = 0) {
  node.radius = node.data.length + radius;
  if (node.children) {
    node.children.forEach(child => {
      calcRadius(child, node.radius);
    });
  }
}
```

---

## Testing Checklist

After Phase 1 changes:
- [ ] Run `npm test` - full test suite
- [ ] Test tree rendering with various datasets
- [ ] Test monophyletic coloring in UI
- [ ] Test subtree extraction via context menu
- [ ] Test comparison mode (uses subtreeExtractor)

---

## Summary

| Category          | Files                                                         | Action                          |
| ----------------- | ------------------------------------------------------------- | ------------------------------- |
| **A: Direct Fix** | monophyleticColoring.js                                       | ✅ Done                          |
| **B: Dual-Mode**  | subtreeExtractor.js                                           | ✅ Done                          |
| **C: Justified**  | RadialTreeLayout, TidyTreeLayout, branchTransform, scaleUtils | No change                       |
| **Consistency**   | 4 files with leaf detection                                   | Standardize to `!node.children` |
