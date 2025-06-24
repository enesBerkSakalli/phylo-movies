# Index Mapping Contract Documentation

## Overview
This document defines the **Index Mapping Contract** between the backend tree interpolation system and the frontend visualization components in phylo-movies. Understanding these mappings is critical for proper data synchronization, chart rendering, and tree navigation.

## Index Types

### 1. **Sequence Index** (Frontend Primary)
- **Definition**: Position in the complete interpolated sequence
- **Range**: `0` to `interpolated_trees.length - 1`
- **Usage**: Main navigation, tree rendering, UI state
- **Example**: For 3 original trees → ~15-20 interpolated positions

### 2. **Original Tree Index** (Backend Primary)  
- **Definition**: Position in the original input tree set (before interpolation)
- **Range**: `0` to `original_trees.length - 1` 
- **Usage**: Backend processing, file references, highlighting data
- **Example**: Input trees `T0, T1, T2` → indices `0, 1, 2`

### 3. **Transition Index** (Distance/Chart Data)
- **Definition**: Index of transitions between consecutive original trees
- **Range**: `0` to `original_trees.length - 2`
- **Usage**: Distance arrays, chart data, RFD/W-RFD calculations
- **Example**: 3 trees → 2 transitions → indices `0, 1`

## Backend Data Structure Contract

### Tree Interpolation Output
The backend `interpolate_adjacent_blocked_tree_pairs()` generates:

```python
# For each original tree pair (T_i, T_{i+1}):
sequence = [
    T_i,                    # Original tree i
    IT1,                    # Intermediate tree 1 (i → i+1)
    C_0, C_1, ..., C_n,    # Progressive consensus trees  
    IT2,                    # Intermediate tree 2 (i+1 → i)
    # Then continues with T_{i+1}...
]
```

### Tree Naming Convention
```python
consecutive_tree_names = [
    f"T{i}",                           # Full trees: T0, T1, T2, ...
    "IT1", "IT2",                      # Intermediate trees
    f"C_{j}" for j in range(n),        # Consensus trees: C_0, C_1, ...
]
```

### Distance Data Arrays
```python
# CRITICAL: Distance arrays represent transitions between ORIGINAL trees only
# NOT between all interpolated trees

# Robinson-Foulds distances between consecutive ORIGINAL trees
rfd_distances = [d0, d1, d2, ...]     # Length: original_trees.length - 1

# Weighted Robinson-Foulds distances between consecutive ORIGINAL trees
wrfd_distances = [wd0, wd1, wd2, ...] # Length: original_trees.length - 1

# Scale values for each interpolated tree
scale_values = [s0, s1, s2, ...]      # Length: interpolated_trees.length
```

### Example Data Relationship:
```python
# Input: 3 original trees -> 235 transitions between originals
original_trees = [T0, T1, T2, ..., T234]           # 235 trees
interpolated_trees = [T0, IT1, C_0, ..., T234]     # ~1191 trees (5x interpolation)

# Distance arrays:
rfd_distances = [d0, d1, ..., d233]                # 234 distances (original transitions)
scale_values = [s0, s1, ..., s1190]               # 1191 scales (all trees)
```

### Highlighting Data
```python
highlight_data = {
    "jumping_taxa": [...],    # Length: original_trees.length - 1 (transition-based)
    "s_edges": [...],         # Length: original_trees.length - 1
    "covers": [...],          # Length: original_trees.length - 1
}
```

## Frontend Mapping Logic

### TransitionIndexResolver Responsibilities

#### 1. **Sequence → Original Tree Mapping**
```javascript
// Maps sequence position to original tree index
fullTreeIndices = [0, 5, 10, 15, ...]  // Positions of T0, T1, T2, ... in sequence

isFullTree(sequencePos) {
    return this.sequenceData[sequencePos]?.type === 'T';
}
```

#### 2. **Highlighting Index Resolution**
```javascript
getHighlightingIndex(sequencePos) {
    // Find which original tree transition applies to this sequence position
    // Returns: 0 to (original_trees.length - 2), or -1 if no highlight
}
```

