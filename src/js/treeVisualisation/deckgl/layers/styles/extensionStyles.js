import { getNodeBasedRgba } from './nodeStyles.js';
import { isNodeInSubtree } from './subtreeMatching.js';
import { toColorManagerNode } from './nodeUtils.js';

export function getExtensionColor(extension, cached, helpers) {
  const color = getNodeBasedRgba(extension, extension.opacity, cached, helpers);

  // Apply connection opacity from settings
  const connectionOpacity = cached?.linkConnectionOpacity !== undefined ? cached.linkConnectionOpacity : 0.6;
  color[3] = Math.round(color[3] * connectionOpacity);

  return color;
}

export function getExtensionWidth(extension, baseStrokeWidth, cached) {
  const { markedSubtreeData, markedSubtreesEnabled } = cached || {};

  if (markedSubtreesEnabled !== false && markedSubtreeData && extension) {
    const nodeData = toColorManagerNode(extension);
    if (isNodeInSubtree(nodeData, markedSubtreeData)) {
      return baseStrokeWidth * 3; // Thick for marked extensions
    }
  }

  return baseStrokeWidth * 0.5;
}
