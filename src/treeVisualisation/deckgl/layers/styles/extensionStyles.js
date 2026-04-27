import { getNodeBasedRgba } from './nodes/nodeStyles.js';
import { isNodeInSubtree } from '../../../utils/splitMatching.js';
import { toColorManagerNode } from './nodes/nodeUtils.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  // History highlighting for extensions deactivated
  const nodeData = extension?.leaf || toColorManagerNode(extension);
  if (nodeData && cached?.colorManager?.isNodeHistorySubtree?.(nodeData)) {
    color[3] = Math.min(255, Math.round(color[3] * 1.3));
  }

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const { markedSubtreeData, markedSubtreesEnabled } = cached || {};
  const nodeData = extension?.leaf || toColorManagerNode(extension);

  // History highlighting for extensions deactivated
  // if (nodeData && colorManager?.isNodeHistorySubtree?.(nodeData)) {
  //   return baseStrokeWidth * 2.6;
  // }

  if (markedSubtreesEnabled !== false && markedSubtreeData && extension) {
    if (isNodeInSubtree(nodeData, markedSubtreeData)) {
      return baseStrokeWidth * 3; // Thick for marked extensions
    }
  }

  return baseStrokeWidth; // Match link width for consistent appearance
}
