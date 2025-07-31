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
 * @param {number} total - Total number of trees
 * @param {number} progress - Progress value between 0-1
 * @returns {Object} Interpolation indices and segment progress
 */
export const calculateInterpolationIndices = (total, progress) => {
  const exact = progress * (total - 1);
  return {
    from: Math.floor(exact),
    to: Math.min(Math.floor(exact) + 1, total - 1),
    segment: exact - Math.floor(exact)
  };
};

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} progress - Progress between 0-1
 * @returns {number} Interpolated value
 */
export const lerp = (start, end, progress) => {
  return start + (end - start) * progress;
};

/**
 * Smooth step interpolation for natural transitions
 * @param {number} x - Input value between 0-1
 * @returns {number} Smoothed value
 */
export const smoothStep = (x) => {
  return x * x * (3 - 2 * x);
};

/**
 * Cubic ease-in-out interpolation for biological transitions
 * @param {number} x - Progress value (0-1)
 * @returns {number} Eased progress value
 */
export const easeInOutCubic = (x) => {
  return x ** 2 * 3 - x ** 3 * 2;
};


