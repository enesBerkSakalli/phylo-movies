/**
 * Apply gentle interpolation easing (single layer only).
 * Using quadratic ease instead of cubic for smoother, less aggressive easing.
 * @param {number} t - Time factor (0-1)
 * @param {string} easingType - Type of easing ('linear', 'gentle')
 * @returns {number} Eased time factor
 */
export function applyInterpolationEasing(t, easingType = 'linear') {
  if (easingType === 'gentle') {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  return t;
}
