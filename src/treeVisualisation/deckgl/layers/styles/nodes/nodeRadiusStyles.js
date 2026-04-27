import { isNodeVisuallyHighlighted } from '../../../../systems/tree_color/visualHighlights.js';
import { toColorManagerNode, shouldHighlightNode, isHistorySubtreeNode, isNodePivotEdge } from './nodeUtils.js';

export function getNodeRadius(node, minRadius = 1, cached, helpers) {
  const { colorManager: cm, upcomingChangesEnabled, densityScale, metricScale = 1.0 } = cached;
  const nodeSize = helpers.nodeSize || 1;
  const baseRadius = (node.dotSize || node.radius || minRadius) * nodeSize;
  let radius = baseRadius;

  if (node.isEntering || node.isExiting) {
    radius *= 0.7;
  } else if (cm) {
    const nodeData = toColorManagerNode(node);
    const scale = densityScale !== undefined ? densityScale : 1.0;
    const getScaledRadius = (multiplier) => baseRadius * (1 + (multiplier - 1) * scale);

    if (upcomingChangesEnabled && cm.isNodeCompletedChangeEdge?.(nodeData)) {
      radius = getScaledRadius(1.5);
    } else if (isNodePivotEdge(nodeData, cached)) {
      radius = getScaledRadius(1.5);
    } else if (shouldHighlightNode(nodeData, cached)) {
      radius = getScaledRadius(1.6);
    } else if (isHistorySubtreeNode(nodeData, cached)) {
      radius = getScaledRadius(1.15);
    } else if (isNodeVisuallyHighlighted(nodeData, cm, cached.markedSubtreesEnabled)) {
      radius = getScaledRadius(1.5);
    }
  }

  return radius * metricScale;
}
