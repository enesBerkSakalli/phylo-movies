# Correspondence-Aware Animation for D3 Phylogenetic Tree Morphing

### Overview

This document describes the principles and implementation strategy for animating between interpolated phylogenetic trees using D3, with a focus on correct, topology-aware morphing. The approach ensures that transitions between trees in a sequence (e.g., `treeList`) use correspondence mappings to animate node and branch movement meaningfully, even as tree topology changes.

### Handling Unique Splits and Common Clusters

When animating between two trees (T1 and T2) using an interpolated tree (IT2) and a correspondence mapping (e.g., C1):

- **Unique splits/nodes** (present only in T1 or T2):
  - If unique to T1, these elements should shrink/disappear.
  - If unique to T2, these elements should grow/appear.
- **Children of unique splits:**
  - If a unique split/node has children that are themselves part of a common cluster (i.e., they correspond to nodes present in both T1 and T2), those children should not disappear or appear. Instead, they should be smoothly moved/interpolated to their new positions in the target tree, reflecting the change in their parentage or position due to the loss or gain of the unique split.
- **Summary:**
  - Unique splits/nodes: shrink/grow.
  - Children that are common clusters: move/interpolate to new positions.
  - This ensures common clusters are preserved and animated meaningfully, even if their parent split changes.

#### What are Unique Splits and Common Clusters?

A **split** (or bipartition) in a phylogenetic tree is a division of the taxa set into two non-overlapping groups, defined by a branch. A split is **unique** to a tree if it is present in one tree but not in the other. A **common cluster** is a subtree (set of taxa) that is present in both trees, even if its parentage changes.

---

### Why Not Use Staged/Depth-Based Animation?

Staged or depth-based animation (where nodes/branches are revealed or moved in a fixed order, e.g., by depth) is not suitable for morphing between interpolated trees with changing topology. Such approaches ignore the actual correspondence between nodes in different trees, leading to visually confusing or incorrect animations, especially when branches are rearranged, collapsed, or expanded.

### Key Principles

- **Correspondence Mapping:** Each pair of trees to be animated between must have a mapping (e.g., `C1`, `C2`, ...) that specifies which node in the source tree corresponds to which node in the target tree. This mapping is used to assign stable keys for D3 data joins.
- **Stable D3 Keys:** Use correspondence IDs (not just node names or indices) as the `key` function in D3's `.data()` join. This ensures that D3 can track nodes/branches across topology changes and animate their positions and shapes meaningfully.
- **Topology Awareness:** The animation logic must handle cases where nodes/branches appear, disappear, or change parentage, using the correspondence mapping to interpolate positions and shapes.

### Implementation Steps

1. **Obtain Correspondence Mapping:** For each pair of trees in the animation sequence, compute or retrieve a mapping object that links node IDs in the source tree to node IDs in the target tree.
2. **Assign Correspondence IDs:** When preparing data for D3, assign each node/branch a `correspondenceId` property based on the mapping. This ID should be stable across the two trees being animated between.
3. **D3 Data Join:** In the D3 update/enter/exit pattern, use the `correspondenceId` as the key:

   ```js
   selection.data(newTreeNodes, (d) => d.correspondenceId);
   ```

4. **Interpolate Positions and Shapes:** For each node/branch, interpolate its position and shape from the source to the target tree using D3 transitions. For nodes/branches that appear or disappear, use appropriate enter/exit transitions (e.g., fade in/out, grow/shrink from/to parent position).
   - For branches unique to T1: animate shrinking (e.g., length/opacity to zero) and remove.
   - For branches unique to T2: animate growing from zero to full size.
   - For corresponding branches: interpolate position/shape.
5. **Handle Topology Changes:** When a node/branch changes parentage or is rearranged, the correspondence mapping ensures that the animation moves it smoothly to its new position, rather than removing and re-adding it abruptly.



# Correspondence-Aware Animation for Interpolated Phylogenetic Trees

## Overview

Animating between phylogenetic trees—especially when interpolating between trees with different topologies—requires more than simple staged or depth-based animation. The correct approach must account for node/edge correspondences between tree states, so that the morphing animation is both visually smooth and biologically meaningful.

## Key Principles

- **Correspondence Mapping:** When animating between two trees (e.g., T1 and T2), use a correspondence mapping (e.g., C1, C2, ...) that specifies which nodes/edges in T1 correspond to which in T2. This mapping is typically provided by the interpolation algorithm.
- **Stable Data Keys:** In D3, use the correspondence mapping to assign stable, unique keys to nodes and edges. This ensures that D3 transitions interpolate the correct graphical elements, even as topology changes.
- **D3 Data Joins & Transitions:** Use D3's data join pattern (`.data(data, keyFn)`) to bind tree elements to their correspondence-aware keys. Then use D3 transitions to animate attributes (positions, shapes, etc.) between states.
- **Single Animation Loop:** Ensure only one animation loop is active at a time. Animation should be driven by updating the tree data (with correspondence mappings) and letting D3 handle the interpolation.

## Implementation Steps (Detailed)

1. **Prepare Correspondence Mappings:** For each pair of consecutive trees in the animation sequence (`treeList`), obtain or compute a mapping of node/edge correspondences.
2. **Assign Stable Keys:** When rendering, assign each node/edge a key based on its correspondence ID (not just its label or index).
3. **D3 Data Join:**

   ```js
   svg.selectAll(".node").data(treeNodes, (d) => d.correspondenceId);
   ```

   This ensures that nodes are matched across frames by correspondence, not by order.
4. **Animate with D3 Transitions:**

   ```js
   selection
     .transition()
     .duration(duration)
     .attr("cx", (d) => d.x)
     .attr("cy", (d) => d.y);
   ```

   D3 will interpolate attributes for matched elements.
5. **Handle Topology Changes:**
   - For nodes/edges that appear/disappear (i.e., no correspondence), use D3's `enter()` and `exit()` selections to fade in/out or otherwise animate their addition/removal.
6. **Update on Each Frame:**
   - For each animation frame or interpolated tree, update the data and re-bind with correspondence-aware keys.
   - Let D3 transitions handle the morphing.

## Why Not Use Staged/Depth-Based Animation?

Staged or depth-based animation only animates tree growth or collapse by depth, and does not account for the actual correspondence between nodes/edges in different topologies. This can result in visually confusing or biologically meaningless morphs. The correspondence-aware approach ensures that the animation reflects the true relationships between tree states.

## References

- [D3 Data Joins](https://observablehq.com/@d3/selection-join)
- [Animating Trees with D3](https://observablehq.com/@d3/animated-tree)
- [Phylogenetic Tree Morphing (concept)](https://www.nature.com/articles/nmeth.3252)

---

**Summary:**
To animate between interpolated phylogenetic trees with changing topology, always use correspondence mappings to assign stable keys for D3 data joins and transitions. This enables smooth, meaningful morphing of tree elements, even as the tree structure changes.
