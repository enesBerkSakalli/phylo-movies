export function applyDimmingWithCache(
  opacity,
  colorManager,
  entity,
  isNode,
  dimmingEnabled,
  dimmingOpacity,
  subtreeDimmingEnabled,
  subtreeDimmingOpacity,
  markedSubtreeData
) {
  let isSourceOrDest = false;
  if (isNode) {
    const isSource = colorManager?.isNodeSourceEdge?.(entity);
    const isDestination = colorManager?.isNodeDestinationEdge?.(entity);
    isSourceOrDest = isSource || isDestination;
  }

  // Pivot edge dimming
  if (!isSourceOrDest && dimmingEnabled && colorManager?.hasPivotEdges?.()) {
    const isDownstream = isNode
      ? colorManager.isNodeDownstreamOfAnyPivotEdge?.(entity)
      : colorManager.isDownstreamOfAnyPivotEdge?.(entity);

    if (!isDownstream) {
      opacity = Math.round(opacity * dimmingOpacity);
    }
  }

  // Subtree dimming - dim elements NOT in the marked subtree
  // Use ColorManager's fast path for O(1) rejection
  if (subtreeDimmingEnabled && colorManager?._markedLeavesUnion?.size > 0) {
    const isInSubtree = isNode
      ? colorManager.isNodeInMarkedSubtreeFast(entity)
      : colorManager.isLinkInMarkedSubtreeFast(entity);

    if (!isInSubtree) {
      opacity = Math.round(opacity * subtreeDimmingOpacity);
    }
  }

  return opacity;
}