#### 3. **Distance Index Resolution**  
```javascript
getDistanceIndex(sequencePos) {
    if (isFullTree(sequencePos)) {
        // Full tree T_k uses distance from previous transition (k-1)
        return Math.max(0, fullTreePositionInList - 1);
    } else {
        // Intermediate/consensus trees use current transition index
        return this.fullTreeIndices.findLastIndex(treeIndex => treeIndex <= sequencePos);
    }
}
```

## Chart Data Mapping

### Scale Charts (Direct Mapping)
```javascript
// 1:1 mapping between sequence index and scale array
chartIndex = sequenceIndex;
scaleValue = scaleArray[chartIndex];
```

### Distance Charts (Original Tree Transition Mapping)
```javascript
// Maps sequence position to ORIGINAL TREE transition index for distance lookup
// This is why distance arrays are much shorter than interpolated sequence
chartIndex = transitionResolver.getDistanceIndex(sequenceIndex);
distanceValue = distanceArray[chartIndex];  // chartIndex maps to original tree transitions

// Example:
// sequenceIndex = 15 (some interpolated tree) 
// -> chartIndex = 2 (represents transition from original T2 to T3)
// -> distanceValue = rfd_distances[2] (distance between T2 and T3)
```

## Critical Invariants

### 1. **Array Length Consistency**
```javascript
// CORRECTED: Distance arrays correspond to original tree transitions, not interpolated
// Must hold true for proper operation:
assert(rfd_distances.length === original_trees.length - 1);        // ORIGINAL tree transitions
assert(wrfd_distances.length === original_trees.length - 1);       // ORIGINAL tree transitions
assert(scale_values.length === interpolated_trees.length);         // ALL interpolated trees
assert(highlight_data.jumping_taxa.length === original_trees.length - 1);

// Example with 235 original trees -> 1191 interpolated trees:
assert(rfd_distances.length === 234);        // 235 - 1 = 234 original transitions
assert(scale_values.length === 1191);        // All interpolated trees have scales
```

### 2. **Tree Name Pattern Matching**
```javascript
// Frontend regex patterns must match backend naming:
/^T\d+$/.test(name)     // Matches T0, T1, T2, ...
/^IT\d*$/.test(name)    // Matches IT1, IT2, IT
/^C_\d+$/.test(name)    // Matches C_0, C_1, C_2, ...
```

### 3. **Index Boundary Validation**
```javascript
// All index operations must be bounds-checked:
sequenceIndex >= 0 && sequenceIndex < interpolated_trees.length;
transitionIndex >= 0 && transitionIndex < (original_trees.length - 1);
originalIndex >= 0 && originalIndex < original_trees.length;
```

## Error Conditions & Handling

### 1. **Invalid Sequence Position**
```javascript
if (position < 0 || position >= this.sequenceData.length) {
    return -1; // Or appropriate fallback
}
```

### 2. **Missing Highlight Data**
```javascript
if (originalPairIndex >= this.numOriginalTransitions) {
    console.warn(`No highlight data for transition ${originalPairIndex}`);
    return -1; // No highlighting for this position
}
```

### 3. **Array Length Mismatch**
```javascript
if (distanceArray.length !== expectedLength) {
    console.error(`Distance array length mismatch: expected ${expectedLength}, got ${distanceArray.length}`);
    // Implement fallback strategy
}
```

## Migration Notes

### When Adding New Tree Types
1. Update tree name pattern recognition in `initializeTransitionResolver()`
2. Add new type to `TransitionIndexResolver` type mapping
3. Update distance/highlighting logic if needed
4. Document new interpolation behavior

### When Modifying Backend Interpolation
1. Ensure tree naming patterns remain consistent
2. Verify array length contracts are maintained  
3. Update frontend validation logic
4. Test with various tree count scenarios

## Testing Requirements

### Unit Tests Should Verify:
- Index mapping consistency across all scenarios
- Boundary condition handling
- Array length validation
- Tree type recognition accuracy
- Distance calculation alignment

### Integration Tests Should Verify:
- Backend-frontend data contract compliance
- Chart rendering with correct data points
- Navigation state consistency
- Error recovery mechanisms

## Performance Considerations

### Optimization Strategies:
- Cache computed index mappings where possible
- Use lazy evaluation for expensive calculations
- Implement efficient search algorithms for large sequences
- Validate data only in development mode

---

*This contract must be maintained by both backend and frontend teams. Any changes require coordinated updates to both systems.*