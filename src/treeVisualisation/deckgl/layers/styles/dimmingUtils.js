export function applyDimmingWithCache(
  opacity,
  colorManager,
  entity,
  isNode,
  dimmingEnabled,
  dimmingOpacity,
  subtreeDimmingEnabled,
  subtreeDimmingOpacity,
  _highlightedSubtreeData
) {
  const isSourceOrDest = isNode &&
    Boolean(colorManager?.isNodeSourceEdge?.(entity) || colorManager?.isNodeDestinationEdge?.(entity));

  // Pivot edge dimming
  if (!isSourceOrDest && dimmingEnabled && colorManager?.hasPivotEdges?.()) {
    const isDownstream = isNode
      ? colorManager.isNodeDownstreamOfAnyPivotEdge?.(entity)
      : colorManager.isDownstreamOfAnyPivotEdge?.(entity);

    if (!isDownstream) {
      opacity = Math.round(opacity * dimmingOpacity);
    }
  }

  // Subtree dimming - dim elements NOT in the highlighted subtree
  // Use ColorManager's fast path for O(1) rejection
  if (subtreeDimmingEnabled && colorManager?._highlightedLeavesUnion?.size > 0) {
    const isInSubtree = isNode
      ? colorManager.isNodeInHighlightedSubtreeFast(entity)
      : colorManager.isLinkInHighlightedSubtreeFast(entity);

    if (!isInSubtree) {
      opacity = Math.round(opacity * subtreeDimmingOpacity);
    }
  }

  return opacity;
}
