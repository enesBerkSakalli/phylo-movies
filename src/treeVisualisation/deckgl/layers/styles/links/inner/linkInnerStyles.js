import { colorToRgb } from '../../../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../../../constants/TreeColors.js';
import { calculateFlightDashArray } from '../dashUtils.js';
import { applyDimmingWithCache } from '../../dimmingUtils.js';
import { getInnerLinkColor } from '../linkUtils.js';

// Reusable output buffers to avoid per-call array allocations
const _linkColorOut = [0, 0, 0, 0];
const _dashOut = [0, 0];



export function getLinkColor(link, cached, helpers) {
  const { colorManager: cm, dimmingEnabled, dimmingOpacity, upcomingChangesEnabled, markedSubtreeData } = cached;

  // History mode - use same blue color but different opacity
  const historyColor = colorToRgb(TREE_COLOR_CATEGORIES.pivotEdgeColor);

  // Check if this is a completed change edge (full opacity - clearly visible)
  if (upcomingChangesEnabled && cm?.isCompletedChangeEdge?.(link)) {
    let opacity = helpers.getBaseOpacity(link.opacity);
    // Full opacity for completed - make it clearly visible
    _linkColorOut[0] = historyColor[0];
    _linkColorOut[1] = historyColor[1];
    _linkColorOut[2] = historyColor[2];
    _linkColorOut[3] = opacity;
    return _linkColorOut;
  }

  // Check if this is an upcoming change edge (semi-transparent - coming next)
  if (upcomingChangesEnabled && cm?.isUpcomingChangeEdge?.(link)) {
    let opacity = helpers.getBaseOpacity(link.opacity);
    opacity = Math.round(opacity * 0.6); // 60% opacity - semi-transparent
    _linkColorOut[0] = historyColor[0];
    _linkColorOut[1] = historyColor[1];
    _linkColorOut[2] = historyColor[2];
    _linkColorOut[3] = opacity;
    return _linkColorOut;
  }

  // Get color for inner line: active edges get blue, marked keep base color (unless contrast mode)
  let rgb = getInnerLinkColor(link, cached);

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



  _linkColorOut[0] = rgb[0];
  _linkColorOut[1] = rgb[1];
  _linkColorOut[2] = rgb[2];
  _linkColorOut[3] = opacity;
  return _linkColorOut;
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
    _dashOut[0] = 3;
    _dashOut[1] = 6;
    return _dashOut; // Short on, longer off = dotted
  }

  // Current: DASHED (when dashing enabled) - active, in progress
  if (dashingEnabled && cm?.isPivotEdge?.(link)) {
    return calculateFlightDashArray(link.path);
  }

  return null; // Solid line for everything else
}
