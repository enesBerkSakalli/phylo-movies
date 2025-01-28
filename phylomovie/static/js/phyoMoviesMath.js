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
