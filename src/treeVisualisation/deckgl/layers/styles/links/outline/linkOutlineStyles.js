import { colorToRgb } from '../../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../../constants/TreeColors.js';
import { calculateFlightDashArray } from '../dashUtils.js';
import { applyDimmingWithCache } from '../../dimmingUtils.js';
import { getSubtreeHighlightRgb } from '../linkUtils.js';
import { getActiveMoverEmphasis } from '../../activeMoverEmphasis.js';
import { resolveTreeElementHighlight, TREE_HIGHLIGHT_ROLE } from '../../highlightResolver.js';
import { getReadableMetricScale } from '../../readableMetricScale.js';

// Reusable output buffers to avoid per-call array allocations
const _outlineColorOut = [0, 0, 0, 0];
const _transparentColor = [0, 0, 0, 0];
const _outlineDashOut = [0, 0];
const PIVOT_GLOW_MIN_OPACITY = 160;
const PIVOT_GLOW_OPACITY_RANGE = 80;

export function getLinkOutlineDashArray(link, cached) {
  const { dashingEnabled, upcomingChangesEnabled } = cached;
  const highlight = resolveTreeElementHighlight(link, cached, 'link');

  // Done: solid
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
    return null;
  }

  // Next: dotted
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
    _outlineDashOut[0] = 3;
    _outlineDashOut[1] = 6;
    return _outlineDashOut;
  }

  // Current: dashed (when enabled)
  if (dashingEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE) {
    return calculateFlightDashArray(link.path);
  }

  return null;
}

export function getLinkOutlineColor(link, cached) {
  const {
    colorManager: cm,
    pulseOpacity,
    upcomingChangesEnabled,
    highlightedSubtreeData,
    subtreeHighlightOpacity,
  } = cached;
  const highlight = resolveTreeElementHighlight(link, cached, 'link');
  const historyColor = colorToRgb(SYSTEM_TREE_COLORS.pivotEdgeColor);
  const baseOpacity = link.opacity !== undefined ? link.opacity : 1;

  if (!cm && highlight.role !== TREE_HIGHLIGHT_ROLE.LIFECYCLE) {
    _transparentColor[0] = 0;
    _transparentColor[1] = 0;
    _transparentColor[2] = 0;
    _transparentColor[3] = 0;
    return _transparentColor; // Transparent if no ColorManager
  }

  // 1. Determine base RGB
  let rgb = [0, 0, 0];
  let glowOpacity = 0;
  let hasOutline = false;

  if (highlight.role === TREE_HIGHLIGHT_ROLE.LIFECYCLE) {
    rgb = highlight.rgb;
    glowOpacity = Math.round(baseOpacity * 179);
    hasOutline = true;
  } else if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
    rgb = historyColor;
    glowOpacity = Math.round(baseOpacity * 180);
    hasOutline = true;
  } else if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
    rgb = historyColor;
    glowOpacity = Math.round(baseOpacity * 120);
    hasOutline = true;
  } else {
    // Let the active mover highlight stand out from the broader pivot edge.
    if (
      highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
      highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
    ) {
      const mode = cached.highlightColorMode || 'solid';
      rgb = getSubtreeHighlightRgb(link, cm, mode, cached.subtreeHighlightColor);

      const sensitivity = subtreeHighlightOpacity ?? 0.5;
      glowOpacity = Math.round(baseOpacity * 190 * sensitivity);
      hasOutline = true;
    } else if (highlight.role === TREE_HIGHLIGHT_ROLE.PIVOT_EDGE) {
      // Current Pivot Edge: keep the pulse visible even at the trough.
      rgb = colorToRgb(cm.getBranchColorWithHighlights(link));
      glowOpacity = Math.round(
        baseOpacity * (PIVOT_GLOW_MIN_OPACITY + PIVOT_GLOW_OPACITY_RANGE * pulseOpacity)
      );
      hasOutline = true;
    }
  }

  // Otherwise: no outline
  if (!hasOutline) {
    _transparentColor[0] = 0;
    _transparentColor[1] = 0;
    _transparentColor[2] = 0;
    _transparentColor[3] = 0;
    return _transparentColor;
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
    highlightedSubtreeData
  );

  _outlineColorOut[0] = rgb[0];
  _outlineColorOut[1] = rgb[1];
  _outlineColorOut[2] = rgb[2];
  _outlineColorOut[3] = glowOpacity;
  return _outlineColorOut;
}

export function getLinkOutlineWidth(link, cached, helpers) {
  const { colorManager: cm, pulseOpacity, upcomingChangesEnabled } = cached;
  const metricScale = getReadableMetricScale(cached);
  const baseWidth = helpers.getBaseStrokeWidth();
  const highlight = resolveTreeElementHighlight(link, cached, 'link');

  if (highlight.role === TREE_HIGHLIGHT_ROLE.LIFECYCLE) {
    return (baseWidth * 2 + 6) * metricScale;
  }

  if (!cm) {
    return 0;
  }

  // Done: large static glow (same size as current, but no pulse)
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.COMPLETED_CHANGE) {
    const highlightedWidth = baseWidth * 2;
    return (highlightedWidth + 6) * metricScale; // Same large glow as current
  }

  // Next: medium static glow
  if (upcomingChangesEnabled && highlight.role === TREE_HIGHLIGHT_ROLE.UPCOMING_CHANGE) {
    return (baseWidth + 4) * metricScale;
  }

  if (
    highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER ||
    highlight.role === TREE_HIGHLIGHT_ROLE.SUBTREE_HIGHLIGHT
  ) {
    const emphasis =
      highlight.role === TREE_HIGHLIGHT_ROLE.ACTIVE_MOVER
        ? getActiveMoverEmphasis(link, cached, 'link')
        : 1;
    const focusedWidth = Math.min(baseWidth + 2.5, baseWidth * 2.5);
    return focusedWidth * emphasis * metricScale;
  }

  // Only show outline for highlighted branches
  if (highlight.role !== TREE_HIGHLIGHT_ROLE.PIVOT_EDGE) {
    return 0;
  }

  const highlightedWidth = baseWidth * 2;
  const minGlow = 4;
  const maxGlow = 8;
  const glowRange = maxGlow - minGlow;
  const pulseGlow = minGlow + glowRange * pulseOpacity;

  return (highlightedWidth + pulseGlow) * metricScale;
}
