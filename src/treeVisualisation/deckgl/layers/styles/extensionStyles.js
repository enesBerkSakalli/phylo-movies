import { getNodeBasedRgba } from './nodes/nodeStyles.js';
import { getActiveMoverEmphasis } from './activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from './highlightResolver.js';
import { getReadableMetricScale } from './readableMetricScale.js';
import { applyDenseBaseOpacity } from './denseVisualDeclutter.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  // History highlighting for extensions deactivated
  const nodeData = extension;
  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');
  if (highlight.role === TREE_HIGHLIGHT_ROLE.BASE) {
    color[3] = applyDenseBaseOpacity(color[3], cached, highlight);
  }
  if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
    color[3] = Math.min(255, Math.round(color[3] * 1.3));
  }

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const metricScale = getReadableMetricScale(cached);
  const visualScale = getVisualWidthScale(cached);
  const baseDisplayWidth = baseStrokeWidth * visualScale;
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
    const emphasis =
      highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
        ? getActiveMoverEmphasis(nodeData, cached, 'node')
        : 1;
    return baseDisplayWidth * 3 * emphasis * metricScale;
  }

  return baseDisplayWidth * metricScale; // Match link width for consistent appearance
}

function getVisualWidthScale(cached) {
  const visualScale = Number(cached?.visualScale);
  return Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1;
}
