/**
 * Extracts affected subtree groups from segment data.
 *
 * @param {Array} affectedSubtrees - Affected subtree groups with leaf indices.
 * @param {Function} getLeafNamesByIndices - Converts indices to leaf names.
 * @returns {Array<string[]>} Leaf name arrays for each subtree group.
 */
export function extractAffectedSubtreeGroups(affectedSubtrees, getLeafNamesByIndices) {
  if (!affectedSubtrees?.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const item of affectedSubtrees) {
    if (!Array.isArray(item)) continue;

    const firstElement = item[0];
    if (Array.isArray(firstElement)) {
      for (const group of item) {
        if (Array.isArray(group) && group.length > 0) {
          const leafNames = getLeafNamesByIndices(group);
          if (leafNames?.length > 0) subtreeGroups.push(leafNames);
        }
      }
    } else if (item.length > 0) {
      const leafNames = getLeafNamesByIndices(item);
      if (leafNames?.length > 0) subtreeGroups.push(leafNames);
    }
  }

  return subtreeGroups;
}

export function formatPivotEdgePreview(pivotEdge, maxVisible = 4) {
  if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) return null;

  const visible = pivotEdge.slice(0, maxVisible).join(', ');
  const hiddenCount = pivotEdge.length - maxVisible;
  return hiddenCount > 0 ? `${visible} +${hiddenCount}` : visible;
}
