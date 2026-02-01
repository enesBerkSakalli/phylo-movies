import { colorToRgb, getContrastingHighlightColor } from '../../../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../../../constants/TreeColors.js';
import { calculateFlightDashArray } from '../dashUtils.js';
import { applyDimmingWithCache } from '../../dimmingUtils.js';
import { shouldHighlightMarkedSubtree, shouldHighlightHistorySubtree, getHistoryOutlineStyle, getMarkedHighlightColor } from '../linkUtils.js';
import { isLinkVisuallyHighlighted } from '../../../../../systems/tree_color/visualHighlights.js';

export function getLinkOutlineDashArray(link, cached) {
  const { colorManager: cm, dashingEnabled, upcomingChangesEnabled } = cached;

  // Done: solid
  if (upcomingChangesEnabled && cm.isCompletedChangeEdge(link)) {
    return null;
  }

  // Next: dotted
  if (upcomingChangesEnabled && cm.isUpcomingChangeEdge(link)) {
    return [3, 6];
  }

  // Current: dashed (when enabled)
  if (dashingEnabled && cm.isActiveChangeEdge(link)) {
    return calculateFlightDashArray(link.path);
  }

  return null;
}

export function getLinkOutlineColor(link, cached) {
  const {
    colorManager: cm,
    pulseOpacity,
    upcomingChangesEnabled,
    markedSubtreeData,
    highlightColorMode,
    markedSubtreeOpacity,
  } = cached;

  if (!cm) {
    return [0, 0, 0, 0]; // Transparent if no ColorManager
  }

  const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.activeChangeEdgeColor);
  const baseOpacity = link.opacity !== undefined ? link.opacity : 1;

  // 1. Determine base RGB
  let rgb = [0, 0, 0];
  let glowOpacity = 0;

  // Check for history/upcoming changes using shared helper
  const historyStyle = getHistoryOutlineStyle(link, cm, upcomingChangesEnabled, baseOpacity, historyColor);
  if (historyStyle) {
    rgb = historyStyle.rgb;
    glowOpacity = historyStyle.glowOpacity;
  }

  // Check if link is part of a MARKED subtree (persistent highlight)
  // Priority: Marked (Red) > Active (Blue)
  // We allow Marked highlight even if it's active, so the specific jumping subtree stands out
  // from the broader active pivot edge.
  else if (shouldHighlightMarkedSubtree(link, cached)) {
    const mode = cached.highlightColorMode || 'solid';
    rgb = getMarkedHighlightColor(link, cm, mode, cached.markedColor);

    // Apply adjustable opacity from slider
    const sensitivity = markedSubtreeOpacity ?? 0.8;
    glowOpacity = Math.round(baseOpacity * 255 * sensitivity);
  }

  // History subtrees: base color silhouette without pulsing
  // We remove the isActiveChangeEdge constraint because history items may have left the active zone
  else if (shouldHighlightHistorySubtree(link, cached)) {
    rgb = colorToRgb(cm.getBranchColor(link));
    glowOpacity = Math.round(baseOpacity * 100); // Reduced from 160 for subtler effect
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
  // Moderate glow width (reduced from baseWidth * 2 + 8 for less aggressive highlighting)
  if (shouldHighlightMarkedSubtree(link, cached)) {
    return baseWidth * 1.5 + 4; // Balanced glow for visibility without being too prominent
  }

  // History subtrees: subtle silhouette without pulse (reduced from baseWidth * 2 + 4)
  if (shouldHighlightHistorySubtree(link, cached) && !cm?.isActiveChangeEdge?.(link)) {
    return baseWidth * 1.5 + 2;
  }

  // Only show outline for highlighted branches
  if (!isLinkVisuallyHighlighted(link, cm, cached.markedSubtreesEnabled)) {
    return 0;
  }

  // Current: large pulsing glow

  // FIXED: Moving subtrees should have static highlight (like marked subtrees), not pulse
  if (cm.isLinkMovingSubtree?.(link)) {
    return baseWidth * 2 + 8; // Static bold glow
  }

  const highlightedWidth = baseWidth * 2;
  const minGlow = 4;
  const maxGlow = 8;
  const glowRange = maxGlow - minGlow;
  const pulseGlow = minGlow + (glowRange * pulseOpacity);

  return highlightedWidth + pulseGlow;
}
