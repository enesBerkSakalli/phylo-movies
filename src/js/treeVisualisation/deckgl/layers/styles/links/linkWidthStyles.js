
import { isLinkVisuallyHighlighted } from '../../../../systems/tree_color/visualHighlights.js';
import { shouldHighlightMarkedSubtree, shouldHighlightHistorySubtree } from './linkUtils.js';

export function getLinkWidth(link, cached, helpers) {
  const baseWidth = helpers.getBaseStrokeWidth();
  const { colorManager: cm, upcomingChangesEnabled, densityScale } = cached;

  if (!cm) {
    return Math.max(baseWidth, 2); // Fallback without highlighting
  }

  // Helper to scale added thickness based on density
  // scale = 1.0 (sparse) to 0.3 (dense)
  const { metricScale = 1.0 } = cached;
  const scale = densityScale !== undefined ? densityScale : 1.0;
  const getScaledWidth = (multiplier) => baseWidth * (1 + (multiplier - 1) * scale);


  // History mode - different thickness for each state
  // Done: thick (1.8x) - prominent, clearly visible
  // Current: thick (2x) - most prominent
  // Next: medium (1.2x) - less prominent
  if (upcomingChangesEnabled && cm.isCompletedChangeEdge?.(link)) {
    return getScaledWidth(1.8) * metricScale; // Thick for completed - clearly visible
  }

  if (upcomingChangesEnabled && cm.isUpcomingChangeEdge?.(link)) {
    return getScaledWidth(1.2) * metricScale; // Medium for upcoming
  }

  // Check if link is part of a MARKED subtree (persistent highlight)
  // Static, very thick stroke to ensure visibility without pulsing
  // Pivot edge takes precedence
  if (shouldHighlightMarkedSubtree(link, cached) && !cm?.isPivotEdge?.(link)) {
    // Only thicken the inner line in High Contrast Mode
    if (cached.highlightColorMode === 'contrast') {
      return getScaledWidth(2.0) * metricScale;
    }
    // In other modes ('taxa', 'solid'), keep standard width
    return baseWidth * metricScale;
  }

  // History subtrees: slightly bolder stroke (reduced from 1.4 for subtler effect)
  if (shouldHighlightHistorySubtree(link, cached) && !cm?.isPivotEdge?.(link)) {
    return getScaledWidth(1.4) * metricScale;
  }

  // Check if link should be highlighted (current active)
  const isHighlighted = isLinkVisuallyHighlighted(link, cm, cached.markedSubtreesEnabled);

  const calculatedWidth = isHighlighted ? getScaledWidth(2.0) : baseWidth; // Thick for current
  return calculatedWidth * metricScale;
}
