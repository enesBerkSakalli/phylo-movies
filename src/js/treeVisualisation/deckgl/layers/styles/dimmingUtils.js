import { isLinkInSubtree, isNodeInSubtree } from './subtreeMatching.js';

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
  // Active change edge dimming
  if (dimmingEnabled && colorManager?.hasActiveChangeEdges?.()) {
    const isDownstream = isNode
      ? colorManager.isNodeDownstreamOfAnyActiveChangeEdge?.(entity)
      : colorManager.isDownstreamOfAnyActiveChangeEdge?.(entity);

    if (!isDownstream) {
      opacity = Math.round(opacity * dimmingOpacity);
    }
  }

  // Subtree dimming - dim elements NOT in the marked subtree
  // Always use ColorManager as the authoritative source for subtree data
  // This ensures consistency during scrubbing when ColorManager is updated
  // with the correct tree index but the store's currentTreeIndex is stale
  const subtreeData = colorManager?.sharedMarkedJumpingSubtrees || [];

  if (subtreeDimmingEnabled && subtreeData.length > 0) {
    const isInSubtree = isNode
      ? isNodeInSubtree(entity, subtreeData)
      : isLinkInSubtree(entity, subtreeData);

    if (!isInSubtree) {
      opacity = Math.round(opacity * subtreeDimmingOpacity);
    }
  }

  return opacity;
}
