// geometry/radialTreeGeometry.js - Handles radial tree branch calculation and interpolation
import * as d3 from "d3";
import { kar2pol, shortestAngle as signedShortestAngleExt } from "../../utils/MathUtils.js";

/* ─────────────────────────── ANGLE & COORDINATE HELPERS ─────────────────────────── */

/**
 * Normalize an angle to [0, 2π)
 * @param {number} a - Angle in radians
 * @returns {number} Normalized angle
 */
export function normalizeAngle(a) {
  const TAU = Math.PI * 2;
  return ((a % TAU) + TAU) % TAU;
}

/**
 * Signed shortest angle from "from" to "to" in (-π, π]
 * @param {number} from - Source angle in radians
 * @param {number} to - Target angle in radians
 * @returns {number} Signed shortest angle between angles
 */
export function signedShortestAngle(from, to) {
  const TAU = Math.PI * 2;
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta <= -Math.PI) delta += TAU;
  return delta;
}

/**
 * Polar → Cartesian (optionally offset by a center)
 * @param {number} radius - Radius value
 * @param {number} angle - Angle in radians
 * @param {Object} center - Center point {x,y,z}
 * @returns {Object} Cartesian coordinates {x,y,z}
 */
export function polarToCartesian(radius, angle, center = { x: 0, y: 0, z: 0 }) {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
    z: center.z || 0
  };
}

/* ─────────────────────────── INTERPOLATION ─────────────────────────── */

/**
 * Interpolates node position in polar coords.
 * @param {Object} fromNode - Source node with angle and radius
 * @param {Object} toNode - Target node with angle and radius
 * @param {number} t - Interpolation factor (0-1)
 * @returns {Object} Interpolated position {x,y}
 */
export function interpolatePolarPosition(fromNode, toNode, t) {
  const interpAngle = interpolateAngle(fromNode.angle, toNode.angle, t);
  const interpRadius = fromNode.radius + (toNode.radius - fromNode.radius) * t;
  return {
    x: interpRadius * Math.cos(interpAngle),
    y: interpRadius * Math.sin(interpAngle)
  };
}

/**
 * Interpolates between two angles with wrap-around handling.
 * @param {number} from - Source angle in radians
 * @param {number} to - Target angle in radians
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated angle
 */
export function interpolateAngle(from, to, t) {
  let delta = to - from;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return from + delta * t;
}

/**
 * Creates a polar interpolator for angle & radius.
 * @param {number} oldAngle - Starting angle
 * @param {number} oldRadius - Starting radius
 * @param {number} newAngle - Target angle
 * @param {number} newRadius - Target radius
 * @returns {Function} Interpolator function that accepts t (0-1)
 */
export function createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius) {
  const angleDiff = signedShortestAngleExt ? signedShortestAngleExt(oldAngle, newAngle)
                                           : signedShortestAngle(oldAngle, newAngle);
  const radiusDiff = newRadius - oldRadius;

  return function (t) {
    return {
      angle: oldAngle + angleDiff * t,
      radius: oldRadius + radiusDiff * t
    };
  };
}

/* ─────────────────────────── BRANCH CALCULATION ─────────────────────────── */

/**
 * Calculates coordinate data for a (static) branch in a radial layout.
 * Produces: move (M), arc (A), line (L) - or just move (M), line (L) for straight branches.
 *
 * @param {Object} d - Link data with .source/.target (each has angle, radius, x, y)
 * @param {{x:number,y:number,z:number}} center - Optional arc center (default origin)
 * @returns {Object} {movePoint, arcEndPoint, lineEndPoint, arcProperties}
 */
export function calculateBranchCoordinates(d, center = { x: 0, y: 0, z: 0 }) {
  validateLink(d, "[calculateBranchCoordinates]");

  const source = d.source;
  const target = d.target;

  // 1) Move point = source cartesian
  const movePoint = { x: source.x, y: source.y, z: 0 };

  // 3) Line end point = target cartesian
  const lineEndPoint = { x: target.x, y: target.y, z: 0 };

  // Check if this should be a straight line (same angle or negligible angle difference)
  const angleTolerance = 0.001; // ~0.06 degrees
  const angleDiff = Math.abs(signedShortestAngle(source.angle, target.angle));

  if (angleDiff < angleTolerance) {
    // Straight line: no arc needed
    return {
      movePoint,
      arcEndPoint: null,
      lineEndPoint,
      arcProperties: null
    };
  }

  // 2) Arc end point: same radius as source, but at target angle
  const arcEndPoint = polarToCartesian(source.radius, target.angle, center);

  // Signed angle diff (direction matters for sweep)
  const diff = signedShortestAngle(source.angle, target.angle);

  // SVG flags per spec
  const largeArcFlag = Math.abs(diff) > Math.PI ? 1 : 0;
  const sweepFlag = diff >= 0 ? 1 : 0;

  return {
    movePoint,
    arcEndPoint,
    lineEndPoint,
    arcProperties: {
      radius: source.radius,
      startAngle: source.angle,
      endAngle: target.angle,
      angleDiff: diff, // signed
      largeArcFlag,
      sweepFlag,
      center
    }
  };
}

/**
 * Calculates coordinate data for an interpolated branch (for animations).
 *
 * @param {Object} d - Link data
 * @param {number} t - Interpolation factor (0-1)
 * @param {number} prevSourceAngle - Previous source angle
 * @param {number} prevSourceRadius - Previous source radius
 * @param {number} prevTargetAngle - Previous target angle
 * @param {number} prevTargetRadius - Previous target radius
 * @param {{x:number,y:number,z:number}} center - Center point for coordinates
 * @returns {Object} Coordinate data for interpolated branch
 */
