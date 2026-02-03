import { colorToRgb } from '../../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../../constants/TreeColors.js';
import { applyDimmingWithCache } from '../dimmingUtils.js';
import { isNodeVisuallyHighlighted } from '../../../../systems/tree_color/visualHighlights.js';
import { toColorManagerNode, shouldHighlightNode, isHistorySubtreeNode, getHighlightColor, isNodePivotEdge, getPivotEdgeColor } from './nodeUtils.js';
// Re-export from dedicated file
export { getNodeRadius } from './nodeRadiusStyles.js';
export { getNodeLineWidth } from './nodeWidthStyles.js';

/**
 * Checks for history and upcoming change states and returns the appropriate color.
 * @param {Object} nodeData - The node data
 * @param {Object} cached - Cached state
 * @param {number} baseOpacity - The base opacity
 * @returns {Array|null} [r, g, b, a] color array or null if no history state applies
 */
function resolveHistoryNodeColor(nodeData, cached, baseOpacity) {
  const { colorManager: cm, upcomingChangesEnabled } = cached;

  if (upcomingChangesEnabled) {
    const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.pivotEdgeColor);

    if (cm.isNodeCompletedChangeEdge(nodeData)) {
      return [...historyColor, baseOpacity];
    }
    if (cm.isNodeUpcomingChangeEdge(nodeData)) {
      // Upcoming changes are semi-transparent
      return [...historyColor, Math.round(baseOpacity * 0.6)];
    }
  }
  return null;
}

/**
 * Resolves the base RGB color for a node, considering highlights and marked subtrees.
 * @param {Object} nodeData - The node data (D3 hierarchy node)
 * @param {Object} cached - Cached state from LayerStyles
 * @param {Object} cm - ColorManager instance
 * @returns {Array} [r, g, b] color array
 */
function resolveBaseNodeColor(nodeData, cached, cm) {
  const isHighlighted = shouldHighlightNode(nodeData, cached);

  if (isHighlighted) {
    return getHighlightColor(nodeData, cached);
  }
  return colorToRgb(cm.getNodeColor(nodeData) || '#000000');
}

export function getNodeColor(node, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, upcomingChangesEnabled, markedSubtreeData, subtreeDimmingEnabled, subtreeDimmingOpacity } = cached;

  // 0. Explicit Color Override (ConnectorLayers pattern)
  // Check raw node first (deck.gl datum)
  if (node.color) {
    // Expecting [r, g, b] in node.color
    return [...node.color, helpers.getBaseOpacity(node.opacity)];
  }

  // Convert node data once
  const nodeData = toColorManagerNode(node);
  const baseOpacity = helpers.getBaseOpacity(node.opacity);

  // 1. History & Change Management State
  const historyColor = resolveHistoryNodeColor(nodeData, cached, baseOpacity);
  if (historyColor) {
    return historyColor;
  }

  // 2. Pivot Edge - blue color (same as links)
  const isPivot = isNodePivotEdge(nodeData, cached);
  if (isPivot) {
    const pivotColor = getPivotEdgeColor();
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
      markedSubtreeData
    );
    const result = [...pivotColor, opacity];
    return result;
  }

  // 3. Base Color Resolution
  const rgb = resolveBaseNodeColor(nodeData, cached, cm);

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
    markedSubtreeData
  );

  return [...rgb, opacity];
}

export function getNodeBorderColor(node, cached, helpers) {
  const { colorManager: cm, upcomingChangesEnabled, highlightColorMode, pulseOpacity } = cached;
  const nodeData = toColorManagerNode(node);

  const baseOpacity = helpers.getBaseOpacity(node.opacity);

  // 1. History Borders
  const historyColor = resolveHistoryNodeColor(nodeData, cached, baseOpacity);
  if (historyColor) {
    // Darken: ~70% brightness
    const [r, g, b, a] = historyColor;
    return [Math.round(r * 0.7), Math.round(g * 0.7), Math.round(b * 0.7), a];
  }

  // 2. Determine Border Color
  let rgb;
  const isHighlighted = shouldHighlightNode(nodeData, cached);
  const isActive = isNodePivotEdge(nodeData, cached);

  if (isActive) {
    rgb = getPivotEdgeColor();
  } else if (isHighlighted) {
    rgb = getHighlightColor(nodeData, cached);
  } else {
    // Standard Base Color (usually black stroke)
    // "Visually Highlighted" checks are implicitly covered by isActive/isHighlighted above
    rgb = colorToRgb(TREE_COLOR_CATEGORIES.strokeColor || '#000000');
  }

  // 3. Opacity Calculation
  let opacity = 255;

  if (isHighlighted || isActive) {
    // Highlighted/Active: Full base opacity
    opacity = baseOpacity;
  } else {
    // Standard Nodes
    const nodeOpacityFloat = node.opacity !== undefined ? node.opacity : 1;

    // Check history subtree status for opacity fix
    if (isHistorySubtreeNode(nodeData, cached)) {
      opacity = Math.round(nodeOpacityFloat * 160); // Reduced from 200 for subtler effect
    } else {
      // Standard nodes use base opacity (255)
      // Pulsing logic for non-active nodes (if any) would go here
      opacity = Math.round(nodeOpacityFloat * 255);
    }
  }

  // Apply dimming
  const { dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity, markedSubtreeData } = cached;

  opacity = applyDimmingWithCache(
    opacity,
    cm,
    nodeData,
    true,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    markedSubtreeData
  );

  return [...rgb, opacity];
}

export function getNodeBasedRgba(entity, baseEntityOpacity, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity, markedSubtreeData } = cached;

  const node = toColorManagerNode(entity);

  const isHighlighted = shouldHighlightNode(node, cached) || isNodeVisuallyHighlighted(node, cm, cached.markedSubtreesEnabled);

  // Use the same color resolution as nodes for consistency
  const rgb = isHighlighted
    ? colorToRgb(getHighlightColor(node, cached) || '#000000')
    : colorToRgb(cm.getNodeColor(node) || '#000000');

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
    markedSubtreeData
  );

  return [...rgb, opacity];
}
