import { getSubtleActiveMoverEmphasis } from '../activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../highlightResolver.js';
import { getReadableMetricScale } from '../readableMetricScale.js';

export function getLinkWidth(link, cached, helpers) {
  const baseWidth = helpers.getBaseStrokeWidth();
  const { colorManager: cm, upcomingChangesEnabled, densityScale } = cached;
  const metricScale = getReadableMetricScale(cached);
  const visualScale = getVisualWidthScale(cached);
  const baseDisplayWidth = baseWidth * visualScale;
  const highlight = resolveTreeElementHighlight(link, cached, 'link');

  // Helper to scale added thickness based on density
  // scale = 1.0 (sparse) to 0.3 (dense)
  const scale = densityScale !== undefined ? densityScale : 1.0;
  const getScaledWidth = (multiplier) => baseDisplayWidth * (1 + (multiplier - 1) * scale);

  if (highlight.role === TREE_HIGHLIGHT_ROLE.LIFECYCLE) {
    return getScaledWidth(2.0) * metricScale;
  }

  if (!cm) {
    return baseDisplayWidth * metricScale; // Fallback without highlighting
  }

  // History mode - different thickness for each state
  // Done: thick (1.8x) - prominent, clearly visible
  // Current: thick (2x) - most prominent
  // Next: medium (1.2x) - less prominent
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
    return getScaledWidth(1.8) * metricScale; // Thick for completed - clearly visible
  }

  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
    return getScaledWidth(1.2) * metricScale; // Medium for upcoming
  }

  if (
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
  ) {
    const emphasis = highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
      ? getSubtleActiveMoverEmphasis(link, cached, 'link')
      : 1;
    if (cached.highlightColorMode === 'contrast') {
      return getScaledWidth(2.0) * emphasis * metricScale;
    }
    return baseDisplayWidth * emphasis * metricScale;
  }

  // Check if link should be highlighted (current active)
  const isHighlighted = highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE;

  const calculatedWidth = isHighlighted ? getScaledWidth(2.0) : baseDisplayWidth; // Thick for current
  return calculatedWidth * metricScale;
}

function getVisualWidthScale(cached) {
  const visualScale = Number(cached?.visualScale);
  return Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1;
}
