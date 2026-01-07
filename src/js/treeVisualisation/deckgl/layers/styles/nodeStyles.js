import { colorToRgb, getContrastingHighlightColor } from '../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../constants/TreeColors.js';
import { applyDimmingWithCache } from './dimmingUtils.js';
import { isNodeVisuallyHighlighted, isNodeInSubtree } from './subtreeMatching.js';
import { toColorManagerNode } from './nodeUtils.js';

const shouldHighlightMarkedNode = (nodeData, cached) => {
  const { markedSubtreesEnabled, markedSubtreeData } = cached;
  return markedSubtreesEnabled !== false && markedSubtreeData && isNodeInSubtree(nodeData, markedSubtreeData);
};

const isHistorySubtreeNode = (nodeData, cached) => {
  const { colorManager: cm, markedSubtreesEnabled } = cached;
  return markedSubtreesEnabled !== false && cm?.isNodeHistorySubtree?.(nodeData);
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
      // Get base node color to calculate contrast (matches link behavior)
      const baseHex = cm?.getNodeBaseColor?.(nodeData) || '#000000';
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
      // Get base node color to calculate contrast (matches link behavior)
      const baseHex = cm?.getNodeBaseColor?.(nodeData) || '#000000';
      const baseRgb = colorToRgb(baseHex);
      highlightRgb = getContrastingHighlightColor(baseRgb);
    }
    rgb = highlightRgb;
  } else if (isHistorySubtreeNode(nodeData, cached)) {
    // History subtrees: silhouette-only border
    rgb = colorToRgb(TREE_COLOR_CATEGORIES.strokeColor || '#000000');
  } else if (!isNodeVisuallyHighlighted(nodeData, cm, cached.markedSubtreesEnabled)) {
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
    if (isHistorySubtreeNode(nodeData, cached)) {
      opacity = Math.round(baseOpacity * 200);
    } else if (!isNodeVisuallyHighlighted(nodeData, cm, cached.markedSubtreesEnabled)) {
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
  const { colorManager: cm, upcomingChangesEnabled, densityScale } = cached;
  // NodeSize multiplier from store
  const nodeSize = helpers.nodeSize || 1;
  const baseRadius = (node.radius || minRadius) * nodeSize;

  // Diff-style: entering/exiting nodes are smaller
  if (node.isEntering || node.isExiting) {
    return baseRadius * 0.7;
  }

  if (!cm) {
    return baseRadius;
  }

  // Convert node data
  const nodeData = toColorManagerNode(node);

  // Helper to scale added radius based on density
  // scale = 1.0 (sparse) to 0.3 (dense)
  const scale = densityScale !== undefined ? densityScale : 1.0;
  const getScaledRadius = (multiplier) => baseRadius * (1 + (multiplier - 1) * scale);


  // History mode sizing
  if (upcomingChangesEnabled && cm.isNodeCompletedChangeEdge?.(nodeData)) {
    return getScaledRadius(1.5);
  }

  // Check if node is part of a MARKED subtree (persistent highlight)
  // Larger static size
  if (shouldHighlightMarkedNode(nodeData, cached)) {
    return getScaledRadius(1.6);
  }

  if (isHistorySubtreeNode(nodeData, cached)) {
    return getScaledRadius(1.3);
  }

  // Check if node is highlighted (active edge)
  const isHighlighted = isNodeVisuallyHighlighted(nodeData, cm, cached.markedSubtreesEnabled);

  return isHighlighted ? getScaledRadius(1.5) : baseRadius;
}

export function getLabelColor(label, cached, helpers) {
  const color = getNodeBasedRgba(label, label.opacity, cached, helpers);
  if (isHistorySubtreeNode(label, cached)) {
    color[3] = Math.min(255, Math.round(color[3] * 1.2));
  }
  return color;
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

  if (label && isHistorySubtreeNode(label, cached)) {
    return baseSize * 1.2;
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
      // Use node base color for contrast calculation (matches link behavior)
      const baseHex = cm?.getNodeBaseColor?.(node) || '#000000';
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
