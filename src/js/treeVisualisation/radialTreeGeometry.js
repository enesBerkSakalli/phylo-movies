// geometry/polarLinks.js
import * as d3 from "d3";
import { kar2pol, shortestAngle as signedShortestAngleExt } from "../utils/MathUtils.js";

/* ---------------------------------- Helpers ---------------------------------- */

/**
 * Normalize an angle to [0, 2π)
 */
export function normalizeAngle(a) {
  const TAU = Math.PI * 2;
  return ((a % TAU) + TAU) % TAU;
}

/**
 * Signed shortest angle from "from" to "to" in (-π, π]
 * (If you already have a correct version in MathUtils, keep that and delete this.)
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
 */
export function polarToCartesian(radius, angle, center = { x: 0, y: 0, z: 0 }) {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
    z: center.z || 0
  };
}

/**
 * Interpolates node position in polar coords.
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
 */
export function interpolateAngle(from, to, t) {
  let delta = to - from;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return from + delta * t;
}

/**
 * Creates a polar interpolator for angle & radius.
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

/* -------------------------- Core branch calc logic --------------------------- */

/**
 * Calculates coordinate data for a (static) branch in a radial layout.
 * Produces: move (M), arc (A), line (L) - or just move (M), line (L) for straight branches.
 *
 * @param {Object} d                         Link data with .source/.target (each has angle, radius, x, y)
 * @param {{x:number,y:number,z:number}} center  Optional arc center (default origin)
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
 * Builds SVG path string for static branch.
 */
export function buildSvgString(d, center = { x: 0, y: 0, z: 0 }) {
  const { movePoint, arcEndPoint, lineEndPoint, arcProperties } =
    calculateBranchCoordinates(d, center);

  // For straight lines (no arc), just use Move + Line
  if (arcProperties === null) {
    return `M ${movePoint.x}, ${movePoint.y} L ${lineEndPoint.x}, ${lineEndPoint.y}`;
  }

  const { radius, largeArcFlag, sweepFlag } = arcProperties;
  const xAxisRotation = 0;

  return `M ${movePoint.x}, ${movePoint.y} A ${radius}, ${radius} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${arcEndPoint.x}, ${arcEndPoint.y} L ${lineEndPoint.x}, ${lineEndPoint.y}`;
}

/**
 * Calculates coordinate data for an interpolated branch (for animations).
 *
 * @param {Object} d
 * @param {number} t
 * @param {number} prevSourceAngle
 * @param {number} prevSourceRadius
 * @param {number} prevTargetAngle
 * @param {number} prevTargetRadius
 * @param {{x:number,y:number,z:number}} center
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

/**
 * SVG path for interpolated branch.
 */
export function buildInterpolatedBranchPath(
  d,
  t,
  prevSourceAngle,
  prevSourceRadius,
  prevTargetAngle,
  prevTargetRadius,
  center = { x: 0, y: 0, z: 0 }
) {
  const { movePoint, arcEndPoint, lineEndPoint, arcProperties } =
    calculateInterpolatedBranchCoordinates(
      d,
      t,
      prevSourceAngle,
      prevSourceRadius,
      prevTargetAngle,
      prevTargetRadius,
      center
    );

  // For straight lines (no arc), just use Move + Line
  if (arcProperties === null) {
    return `M ${movePoint.x}, ${movePoint.y} L ${lineEndPoint.x}, ${lineEndPoint.y}`;
  }

  const { radius, largeArcFlag, sweepFlag } = arcProperties;
  const xAxisRotation = 0;

  return `M ${movePoint.x}, ${movePoint.y} A ${radius}, ${radius} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${arcEndPoint.x}, ${arcEndPoint.y} L ${lineEndPoint.x}, ${lineEndPoint.y}`;
}

/* --------------------------- Extensions & labels ----------------------------- */

export function buildSvgLinkExtension(d, currentMaxRadius) {
  const mx = d.x;
  const my = d.y;
  const lxmax = currentMaxRadius * Math.cos(d.angle);
  const lymax = currentMaxRadius * Math.sin(d.angle);
  return `M ${mx}, ${my} L ${lxmax}, ${lymax}`;
}

export function orientText(d, currentMaxRadius) {
  const angleDeg = (d.angle * 180) / Math.PI;
  return `rotate(${angleDeg}) translate(${currentMaxRadius}, 0) rotate(${
    angleDeg < 270 && angleDeg > 90 ? 180 : 0
  })`;
}

export function getOrientTextInterpolator(newMaxRadius, oldMaxRadius) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const angleInterpolator = createPolarInterpolator(
      oldAngle,
      oldMaxRadius,
      d.angle,
      newMaxRadius
    );

    const finalFlip = d.angle < (3 * Math.PI) / 2 && d.angle > Math.PI / 2 ? 180 : 0;

    return function (t) {
      const { angle: tweenAngle, radius: tweenRadius } = angleInterpolator(t);
      const tweenDeg = (tweenAngle * 180) / Math.PI;
      return `rotate(${tweenDeg}) translate(${tweenRadius}, 0) rotate(${finalFlip})`;
    };
  };
}

export function calculateTextAnchor(d) {
  const angleDeg = (d.angle * 180) / Math.PI;
  return angleDeg < 270 && angleDeg > 90 ? "end" : "start";
}

export const anchorCalc = calculateTextAnchor;

/* ------------------------------ D3 attrTweens ------------------------------- */

export function getLinkExtensionInterpolator(extensionEndRadius) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;

    const oldX1 = oldRadius * Math.cos(oldAngle);
    const oldY1 = oldRadius * Math.sin(oldAngle);
    const oldX2 = extensionEndRadius * Math.cos(oldAngle);
    const oldY2 = extensionEndRadius * Math.sin(oldAngle);

    const newX1 = d.radius * Math.cos(d.angle);
    const newY1 = d.radius * Math.sin(d.angle);
    const newX2 = extensionEndRadius * Math.cos(d.angle);
    const newY2 = extensionEndRadius * Math.sin(d.angle);

    const ix1 = d3.interpolateNumber(oldX1, newX1);
    const iy1 = d3.interpolateNumber(oldY1, newY1);
    const ix2 = d3.interpolateNumber(oldX2, newX2);
    const iy2 = d3.interpolateNumber(oldY2, newY2);

    return function (t) {
      return `M ${ix1(t)}, ${iy1(t)} L ${ix2(t)}, ${iy2(t)}`;
    };
  };
}

export function attrTweenCircleX() {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, d.angle, d.radius);

    return function (t) {
      const { angle, radius } = polarInterpolator(t);
      return radius * Math.cos(angle);
    };
  };
}

export function attrTweenCircleY() {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, d.angle, d.radius);

    return function (t) {
      const { angle, radius } = polarInterpolator(t);
      return radius * Math.sin(angle);
    };
  };
}

export function attrTweenCircleXWithT(t) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, d.angle, d.radius);
    const { angle, radius } = polarInterpolator(t);

    return function () {
      return radius * Math.cos(angle);
    };
  };
}

export function attrTweenCircleYWithT(t) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, d.angle, d.radius);
    const { angle, radius } = polarInterpolator(t);

    return function () {
      return radius * Math.sin(angle);
    };
  };
}

/* --------------------------------- Utils ----------------------------------- */

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
