/**
 * Converting cartesion Coordinates to Polar Coordinates
 * @param  {Number} x -
 * @param  {Number} y -
 * @return {Object} Object with element r for radius and angle.
 */
export function kar2pol(x, y) {
  const radius = Math.sqrt(x ** 2 + y ** 2);
  let angle = Math.atan(y / x);
  if (x < 0) {
    angle += Math.PI;
  }
  if (x === 0) {
    angle = 0;
  }

  return { r: radius, angle: angle };
}

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
