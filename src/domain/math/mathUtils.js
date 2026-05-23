/**
 * Get shortest angle between two points
 * @param  {Number} a -
 * @param  {Number} b -
 * @return {Number}.
 */
export function shortestAngle(a, b) {
  let v1 = b - a;
  let v2 = b - a - Math.sign(v1) * 2 * Math.PI;

  if (Math.abs(v1) < Math.abs(v2)) {
    return v1;
  } else {
    return v2;
  }
}

/**
 * Clamps a value between min and max bounds
 * @param {number} value - The value to clamp
 * @param {number} [min=0] - Minimum bound
 * @param {number} [max=1] - Maximum bound
 * @returns {number} Clamped value
 */
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/**
 * Calculates interpolation indices for tree transitions
/**
 * Cubic ease-in-out interpolation for biological transitions
 * @param {number} x - Progress value (0-1)
 * @returns {number} Eased progress value
 */
export const easeInOutCubic = (x) => {
  return x ** 2 * 3 - x ** 3 * 2;
};

export const unwrapAngle = (angle, reference) => {
  if (!Number.isFinite(angle) || !Number.isFinite(reference)) return angle;
  const TAU = Math.PI * 2;
  return angle + Math.round((reference - angle) / TAU) * TAU;
};

/**
 * Check if an angular path from startAngle to endAngle crosses a target angle (e.g., root at 0°).
 * Used to detect when interpolation would cross through the root of a radial tree.
 *
 * @param {number} startAngle - Starting angle in radians
 * @param {number} endAngle - Ending angle in radians (after applying delta)
 * @param {number} [targetAngle=0] - The angle to check for crossing (default: 0, the root)
 * @returns {boolean} True if the path crosses the target angle
 */
export function crossesAngle(startAngle, endAngle, targetAngle = 0) {
  const TAU = Math.PI * 2;
  const EPSILON = 1e-10;

  // Normalize all angles to [0, 2π)
  const normalize = (a) => ((a % TAU) + TAU) % TAU;
  const start = normalize(startAngle);
  const end = normalize(endAngle);
  const target = normalize(targetAngle);

  // If start equals end, no crossing
  if (Math.abs(start - end) < EPSILON) return false;

  // Determine if we're going clockwise or counter-clockwise
  const delta = endAngle - startAngle;

  if (delta > 0) {
    // Counter-clockwise (increasing angle)
    if (start <= end) {
      // Normal case: check if target is inside (start, end)
      return target > start + EPSILON && target < end - EPSILON;
    } else {
      // Wrapped case: path goes through 0, check if target is inside (start, 2π) or (0, end)
      return target > start + EPSILON || target < end - EPSILON;
    }
  } else {
    // Clockwise (decreasing angle)
    if (start >= end) {
      // Normal case: check if target is inside (end, start)
      return target > end + EPSILON && target < start - EPSILON;
    } else {
      // Wrapped case: path goes through 0, check if target is inside (0, start) or (end, 2π)
      return target < start - EPSILON || target > end + EPSILON;
    }
  }
}

/**
 * Calculate the "long arc" delta when the short arc would cross the root.
 * Returns the opposite direction delta that avoids crossing the target angle.
 *
 * @param {number} shortDelta - The shortest angular delta
 * @returns {number} The long arc delta (opposite direction)
 */
export function longArcDelta(shortDelta) {
  const TAU = Math.PI * 2;
  return -Math.sign(shortDelta) * (TAU - Math.abs(shortDelta));
}
