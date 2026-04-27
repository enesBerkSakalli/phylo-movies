import { isNodeVisuallyHighlighted } from '../../../../systems/tree_color/visualHighlights.js';
import { toColorManagerNode, shouldHighlightNode, isHistorySubtreeNode, isNodePivotEdge } from './nodeUtils.js';

export function getNodeRadius(node, minRadius = 1, cached, helpers) {
  const { colorManager: cm, upcomingChangesEnabled, densityScale, metricScale = 1.0 } = cached;
  const nodeSize = helpers.nodeSize || 1;
  const baseRadius = (node.dotSize || node.radius || minRadius) * nodeSize;

  if (node.isEntering || node.isExiting) {
    return baseRadius * 0.7;
  }

  if (!cm) return baseRadius;

  const nodeData = toColorManagerNode(node);

  // Density scaling helper
  const scale = densityScale !== undefined ? densityScale : 1.0;
  const getScaledRadius = (multiplier) => baseRadius * (1 + (multiplier - 1) * scale);

  // History mode - completed changes
  if (upcomingChangesEnabled && cm.isNodeCompletedChangeEdge?.(nodeData)) {
    return getScaledRadius(1.5);
  }

  // Pivot edge - same size as marked highlights
  if (isNodePivotEdge(nodeData, cached)) {
    return getScaledRadius(1.5);
  }

  // Marked subtree highlights
  if (shouldHighlightNode(nodeData, cached)) {
    return getScaledRadius(1.6);
  }

  // History subtree nodes (slightly larger, reduced from 1.3)
  if (isHistorySubtreeNode(nodeData, cached)) {
    return getScaledRadius(1.15);
  }

  // Visual highlight fallback
  const isHighlighted = isNodeVisuallyHighlighted(nodeData, cm, cached.markedSubtreesEnabled);
  const calculatedRadius = isHighlighted ? getScaledRadius(1.5) : baseRadius;
  return calculatedRadius * metricScale;
}
