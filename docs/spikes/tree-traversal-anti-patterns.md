# Tree Traversal Anti-Patterns Analysis

## Summary

The codebase has **mixed usage** of D3 hierarchy methods and manual traversal. While some files properly use D3's built-in methods (`.descendants()`, `.leaves()`, `.ancestors()`), others re-implement traversal logic manually.

---

## ✅ Good Patterns (Using D3 Methods)

These files correctly use D3's hierarchy traversal:

| File                                                                                                            | Pattern                            |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [NodeDataBuilder.js](src/js/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js#L21)                | `tree.descendants().map(...)`      |
| [LabelDataBuilder.js](src/js/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js#L17)             | `tree.leaves().map(...)`           |
| [ExtensionDataBuilder.js](src/js/treeVisualisation/deckgl/builders/data/extensions/ExtensionDataBuilder.js#L17) | `tree.leaves()`                    |
| [NodeGeometryBuilder.js](src/js/treeVisualisation/deckgl/builders/geometry/nodes/NodeGeometryBuilder.js#L15)    | `tree.descendants()`               |
| [TreeNodeInteractionHandler.js](src/js/treeVisualisation/interaction/TreeNodeInteractionHandler.js#L69)         | `currentLayout.tree.descendants()` |
| [RadialTreeLayout.js](src/js/treeVisualisation/layout/RadialTreeLayout.js#L211)                                 | `root.leaves().forEach(...)`       |
| [ChangeMetricUtils.js](src/js/treeVisualisation/utils/ChangeMetricUtils.js#L144)                                | `layout.tree.leaves()`             |

---

## ❌ Anti-Patterns Found

### 1. Manual Leaf Collection (Duplicating `node.leaves()`)

**Files:**
- [monophyleticColoring.js](src/js/treeVisualisation/systems/tree_color/monophyleticColoring.js#L50-L65)
- [subtreeExtractor.js](src/js/domain/tree/subtreeExtractor.js#L112-L123)
- [utils.ts](src/react/components/TreeStatsPanel/Shared/utils.ts#L14-L25) (TypeScript)

**Current Pattern:**
```javascript
function getSubtreeLeaves(node) {
  if (!node) return [];
  if (!node.children || node.children.length === 0) {
    const name = node.data?.name || node.name;
    return name ? [name] : [];
  }
  const leaves = [];
  node.children.forEach(child => {
    leaves.push(...getSubtreeLeaves(child));
  });
  return leaves;
}
```

**Recommended Pattern:**
```javascript
// For D3 hierarchy nodes, use built-in method
function getSubtreeLeaves(node) {
  if (!node) return [];
  // D3 hierarchy nodes have .leaves() method
  if (typeof node.leaves === 'function') {
    return node.leaves().map(leaf => leaf.data?.name || leaf.name).filter(Boolean);
  }
  // Fallback for raw tree data (non-D3 nodes)
  return _collectLeavesRecursive(node);
}
```

---

### 2. Manual Descendants Collection (Duplicating `node.descendants()`)

**File:** [subtreeExtractor.js](src/js/domain/tree/subtreeExtractor.js#L91-L103)

**Current Pattern:**
```javascript
static getDescendants(node) {
  const descendants = [node];
  if (node.children) {
    node.children.forEach(child => {
      descendants.push(...this.getDescendants(child));
    });
  }
  return descendants;
}
```

**Recommended Pattern:**
```javascript
static getDescendants(node) {
  // D3 hierarchy nodes have .descendants() method
  if (typeof node.descendants === 'function') {
    return node.descendants();
  }
  // Fallback for raw tree data
  return this._collectDescendantsRecursive(node);
}
```

---

### 3. Manual Recursive Traversal (Duplicating `.each()`)

**Files:**
- [RadialTreeLayout.js](src/js/treeVisualisation/layout/RadialTreeLayout.js#L30-L45) - `indexLeafNodes()`
- [branchTransform.js](src/js/domain/tree/branchTransform.js#L80-L125) - `_applyTransformationRecursive()`
- [scaleUtils.js](src/js/domain/tree/scaleUtils.js#L85-L95)

**Current Pattern:**
```javascript
indexLeafNodes(node, i = 0) {
  if (!("children" in node)) {
    node.index = i;
    i++;
  }
  if (node.children) {
    node.children.forEach(child => {
      i = this.indexLeafNodes(child, i);
    });
  }
  return i;
}
```

**Recommended Pattern:**
```javascript
indexLeafNodes(root) {
  let i = 0;
  // D3's .each() visits all nodes in pre-order
  root.each(node => {
    if (!node.children) {
      node.index = i++;
    }
  });
  return i;
}
```

---

### 4. Inconsistent Child Checking

The codebase uses multiple patterns for checking if a node is a leaf:

| Pattern                                          | Files                                        |
| ------------------------------------------------ | -------------------------------------------- |
| `!node.children`                                 | NodeDataBuilder.js                           |
| `!node.children \|\| node.children.length === 0` | monophyleticColoring.js, subtreeExtractor.js |
| `!("children" in node)`                          | RadialTreeLayout.js                          |
| `node.leaf`                                      | nodeWidthStyles.js                           |
| `node.height === 0`                              | (D3 idiom, not used)                         |

**Recommendation:** Standardize on one pattern:
```javascript
// Option A: D3 idiomatic (relies on hierarchy structure)
const isLeaf = !node.children;

// Option B: Defensive (handles edge cases)
const isLeaf = !Array.isArray(node.children) || node.children.length === 0;
```

---

## 🔍 When Manual Traversal is Justified

Some cases require manual traversal:

1. **Raw tree data (non-D3 nodes)**: Before `d3.hierarchy()` is applied
2. **Mutating during traversal**: D3's `.each()` shouldn't be used for mutations during iteration
3. **Custom traversal order**: Post-order, level-order, etc.
4. **Accumulator patterns**: Carrying state across recursive calls

**Example (justified):**
```javascript
// RadialTreeLayout.calcAngle() - needs to aggregate children's angles
// D3's .each() doesn't provide the return value pattern needed here
calcAngle(node, angle, countLeaves) {
  if (!node.children) {
    node.angle = (angle / countLeaves) * node.index;
  } else {
    const childrenAngle = node.children.map(c => this.calcAngle(c, angle, countLeaves));
    node.angle = childrenAngle.reduce((a, b) => a + b, 0) / childrenAngle.length;
    node.children.forEach(child => { child.parent_angle = node.angle; });
  }
  return node.angle;
}
```

---

## 📋 Refactoring Recommendations

### Priority 1: Create Utility Module

Create a centralized tree utility module that handles both D3 and raw nodes:

**File:** `src/js/domain/tree/treeTraversalUtils.js`

```javascript
/**
 * Tree traversal utilities that work with both D3 hierarchy nodes and raw tree data.
 * Prefers D3 methods when available for performance.
 */

/**
 * Get all leaf nodes from a tree node.
 * @param {Object} node - D3 hierarchy node or raw tree node
 * @returns {Array} Array of leaf nodes
 */
export function getLeaves(node) {
  if (!node) return [];
  if (typeof node.leaves === 'function') {
    return node.leaves();
  }
  return collectLeavesRaw(node);
}

/**
 * Get all leaf names from a tree node.
 * @param {Object} node - D3 hierarchy node or raw tree node
 * @returns {Array<string>} Array of leaf names
 */
export function getLeafNames(node) {
  return getLeaves(node)
    .map(leaf => leaf.data?.name || leaf.name)
    .filter(Boolean);
}

/**
 * Get all descendants of a node (including the node itself).
 * @param {Object} node - D3 hierarchy node or raw tree node
 * @returns {Array} Array of all descendant nodes
 */
export function getDescendants(node) {
  if (!node) return [];
  if (typeof node.descendants === 'function') {
    return node.descendants();
  }
  return collectDescendantsRaw(node);
}

/**
 * Check if a node is a leaf node.
 * @param {Object} node - Tree node
 * @returns {boolean}
 */
export function isLeaf(node) {
  return !node?.children || node.children.length === 0;
}

/**
 * Apply a function to each node in the tree (pre-order).
 * @param {Object} node - Tree root
 * @param {Function} fn - Function to apply to each node
 */
export function eachNode(node, fn) {
  if (!node) return;
  if (typeof node.each === 'function') {
    node.each(fn);
  } else {
    fn(node);
    if (node.children) {
      node.children.forEach(child => eachNode(child, fn));
    }
  }
}

// Private: fallback for raw nodes
function collectLeavesRaw(node, leaves = []) {
  if (!node.children || node.children.length === 0) {
    leaves.push(node);
  } else {
    node.children.forEach(child => collectLeavesRaw(child, leaves));
  }
  return leaves;
}

function collectDescendantsRaw(node, descendants = []) {
  descendants.push(node);
  if (node.children) {
    node.children.forEach(child => collectDescendantsRaw(child, descendants));
  }
  return descendants;
}
```

### Priority 2: Update Consumers

1. **monophyleticColoring.js** - Replace `getSubtreeLeaves()` with import from utility
2. **subtreeExtractor.js** - Replace `getLeaves()` and `getDescendants()`
3. **utils.ts** - Use utility (or create TypeScript equivalent)

### Priority 3: Document Node Type Expectations

Add JSDoc to clarify when functions expect D3 hierarchy nodes vs raw data:

```javascript
/**
 * @param {d3.HierarchyNode} tree - D3 hierarchy node (has .leaves(), .descendants())
 */
convertNodes(tree, options = {}) { ... }

/**
 * @param {Object} rawTreeData - Raw tree data (plain object with children array)
 */
parseNewickToTree(rawTreeData) { ... }
```

---

## 📊 Impact Assessment

| Anti-Pattern                 | Occurrences | Severity | Effort |
| ---------------------------- | ----------- | -------- | ------ |
| Manual leaf collection       | 3+ files    | Medium   | Low    |
| Manual descendant collection | 2 files     | Medium   | Low    |
| Inconsistent leaf check      | 5+ patterns | Low      | Medium |
| Missing type documentation   | Widespread  | Low      | Medium |

---

## ✅ Action Items

1. [ ] Create `src/js/domain/tree/treeTraversalUtils.js`
2. [ ] Update `monophyleticColoring.js` to use centralized utils
3. [ ] Update `subtreeExtractor.js` to use centralized utils
4. [ ] Standardize leaf-check pattern across codebase
5. [ ] Add JSDoc annotations for tree parameter types
6. [ ] Consider creating TypeScript types for tree structures
