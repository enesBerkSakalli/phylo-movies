import { getNodeBasedRgba } from './nodes/nodeStyles.js';
import { getActiveMoverEmphasis } from './activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from './highlightResolver.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  // History highlighting for extensions deactivated
  const nodeData = extension;
  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');
  if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
    color[3] = Math.min(255, Math.round(color[3] * 1.3));
  }

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const { metricScale = 1.0 } = cached || {};
  const nodeData = extension;

  // History highlighting for extensions deactivated
  // if (nodeData && colorManager?.isNodeHistorySubtree?.(nodeData)) {
  //   return baseStrokeWidth * 2.6;
  // }

  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');
  if (
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
  ) {
    const emphasis = highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
      ? getActiveMoverEmphasis(nodeData, cached, 'node')
      : 1;
    return baseStrokeWidth * 3 * emphasis * metricScale;
  }

  return baseStrokeWidth * metricScale; // Match link width for consistent appearance
}
