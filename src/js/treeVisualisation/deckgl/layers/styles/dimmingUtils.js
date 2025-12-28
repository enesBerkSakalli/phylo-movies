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
  // Prefer explicit markedSubtreeData from store only when it contains data,
  // otherwise fall back to ColorManager.sharedMarkedJumpingSubtrees.
  const subtreeData = (Array.isArray(markedSubtreeData) && markedSubtreeData.length > 0)
    ? markedSubtreeData
    : (colorManager?.sharedMarkedJumpingSubtrees || []);

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
