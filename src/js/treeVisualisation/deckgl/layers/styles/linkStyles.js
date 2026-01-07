import { colorToRgb, getContrastingHighlightColor } from '../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../constants/TreeColors.js';
import { calculateDashArray } from './dashUtils.js';
import { applyDimmingWithCache } from './dimmingUtils.js';
import { isLinkVisuallyHighlighted, isLinkInSubtree } from './subtreeMatching.js';

const shouldHighlightMarkedSubtree = (link, cached) => {
  const { markedSubtreesEnabled, markedSubtreeData } = cached;
  return markedSubtreesEnabled !== false && markedSubtreeData && isLinkInSubtree(link, markedSubtreeData);
};

const shouldHighlightHistorySubtree = (link, cached) => {
  const { colorManager: cm, markedSubtreesEnabled } = cached;
  return markedSubtreesEnabled !== false && cm?.isLinkHistorySubtree?.(link);
};

export function getLinkColor(link, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, upcomingChangesEnabled, markedSubtreeData } = cached;

  // History mode - use same blue color but different opacity
  const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);

  // Check if this is a completed change edge (full opacity - clearly visible)
  if (upcomingChangesEnabled && cm?.isCompletedChangeEdge?.(link)) {
    let opacity = helpers.getBaseOpacity(link.opacity);
    // Full opacity for completed - make it clearly visible
    return [...historyColor, opacity];
  }

  // Check if this is an upcoming change edge (semi-transparent - coming next)
  if (upcomingChangesEnabled && cm?.isUpcomingChangeEdge?.(link)) {
    let opacity = helpers.getBaseOpacity(link.opacity);
    opacity = Math.round(opacity * 0.6); // 60% opacity - semi-transparent
    return [...historyColor, opacity];
  }

  // Get color for inner line: active edges get blue, marked keep base color
  let rgb = colorToRgb(cm.getBranchColorForInnerLine(link));

  // Check if link is part of a MARKED subtree (persistent highlight)
  if (shouldHighlightMarkedSubtree(link, cached)) {
    // Default to markedColor
    let highlightRgb = colorToRgb(TREE_COLOR_CATEGORIES.markedColor);

    // If High Contrast Highlighting is ENABLED, calculate dynamic contrast
    if (cached.highContrastHighlightingEnabled) {
      // Use standard branch color for contrast calculation (ignore inner line overrides)
      const baseRgb = colorToRgb(cm.getBranchColor(link));
      highlightRgb = getContrastingHighlightColor(baseRgb);
    }
    rgb = highlightRgb;
  }

  // Calculate opacity with unified dimming logic
  const { subtreeDimmingEnabled, subtreeDimmingOpacity } = cached;
  let opacity = helpers.getBaseOpacity(link.opacity);
  opacity = applyDimmingWithCache(
    opacity,
    cm,
    link,
    false,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    markedSubtreeData
  );

  // Apply connection opacity from settings
  // This applies to ALL links (regular and marked)
  const connectionOpacity = cached.linkConnectionOpacity !== undefined ? cached.linkConnectionOpacity : 0.6;
  opacity = Math.round(opacity * connectionOpacity);

  return [...rgb, opacity];
}

export function getLinkWidth(link, cached, helpers) {
  const baseWidth = helpers.getBaseStrokeWidth();
  const { colorManager: cm, upcomingChangesEnabled, densityScale } = cached;

  if (!cm) {
    return Math.max(baseWidth, 2); // Fallback without highlighting
  }

  // Helper to scale added thickness based on density
  // scale = 1.0 (sparse) to 0.3 (dense)
  const scale = densityScale !== undefined ? densityScale : 1.0;
  const getScaledWidth = (multiplier) => baseWidth * (1 + (multiplier - 1) * scale);


  // History mode - different thickness for each state
  // Done: thick (1.8x) - prominent, clearly visible
  // Current: thick (2x) - most prominent
  // Next: medium (1.2x) - less prominent
  if (upcomingChangesEnabled && cm.isCompletedChangeEdge?.(link)) {
    return getScaledWidth(1.8); // Thick for completed - clearly visible
  }

  if (upcomingChangesEnabled && cm.isUpcomingChangeEdge?.(link)) {
    return getScaledWidth(1.2); // Medium for upcoming
  }

  // Check if link is part of a MARKED subtree (persistent highlight)
  // Static, very thick stroke to ensure visibility without pulsing
  if (shouldHighlightMarkedSubtree(link, cached)) {
    return getScaledWidth(3.0); // Very thick for marked subtrees
  }

  // History subtrees: bold stroke
  if (shouldHighlightHistorySubtree(link, cached) && !cm?.isActiveChangeEdge?.(link)) {
    return getScaledWidth(2.2);
  }

  // Check if link should be highlighted (current active)
  const isHighlighted = isLinkVisuallyHighlighted(link, cm, cached.markedSubtreesEnabled);

  return isHighlighted ? getScaledWidth(2.0) : baseWidth; // Thick for current
}

export function getLinkDashArray(link, cached) {
  const { colorManager: cm, dashingEnabled, upcomingChangesEnabled } = cached;

  // History mode line styles
  // Done: SOLID (no dashing) - completed, stable
  if (upcomingChangesEnabled && cm?.isCompletedChangeEdge?.(link)) {
    return null; // Solid line for completed
  }

  // Next: DOTTED (small dots) - future, anticipation
  if (upcomingChangesEnabled && cm?.isUpcomingChangeEdge?.(link)) {
    // Small dots pattern
    return [3, 6]; // Short on, longer off = dotted
  }

  // Current: DASHED (when dashing enabled) - active, in progress
  if (dashingEnabled && cm?.isActiveChangeEdge?.(link)) {
    return calculateDashArray(link.path);
  }

  return null; // Solid line for everything else
}

