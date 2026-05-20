import { getNodeBasedRgba } from './nodes/nodeStyles.js';
import { isNodeInSubtree } from '../../../../domain/tree/splits.js';
import { getActiveMoverEmphasis } from './activeMoverEmphasis.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  // History highlighting for extensions deactivated
  const nodeData = extension;
  if (nodeData && cached?.colorManager?.isNodeHistorySubtree?.(nodeData)) {
    color[3] = Math.min(255, Math.round(color[3] * 1.3));
  }

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const { highlightedSubtreeData, subtreeHighlightsEnabled, metricScale = 1.0 } = cached || {};
  const nodeData = extension;

  // History highlighting for extensions deactivated
  // if (nodeData && colorManager?.isNodeHistorySubtree?.(nodeData)) {
  //   return baseStrokeWidth * 2.6;
  // }

  if (subtreeHighlightsEnabled !== false && highlightedSubtreeData && extension) {
    if (isNodeInSubtree(nodeData, highlightedSubtreeData)) {
      return baseStrokeWidth * 3 * getActiveMoverEmphasis(nodeData, cached, 'node') * metricScale;
    }
  }

  return baseStrokeWidth * metricScale; // Match link width for consistent appearance
}
