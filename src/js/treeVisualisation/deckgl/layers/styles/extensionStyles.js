import { getNodeBasedRgba } from './nodeStyles.js';
import { isNodeInSubtree } from './subtreeMatching.js';
import { toColorManagerNode } from './nodeUtils.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  const nodeData = extension?.leaf || toColorManagerNode(extension);
  if (nodeData && cached?.colorManager?.isNodeHistorySubtree?.(nodeData)) {
    color[3] = Math.min(255, Math.round(color[3] * 1.3));
  }

  // Apply connection opacity from settings
  const connectionOpacity = cached?.linkConnectionOpacity !== undefined ? cached.linkConnectionOpacity : 0.6;
  color[3] = Math.round(color[3] * connectionOpacity);

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const { markedSubtreeData, markedSubtreesEnabled, colorManager } = cached || {};
  const nodeData = extension?.leaf || toColorManagerNode(extension);

  if (nodeData && colorManager?.isNodeHistorySubtree?.(nodeData)) {
    return baseStrokeWidth * 2.6;
  }

  if (markedSubtreesEnabled !== false && markedSubtreeData && extension) {
    if (isNodeInSubtree(nodeData, markedSubtreeData)) {
      return baseStrokeWidth * 3; // Thick for marked extensions
    }
  }

  return baseStrokeWidth * 0.5;
}