export function getLinkOutlineDashArray(link, cached) {
  const { colorManager: cm, dashingEnabled, upcomingChangesEnabled } = cached;

  // Done: solid
  if (upcomingChangesEnabled && cm?.isCompletedChangeEdge?.(link)) {
    return null;
  }

  // Next: dotted
  if (upcomingChangesEnabled && cm?.isUpcomingChangeEdge?.(link)) {
    return [3, 6];
  }

  // Current: dashed (when enabled)
  if (dashingEnabled && cm?.isActiveChangeEdge?.(link)) {
    return calculateDashArray(link.path);
  }

  return null;
}

export function getLinkOutlineColor(link, cached) {
  const {
    colorManager: cm,
    pulseOpacity,
    upcomingChangesEnabled,
    markedSubtreeData,
    highContrastHighlightingEnabled,
    linkConnectionOpacity,
  } = cached;

  if (!cm) {
    return [0, 0, 0, 0]; // Transparent if no ColorManager
  }

  const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);
  const baseOpacity = link.opacity !== undefined ? link.opacity : 1;

  // 1. Determine base RGB
  let rgb = [0, 0, 0];
  let glowOpacity = 0;

  // Done: strong static glow (same intensity as current)
  if (upcomingChangesEnabled && cm.isCompletedChangeEdge?.(link)) {
    rgb = historyColor;
    glowOpacity = Math.round(baseOpacity * 180); // Strong glow
  }
  // Next: medium static glow
  else if (upcomingChangesEnabled && cm.isUpcomingChangeEdge?.(link)) {
    rgb = historyColor;
    glowOpacity = Math.round(baseOpacity * 120); // Medium glow
  }
  // Check if link is part of a MARKED subtree (persistent highlight)
  else if (shouldHighlightMarkedSubtree(link, cached)) {
    // Default to markedColor
    let highlightRgb = colorToRgb(TREE_COLOR_CATEGORIES.markedColor);

    // If High Contrast Highlighting is ENABLED, calculate dynamic contrast
    if (highContrastHighlightingEnabled) {
      // Use standard branch color for contrast calculation (ignore inner line overrides)
      const baseRgb = colorToRgb(cm.getBranchColor(link));
      highlightRgb = getContrastingHighlightColor(baseRgb);
    }
    rgb = highlightRgb;
    glowOpacity = Math.round(baseOpacity * 255); // Full opacity for persistent visibility
  }
  // History subtrees: base color silhouette without pulsing
  else if (shouldHighlightHistorySubtree(link, cached) && !cm?.isActiveChangeEdge?.(link)) {
    rgb = colorToRgb(cm.getBranchColor(link));
    glowOpacity = Math.round(baseOpacity * 160);
  }
  // Current Active Edge: strong pulsing glow
  else if (isLinkVisuallyHighlighted(link, cm, cached.markedSubtreesEnabled)) {
    rgb = colorToRgb(cm.getBranchColorWithHighlights(link));
    glowOpacity = Math.round(baseOpacity * 128 * pulseOpacity);
  }
  // Otherwise: no outline
  else {
    return [0, 0, 0, 0];
  }

  // 2. Apply Dimming logic
  const { dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity } = cached;
  glowOpacity = applyDimmingWithCache(
    glowOpacity,
    cm,
    link,
    false,
    dimmingEnabled,
    dimmingOpacity,
    subtreeDimmingEnabled,
    subtreeDimmingOpacity,
    markedSubtreeData
  );

  // Scale outline intensity alongside connection opacity so highlights match link visibility
  const connectionOpacity = linkConnectionOpacity !== undefined ? linkConnectionOpacity : 0.6;
  glowOpacity = Math.round(glowOpacity * connectionOpacity);

  return [...rgb, glowOpacity];
}

export function getLinkOutlineWidth(link, cached, helpers) {
  const { colorManager: cm, pulseOpacity, upcomingChangesEnabled, markedSubtreeData } = cached;

  if (!cm) {
    return 0;
  }

  const baseWidth = helpers.getBaseStrokeWidth();

  // Done: large static glow (same size as current, but no pulse)
  if (upcomingChangesEnabled && cm.isCompletedChangeEdge?.(link)) {
    const highlightedWidth = baseWidth * 2;
    return highlightedWidth + 6; // Same large glow as current
  }

  // Next: medium static glow
  if (upcomingChangesEnabled && cm.isUpcomingChangeEdge?.(link)) {
    return baseWidth + 4;
  }

  // Check if link is part of a MARKED subtree (persistent highlight)
  // Large static glow width
  if (shouldHighlightMarkedSubtree(link, cached)) {
    return baseWidth * 2 + 8; // Extra generous glow for visibility
  }

  // History subtrees: bold silhouette without pulse
  if (shouldHighlightHistorySubtree(link, cached) && !cm?.isActiveChangeEdge?.(link)) {
    return baseWidth * 2 + 4;
  }

  // Only show outline for highlighted branches
  if (!isLinkVisuallyHighlighted(link, cm, cached.markedSubtreesEnabled)) {
    return 0;
  }

  // Current: large pulsing glow
  const highlightedWidth = baseWidth * 2;
  const minGlow = 4;
  const maxGlow = 8;
  const glowRange = maxGlow - minGlow;
  const pulseGlow = minGlow + (glowRange * pulseOpacity);

  return highlightedWidth + pulseGlow;
}
