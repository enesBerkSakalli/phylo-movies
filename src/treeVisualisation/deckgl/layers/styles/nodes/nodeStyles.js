import { colorToRgb } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';
import { applyDimmingWithCache } from '../dimmingUtils.js';
import { getHighlightColor, getPivotEdgeColor } from './nodeUtils.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../highlightResolver.js';
import { applyDenseInternalNodeOpacity } from '../denseVisualDeclutter.js';
import { EXPANDING_LIFECYCLE_COLOR } from '../links/linkUtils.js';
// Re-export from dedicated file
export { getNodeRadius } from './nodeRadiusStyles.js';
export { getNodeLineWidth } from './nodeWidthStyles.js';

// Reusable output buffers to avoid per-call array allocations (GC pressure at 60fps)
const _historyColorOut = [0, 0, 0, 0];
const _nodeColorOut = [0, 0, 0, 0];
const _borderColorOut = [0, 0, 0, 0];
const _nodeBasedOut = [0, 0, 0, 0];
const ENTERING_NODE_BORDER_COLOR = EXPANDING_LIFECYCLE_COLOR.map((channel) =>
  Math.round(channel * 0.7)
);

/**
 * Checks for history and upcoming change states and returns the appropriate color.
 * @param {Object} cached - Cached state
 * @param {number} baseOpacity - The base opacity
 * @returns {Array|null} [r, g, b, a] color array or null if no history state applies
 */
function resolveHistoryNodeColor(cached, baseOpacity, highlight = null) {
  const { upcomingChangesEnabled } = cached;

  if (upcomingChangesEnabled) {
    const historyColor = colorToRgb(SYSTEM_TREE_COLORS.pivotEdgeColor);

    if (highlight?.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
      _historyColorOut[0] = historyColor[0];
      _historyColorOut[1] = historyColor[1];
      _historyColorOut[2] = historyColor[2];
      _historyColorOut[3] = baseOpacity;
      return _historyColorOut;
    }
    if (highlight?.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
      // Upcoming changes are semi-transparent
      _historyColorOut[0] = historyColor[0];
      _historyColorOut[1] = historyColor[1];
      _historyColorOut[2] = historyColor[2];
      _historyColorOut[3] = Math.round(baseOpacity * 0.6);
      return _historyColorOut;
    }
  }
  return null;
}

/**
 * Resolves the base RGB color for a node, considering highlights and highlighted subtrees.
 * @param {Object} nodeData - Normalized node data
 * @param {Object} cached - Cached state from LayerStyles
 * @param {Object} cm - ColorManager instance
 * @returns {Array} [r, g, b] color array
 */
function resolveBaseNodeColor(nodeData, cached, cm, highlight = null) {
  const isHighlighted =
    highlight?.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight?.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT;

  if (isHighlighted) {
    return getHighlightColor(nodeData, cached);
  }
  return colorToRgb(cm?.getNodeColor?.(nodeData) || SYSTEM_TREE_COLORS.defaultColor);
}

export function getNodeColor(node, cached, helpers) {
  const {
    colorManager: cm,
    dimmingEnabled,
    dimmingOpacity,
    highlightedSubtreeData,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
  } = cached;

  const nodeData = node;
  const baseOpacity = helpers.getBaseOpacity(node.opacity);

  if (node.isEntering) {
    _nodeColorOut[0] = EXPANDING_LIFECYCLE_COLOR[0];
    _nodeColorOut[1] = EXPANDING_LIFECYCLE_COLOR[1];
    _nodeColorOut[2] = EXPANDING_LIFECYCLE_COLOR[2];
    _nodeColorOut[3] = baseOpacity;
    return _nodeColorOut;
  }

  // 0. Explicit Color Override (ConnectorLayers pattern)
  // Check raw node first (deck.gl datum)
  if (node.color) {
    // Expecting [r, g, b] in node.color
    _nodeColorOut[0] = node.color[0];
    _nodeColorOut[1] = node.color[1];
    _nodeColorOut[2] = node.color[2];
    _nodeColorOut[3] = helpers.getBaseOpacity(node.opacity);
    return _nodeColorOut;
  }

  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');

  // 1. History & Change Management State
  const historyColor = resolveHistoryNodeColor(cached, baseOpacity, highlight);
  if (historyColor) {
    return historyColor;
  }

  // 2. Pivot Edge - blue color (same as links)
  const isPivot = highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE;
  if (isPivot) {
    const pivotColor = getPivotEdgeColor();
    const opacity = applyDimmingWithCache(
      baseOpacity,
      cm,
      nodeData,
      true,
      dimmingEnabled,
      dimmingOpacity,
      subtreeDimmingEnabled,
      subtreeDimmingOpacity,
      highlightedSubtreeData
    );
    _nodeColorOut[0] = pivotColor[0];
    _nodeColorOut[1] = pivotColor[1];
    _nodeColorOut[2] = pivotColor[2];
    _nodeColorOut[3] = opacity;
    return _nodeColorOut;
  }

  // 3. Base Color Resolution
  const rgb = resolveBaseNodeColor(nodeData, cached, cm, highlight);

  // 4. Opacity & Dimming Calculation
  let opacity = baseOpacity;
  opacity = applyDimmingWithCache(
    opacity,
    cm,
    nodeData,
    true,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    highlightedSubtreeData
  );
  opacity = applyDenseInternalNodeOpacity(opacity, nodeData, cached, highlight);

  _nodeColorOut[0] = rgb[0];
  _nodeColorOut[1] = rgb[1];
  _nodeColorOut[2] = rgb[2];
  _nodeColorOut[3] = opacity;
  return _nodeColorOut;
}

