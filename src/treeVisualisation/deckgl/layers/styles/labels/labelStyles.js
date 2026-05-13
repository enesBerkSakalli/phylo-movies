import { toColorManagerNode, shouldHighlightNode, isHistorySubtreeNode } from '../nodes/nodeUtils.js';
import { getNodeBasedRgba } from '../nodes/nodeStyles.js';
import { MARKED_LABEL_SCALE, HISTORY_LABEL_SCALE } from '../../config/LabelConfig.js';

/**
 * Calculates label size based on state (highlighting, history, etc.)
 */
export function getLabelSize(label, fontSize, cached) {
  const visualScale = Number.isFinite(cached?.visualScale) ? cached.visualScale : 1;
  const baseSize = (parseFloat(fontSize) * 12 || 24) * visualScale;
  if (!label) return baseSize;

  const nodeData = toColorManagerNode(label);

  if (cached?.colorManager?.isNodeMovingSubtree?.(nodeData)) {
    return 0;
  }

  if (cached?.markedSubtreeData && shouldHighlightNode(nodeData, cached)) {
    return baseSize * MARKED_LABEL_SCALE; // Scaled for marked labels
  }

  if (isHistorySubtreeNode(nodeData, cached)) {
    return baseSize * HISTORY_LABEL_SCALE;
  }

  return baseSize;
}

export function getLabelColor(label, cached, helpers) {
  const color = getNodeBasedRgba(label, label.opacity, cached, helpers);

  if (isHistorySubtreeNode(toColorManagerNode(label), cached)) {
    // Subtle alpha for history labels (reduced from 1.2)
    color[3] = Math.min(255, Math.round(color[3] * 1.0));
  }
  return color;
}