export function calculateInterpolatedBranchCoordinates(
  d,
  t,
  prevSourceAngle,
  prevSourceRadius,
  prevTargetAngle,
  prevTargetRadius,
  center = { x: 0, y: 0, z: 0 }
) {
  validateLink(d, "[calculateInterpolatedBranchCoordinates]");

  // Prev values fallback to current
  const pSA = prevSourceAngle !== undefined ? prevSourceAngle : d.source.angle;
  const pSR = prevSourceRadius !== undefined ? prevSourceRadius : d.source.radius;
  const pTA = prevTargetAngle !== undefined ? prevTargetAngle : d.target.angle;
  const pTR = prevTargetRadius !== undefined ? prevTargetRadius : d.target.radius;

  // Next values
  const nSA = d.source.angle;
  const nSR = d.source.radius;
  const nTA = d.target.angle;
  const nTR = d.target.radius;

  const sourceInterpolator = createPolarInterpolator(pSA, pSR, nSA, nSR);
  const targetInterpolator = createPolarInterpolator(pTA, pTR, nTA, nTR);

  const { angle: sAngle, radius: sRadius } = sourceInterpolator(t);
  const { angle: tAngle, radius: tRadius } = targetInterpolator(t);

  // Points
  const movePoint = polarToCartesian(sRadius, sAngle, center);
  const lineEndPoint = polarToCartesian(tRadius, tAngle, center);

  // Check if this should be a straight line (same angle or negligible angle difference)
  const angleTolerance = 0.001; // ~0.06 degrees
  const angleDiff = Math.abs(signedShortestAngle(sAngle, tAngle));

  if (angleDiff < angleTolerance) {
    // Straight line: no arc needed
    return {
      movePoint,
      arcEndPoint: null,
      lineEndPoint,
      arcProperties: null
    };
  }

  const arcEndPoint = polarToCartesian(sRadius, tAngle, center);

  // Signed diff
  const diff = signedShortestAngle(sAngle, tAngle);
  const largeArcFlag = Math.abs(diff) > Math.PI ? 1 : 0;
  const sweepFlag = diff >= 0 ? 1 : 0;

  return {
    movePoint,
    arcEndPoint,
    lineEndPoint,
    arcProperties: {
      radius: sRadius,
      startAngle: sAngle,
      endAngle: tAngle,
      angleDiff: diff,
      largeArcFlag,
      sweepFlag,
      center
    }
  };
}

/* ─────────────────────────── SVG PATH GENERATION ─────────────────────────── */

/**
 * Builds SVG path string for static branch.
 * @param {Object} d - Link data
 * @param {Object} center - Center point {x,y,z}
 * @returns {string} SVG path string
 */
// removed: buildSvgString

/**
 * SVG path for interpolated branch.
 * @param {Object} d - Link data
 * @param {number} t - Interpolation factor (0-1)
 * @param {number} prevSourceAngle - Previous source angle
 * @param {number} prevSourceRadius - Previous source radius
 * @param {number} prevTargetAngle - Previous target angle
 * @param {number} prevTargetRadius - Previous target radius
 * @param {Object} center - Center point {x,y,z}
 * @returns {string} SVG path string for interpolated branch
 */

/* ─────────────────────────── LINK ANALYSIS ─────────────────────────── */

/**
 * Calculates the total length of a path from coordinate data.
 * @param {Object} coordinates - Coordinate data with movePoint, arcEndPoint, lineEndPoint, arcProperties
 * @returns {number} Total path length
 */
export function calculatePathLengthFromCoordinates(coordinates) {
  if (!coordinates || !coordinates.movePoint) return 0;

  const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;
  let length = 0;

  if (arcProperties && arcProperties.radius && arcProperties.angleDiff) {
    length += Math.abs(arcProperties.angleDiff) * arcProperties.radius;

    if (lineEndPoint && arcEndPoint) {
      const dx = lineEndPoint.x - arcEndPoint.x;
      const dy = lineEndPoint.y - arcEndPoint.y;
      const dz = (lineEndPoint.z || 0) - (arcEndPoint.z || 0);
      length += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  } else if (lineEndPoint) {
    const dx = lineEndPoint.x - movePoint.x;
    const dy = lineEndPoint.y - movePoint.y;
    const dz = (lineEndPoint.z || 0) - (movePoint.z || 0);
    length += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return length;
}

/**
 * Calculates the length of a link, caching the result for performance.
 * @param {Object} link - Link object with source and target
 * @returns {number} Link length
 */
export function calculateLinkLength(link) {
  if (!link.__coords) {
    link.__coords = calculateBranchCoordinates(link);
    link.__length = calculatePathLengthFromCoordinates(link.__coords);
  }
  return link.__length;
}



/* ─────────────────────────── PRIVATE UTILS ─────────────────────────── */

/**
 * Validates link data structure
 * @param {Object} d - Link data
 * @param {string} where - Context for error message
 * @throws {Error} If link data is invalid
 * @private
 */
function validateLink(d, where) {
  if (!d || !d.source || !d.target) {
    console.error(`${where} Invalid link data:`, d);
    throw new Error("Invalid link data: missing source or target");
  }
  if (d.source === d.target) {
    console.error(`${where} Self-referencing link:`, d);
    throw new Error("Invalid link data: source equals target");
  }
  const requiredProps = ["x", "y", "angle", "radius"];
  for (const prop of requiredProps) {
    if (typeof d.source[prop] === "undefined" || typeof d.target[prop] === "undefined") {
      console.error(`${where} Missing property ${prop}:`, d);
      throw new Error(`Invalid link data: missing ${prop} property`);
    }
  }
}