export function getNodeBorderColor(node, cached, helpers) {
  const { colorManager: cm } = cached;
  const nodeData = node;

  const baseOpacity = helpers.getBaseOpacity(node.opacity);
  const highlight = resolveTreeElementHighlight(nodeData, cached, 'node');

  if (node.isEntering) {
    _borderColorOut[0] = ENTERING_NODE_BORDER_COLOR[0];
    _borderColorOut[1] = ENTERING_NODE_BORDER_COLOR[1];
    _borderColorOut[2] = ENTERING_NODE_BORDER_COLOR[2];
    _borderColorOut[3] = baseOpacity;
    return _borderColorOut;
  }

  // 1. History Borders
  const historyColor = resolveHistoryNodeColor(cached, baseOpacity, highlight);
  if (historyColor) {
    // Darken: ~70% brightness
    _borderColorOut[0] = Math.round(historyColor[0] * 0.7);
    _borderColorOut[1] = Math.round(historyColor[1] * 0.7);
    _borderColorOut[2] = Math.round(historyColor[2] * 0.7);
    _borderColorOut[3] = historyColor[3];
    return _borderColorOut;
  }

  // 2. Determine Border Color
  let rgb;
  const isHighlighted =
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT;
  const isActive = highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE;

  if (isActive) {
    rgb = getPivotEdgeColor();
  } else if (isHighlighted) {
    rgb = getHighlightColor(nodeData, cached);
  } else {
    // Standard Base Color (usually black stroke)
    // "Visually Highlighted" checks are implicitly covered by isActive/isHighlighted above
    rgb = colorToRgb(SYSTEM_TREE_COLORS.strokeColor || SYSTEM_TREE_COLORS.defaultColor);
  }

  // 3. Opacity Calculation
  let opacity;

  if (isHighlighted || isActive) {
    // Highlighted/Active: Full base opacity
    opacity = baseOpacity;
  } else {
    // Standard Nodes
    const nodeOpacityFloat = node.opacity !== undefined ? node.opacity : 1;

    // Check history subtree status for opacity fix
    if (highlight.role === TREE_HIGHLIGHT_ROLE.HISTORY_SUBTREE) {
      opacity = Math.round(nodeOpacityFloat * 160); // Reduced from 200 for subtler effect
    } else {
      // Standard nodes use base opacity (255)
      // Pulsing logic for non-active nodes (if any) would go here
      opacity = Math.round(nodeOpacityFloat * 255);
    }
  }

  // Apply dimming
  const {
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    highlightedSubtreeData,
  } = cached;

  opacity = applyDimmingWithCache(
    opacity,
    cm,
    nodeData,
    true,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    highlightedSubtreeData
  );
  opacity = applyDenseInternalNodeOpacity(opacity, nodeData, cached, highlight);

  _borderColorOut[0] = rgb[0];
  _borderColorOut[1] = rgb[1];
  _borderColorOut[2] = rgb[2];
  _borderColorOut[3] = opacity;
  return _borderColorOut;
}

export function getNodeBasedRgba(entity, baseEntityOpacity, cached, helpers) {
  const {
    colorManager: cm,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    highlightedSubtreeData,
  } = cached;

  const node = entity;
  const highlight = resolveTreeElementHighlight(node, cached, 'node');

  const isHighlighted =
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT;
  const isActive = highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE;

  // Use the same color resolution as nodes for consistency
  let rgb;
  if (isActive) {
    rgb = getPivotEdgeColor();
  } else if (isHighlighted) {
    rgb = colorToRgb(getHighlightColor(node, cached) || SYSTEM_TREE_COLORS.defaultColor);
  } else {
    rgb = colorToRgb(cm?.getNodeColor?.(node) || SYSTEM_TREE_COLORS.defaultColor);
  }

  let opacity = helpers.getBaseOpacity(baseEntityOpacity);
  opacity = applyDimmingWithCache(
    opacity,
    cm,
    node,
    true,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    highlightedSubtreeData
  );

  _nodeBasedOut[0] = rgb[0];
  _nodeBasedOut[1] = rgb[1];
  _nodeBasedOut[2] = rgb[2];
  _nodeBasedOut[3] = opacity;
  return _nodeBasedOut;
}
