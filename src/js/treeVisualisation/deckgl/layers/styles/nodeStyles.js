import { colorToRgb, getContrastingHighlightColor } from '../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../constants/TreeColors.js';
import { applyDimmingWithCache } from './dimmingUtils.js';
import { isNodeVisuallyHighlighted, isNodeInSubtree } from './subtreeMatching.js';
import { toColorManagerNode } from './nodeUtils.js';

const shouldHighlightMarkedNode = (nodeData, cached) => {
  const { markedSubtreesEnabled, markedSubtreeData } = cached;
  return markedSubtreesEnabled !== false && markedSubtreeData && isNodeInSubtree(nodeData, markedSubtreeData);
};

export function getNodeColor(node, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, upcomingChangesEnabled, markedSubtreeData, highContrastHighlightingEnabled } = cached;

  // Convert node data to format expected by ColorManager
  const nodeData = toColorManagerNode(node);

  // History mode - blue node
  const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);

  // Completed changes - full opacity blue
  if (upcomingChangesEnabled && cm?.isNodeCompletedChangeEdge?.(nodeData)) {
    let opacity = helpers.getBaseOpacity(node.opacity);
    return [...historyColor, opacity];
  }

  // Upcoming changes - semi-transparent blue
  if (upcomingChangesEnabled && cm?.isNodeUpcomingChangeEdge?.(nodeData)) {
    let opacity = helpers.getBaseOpacity(node.opacity);
    opacity = Math.round(opacity * 0.6);
    return [...historyColor, opacity];
  }

  // Get base color from ColorManager (resolves Taxa vs Group colors)
  let rgb = colorToRgb(cm?.getNodeColor?.(nodeData) || '#000000');

  // Check if node is MARKED (persistent highlight)
  // Use high-contrast color for fill if enabled
  if (shouldHighlightMarkedNode(nodeData, cached)) {
    let highlightRgb = colorToRgb(TREE_COLOR_CATEGORIES.markedColor);

    if (highContrastHighlightingEnabled) {
      // Get base color to calculate contrast
      const baseHex = cm?.getBranchColor?.(nodeData) || '#000000';
      const baseRgb = colorToRgb(baseHex);
      highlightRgb = getContrastingHighlightColor(baseRgb);
    }
    rgb = highlightRgb;
  }

  // Calculate opacity with unified dimming logic
  const { subtreeDimmingEnabled, subtreeDimmingOpacity } = cached;
  let opacity = helpers.getBaseOpacity(node.opacity);
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
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, upcomingChangesEnabled, markedSubtreeData, pulseOpacity, highContrastHighlightingEnabled } = cached;
  const nodeData = toColorManagerNode(node);

  if (!cm) {
    return [0, 0, 0, 0];
  }

  // History mode - borders match fill logic mostly
  if (upcomingChangesEnabled && cm?.isNodeCompletedChangeEdge?.(nodeData)) {
    const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);
    let opacity = helpers.getBaseOpacity(node.opacity);
    return [Math.round(historyColor[0] * 0.7), Math.round(historyColor[1] * 0.7), Math.round(historyColor[2] * 0.7), opacity];
  }

  if (upcomingChangesEnabled && cm?.isNodeUpcomingChangeEdge?.(nodeData)) {
    const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);
    let opacity = helpers.getBaseOpacity(node.opacity);
    opacity = Math.round(opacity * 0.6);
    return [Math.round(historyColor[0] * 0.7), Math.round(historyColor[1] * 0.7), Math.round(historyColor[2] * 0.7), opacity];
  }

  const baseOpacity = node.opacity !== undefined ? node.opacity : 1;

  // Get base fill color or marked color
  let rgb = [0, 0, 0];

  // Check if node is MARKED (persistent highlight)
  // Use static opaque border matching the high-contrast glow
  if (shouldHighlightMarkedNode(nodeData, cached)) {
    let highlightRgb = colorToRgb(TREE_COLOR_CATEGORIES.markedColor);

    if (highContrastHighlightingEnabled) {
       // Get base branch color to calculate contrast - use same source as getNodeColor
      const baseHex = cm?.getBranchColor?.(nodeData) || '#000000';
      const baseRgb = colorToRgb(baseHex);
      highlightRgb = getContrastingHighlightColor(baseRgb);
    }
    rgb = highlightRgb;
  } else if (!isNodeVisuallyHighlighted(nodeData, cm)) {
    // Normal node border
    rgb = colorToRgb(TREE_COLOR_CATEGORIES.strokeColor || '#000000');
  } else {
    // Active Edge: pulsing border base color
    const hexColor = cm.getNodeColor(nodeData);
    rgb = colorToRgb(hexColor);
  }

  // Calculate final opacity
  let opacity = 255;
  if (!shouldHighlightMarkedNode(nodeData, cached)) {
    if (!isNodeVisuallyHighlighted(nodeData, cm)) {
        opacity = Math.round(baseOpacity * 255);
    } else {
        opacity = Math.round(baseOpacity * 255 * pulseOpacity);
    }
  }

  // Apply dimming logic uniformly
  const { subtreeDimmingEnabled, subtreeDimmingOpacity } = cached;
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

export function getNodeRadius(node, minRadius = 3, cached, helpers) {
  const { colorManager: cm, upcomingChangesEnabled } = cached;
  // NodeSize multiplier from store
  const nodeSize = helpers.nodeSize || 1;
  const baseRadius = (node.radius || minRadius) * nodeSize;

  if (!cm) {
    return baseRadius;
  }

  // Convert node data
  const nodeData = toColorManagerNode(node);

  // History mode sizing
  if (upcomingChangesEnabled && cm.isNodeCompletedChangeEdge?.(nodeData)) {
    return baseRadius * 1.5;
  }

  // Check if node is part of a MARKED subtree (persistent highlight)
  // Larger static size
  if (shouldHighlightMarkedNode(nodeData, cached)) {
    return baseRadius * 1.6;
  }

  // Check if node is highlighted (active edge)
  const isHighlighted = isNodeVisuallyHighlighted(nodeData, cm);

  return isHighlighted ? baseRadius * 1.5 : baseRadius;
}

export function getLabelColor(label, cached, helpers) {
  return getNodeBasedRgba(label, label.opacity, cached, helpers);
}

export function getLabelSize(label, fontSize, cached) {
  const baseSize = parseFloat(fontSize) * 10 || 16;

  // Check if this label is part of a marked subtree
  if (cached?.markedSubtreeData && label) {
    const nodeData = toColorManagerNode(label);
    if (shouldHighlightMarkedNode(nodeData, cached)) {
      return baseSize * 1.4; // 40% larger for marked labels
    }
  }

  return baseSize;
}

export function getNodeBasedRgba(entity, baseOpacity, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity, markedSubtreeData, highContrastHighlightingEnabled } = cached;
  const node = toColorManagerNode(entity);

  let rgb = colorToRgb(cm?.getNodeColor?.(node) || '#000000');

  // Check if part of marked subtree - if so, use contrasting highlight
  if (shouldHighlightMarkedNode(node, cached)) {
     let highlightRgb = colorToRgb(TREE_COLOR_CATEGORIES.markedColor); // Default red

     if (highContrastHighlightingEnabled) {
       // Use branch color for contrast calculation to match nodes and links
       const baseHex = cm?.getBranchColor?.(node) || '#000000';
       const baseRgb = colorToRgb(baseHex);
       highlightRgb = getContrastingHighlightColor(baseRgb);
     }
     rgb = highlightRgb;
  }

  let opacity = helpers.getBaseOpacity(baseOpacity);

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
