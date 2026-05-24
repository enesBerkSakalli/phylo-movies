import { getActiveMoverEmphasis } from '../activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../highlightResolver.js';

export function getNodeRadius(node, minRadius = 1, cached, helpers) {
  const { colorManager: cm, upcomingChangesEnabled, densityScale, metricScale = 1.0 } = cached;
  const nodeSize = helpers.nodeSize || 1;
  const visualScale = Number.isFinite(cached?.visualScale) ? cached.visualScale : 1;
  const baseRadius = (node.dotSize || node.radius || minRadius) * nodeSize * visualScale;
  let radius = baseRadius;

  if (node.isEntering || node.isExiting) {
    radius *= 0.7;
  } else if (cm) {
    const nodeData = node;
    const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');
    const scale = densityScale !== undefined ? densityScale : 1.0;
    const getScaledRadius = (multiplier) => baseRadius * (1 + (multiplier - 1) * scale);

    if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
      radius = getScaledRadius(1.5);
    } else if (highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE) {
      radius = getScaledRadius(1.5);
    } else if (
      highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
      highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
    ) {
      const emphasis = highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
        ? getActiveMoverEmphasis(nodeData, cached, 'node')
        : 1;
      radius = getScaledRadius(1.6) * emphasis;
    } else if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
      radius = getScaledRadius(1.15);
    }
  }

  return radius * metricScale;
}
