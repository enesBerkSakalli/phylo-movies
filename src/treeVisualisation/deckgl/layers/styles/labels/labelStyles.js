import { getNodeBasedRgba } from '../nodes/nodeStyles.js';
import { MARKED_LABEL_SCALE, HISTORY_LABEL_SCALE } from '../../config/LabelConfig.js';
import { getSubtleActiveMoverEmphasis } from '../activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../highlightResolver.js';

/**
 * Calculates label size based on state (highlighting, history, etc.)
 */
export function getLabelSize(label, fontSize, cached) {
  const visualScale = Number.isFinite(cached?.visualScale) ? cached.visualScale : 1;
  const baseSize = (parseFloat(fontSize) * 12 || 24) * visualScale;
  if (!label) return baseSize;

  const nodeData = label;
  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');

  if (
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
  ) {
    const emphasis =
      highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
        ? getSubtleActiveMoverEmphasis(nodeData, cached, 'node')
        : 1;
    return baseSize * MARKED_LABEL_SCALE * emphasis;
  }

  if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
    return baseSize * HISTORY_LABEL_SCALE;
  }

  return baseSize;
}

export function getLabelColor(label, cached, helpers) {
  const color = getNodeBasedRgba(label, label.opacity, cached, helpers);
  const highlight = resolveTreeElementHighlight(label, cached, 'node');

  if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
    // Subtle alpha for history labels (reduced from 1.2)
    color[3] = Math.min(255, Math.round(color[3] * 1.0));
  }
  return color;
}
