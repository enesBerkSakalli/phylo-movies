import { kar2pol, shortestAngle } from "../utils/MathUtils.js";
import * as d3 from "d3";

/**
 * Creates a function that interpolates between two sets of polar coordinates.
 * This helper reduces code duplication across animation functions.
 * @param {number} oldAngle - The starting angle in radians.
 * @param {number} oldRadius - The starting radius.
 * @param {number} newAngle - The ending angle in radians.
 * @param {number} newRadius - The ending radius.
 * @returns {function(t: number): {angle: number, radius: number}} An interpolator function
 */
function createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius) {
  const angleDiff = shortestAngle(oldAngle, newAngle);
  const radiusDiff = newRadius - oldRadius;

  return function(t) {
    return {
      angle: oldAngle + angleDiff * t,
      radius: oldRadius + radiusDiff * t,
    };
  };
}

/**
 * Returns an interpolator for animating circle X position, with explicit interpolation value t.
 * @param {number} t - Interpolation value [0,1].
 * @returns {function} D3 attrTween interpolator.
 */
export function attrTweenCircleXWithT(t) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const newAngle = d.angle;
    const newRadius = d.radius;

    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius);
    const { angle: tweenAngle, radius: tweenRadius } = polarInterpolator(t);

    return function() {
      return tweenRadius * Math.cos(tweenAngle);
    };
  };
}

/**
 * Generates the SVG path string for a branch (radial layout).
 * @param {Object} d - The link data.
 * @returns {string} SVG path string.
 */
export function buildSvgString(d) {
  // Defensive checks to prevent errors with malformed link data
  if (!d || !d.source || !d.target) {
    console.error("[buildSvgString] Invalid link data:", d);
    throw new Error("Invalid link data: missing source or target");
  }

  if (d.source === d.target) {
    console.error("[buildSvgString] Self-referencing link:", d);
    throw new Error("Invalid link data: source equals target");
  }

  // Check for required properties
  const requiredProps = ['x', 'y', 'angle', 'radius'];
  for (const prop of requiredProps) {
    if (typeof d.source[prop] === 'undefined' || typeof d.target[prop] === 'undefined') {
      console.error(`[buildSvgString] Missing property ${prop}:`, d);
      throw new Error(`Invalid link data: missing ${prop} property`);
    }
  }

  const mx = d.source.x;
  const my = d.source.y;
  const lx = d.target.x;
  const ly = d.target.y;
  const curveX = d.source.radius * Math.cos(d.target.angle);
  const curveY = d.source.radius * Math.sin(d.target.angle);
  const arcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;
  const sweepFlag = Math.abs(d.source.angle) < Math.abs(d.target.angle) ? 1 : 0;
  return `M ${mx}, ${my} A${d.source.radius}, ${d.source.radius} 0 ${arcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
}

/**
 * Generates the SVG path string for a branch with interpolation (radial layout).
 * @param {Object} d - The link data.
 * @param {number} t - Interpolation parameter [0,1].
 * @param {number} prevSourceAngle - Previous source angle (optional).
 * @param {number} prevSourceRadius - Previous source radius (optional).
 * @param {number} prevTargetAngle - Previous target angle (optional).
 * @param {number} prevTargetRadius - Previous target radius (optional).
 * @returns {string} SVG path string.
 */
export function buildSvgStringTime(d, t, prevSourceAngle, prevSourceRadius, prevTargetAngle, prevTargetRadius) {
  // Defensive checks to prevent errors with malformed link data
  if (!d || !d.source || !d.target) {
    console.error("[buildSvgStringTime] Invalid link data:", d);
    throw new Error("Invalid link data: missing source or target");
  }

  if (d.source === d.target) {
    console.error("[buildSvgStringTime] Self-referencing link:", d);
    throw new Error("Invalid link data: source equals target");
  }
  
  // Use provided previous positions or default to current positions
  let old_startRadius = prevSourceRadius !== undefined ? prevSourceRadius : d.source.radius;
  let old_startAngle = prevSourceAngle !== undefined ? prevSourceAngle : d.source.angle;
  let old_endRadius = prevTargetRadius !== undefined ? prevTargetRadius : d.target.radius;
  let old_endAngle = prevTargetAngle !== undefined ? prevTargetAngle : d.target.angle;
  let new_startAngle = d.source.angle;
  let new_endAngle = d.target.angle;
  let new_startRadius = d.source.radius;
  let new_endRadius = d.target.radius;
  let startDiff = shortestAngle(old_startAngle, new_startAngle);
  let endDiff = shortestAngle(old_endAngle, new_endAngle);
  let tween_startAngle = startDiff * t + old_startAngle;
  let tween_endAngle = endDiff * t + old_endAngle;
  let tween_startRadius =
    (new_startRadius - old_startRadius) * t + old_startRadius;
  let tween_endRadius = (new_endRadius - old_endRadius) * t + old_endRadius;
  let rx = tween_startRadius;
  let ry = tween_startRadius;
  let mx = tween_startRadius * Math.cos(tween_startAngle);
  let my = tween_startRadius * Math.sin(tween_startAngle);
  let curveX = tween_startRadius * Math.cos(tween_endAngle);
  let curveY = tween_startRadius * Math.sin(tween_endAngle);
  let lx = tween_endRadius * Math.cos(tween_endAngle);
  let ly = tween_endRadius * Math.sin(tween_endAngle);
  let angleDiff = shortestAngle(tween_startAngle, tween_endAngle);
  let sweepFlag = angleDiff >= 0 ? 1 : 0;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
  const xAxisRotation = 0;
  return `M ${mx}, ${my} A${rx}, ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
}



/**
 * Generates the static SVG path for the branch extension (radial layout).
 * @param {Object} d - The leaf node data.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {string} SVG path string.
 */
export function buildSvgLinkExtension(d, currentMaxRadius) {
  const mx = d.x;
  const my = d.y;
  const lxmax = currentMaxRadius * Math.cos(d.angle);
  const lymax = currentMaxRadius * Math.sin(d.angle);
  return `M ${mx}, ${my} L ${lxmax}, ${lymax}`;
}

/**
 * Returns the transform string for orienting text labels.
 * @param {Object} d - The node data.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {string} SVG transform string.
 */
export function orientText(d, currentMaxRadius) {
  const angle = (d.angle * 180) / Math.PI;
  return `rotate(${angle}) translate(${currentMaxRadius}, 0) rotate(${
    angle < 270 && angle > 90 ? 180 : 0
  })`;
}

/**
 * Returns an interpolator for animating text orientation.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {function} D3 attrTween interpolator.
 */
export function getOrientTextInterpolator(currentMaxRadius) {
  return function (d) {
    // previous svg instance
    let prev_d = d3.select(this).attr("transform");

    let re =
      /rotate\((?<angle>.+)\) translate\((?<oldMaxRadius>.+), 0\) rotate\((?<otherangle>.+)\)/;

    let match = re.exec(prev_d);

    let old_angle = parseFloat(match.groups.angle);
    let old_otherAngle = parseFloat(match.groups.otherangle);

    let old_MaxRadius = parseFloat(match.groups.oldMaxRadius);

    const new_angle = (d.angle * 180) / Math.PI;

    const new_otherAngle = new_angle < 270 && new_angle > 90 ? 180 : 0;

    const angleDiff =
      (360 *
        shortestAngle(
          (Math.PI * 2 * old_angle) / 360,
          (Math.PI * 2 * new_angle) / 360
        )) /
      (2 * Math.PI);

    const otherAngleDiff = shortestAngle(old_otherAngle, new_otherAngle);

    const radiusDiff = currentMaxRadius - old_MaxRadius;

    return function (t) {
      const tweenAngle = angleDiff * t + old_angle;
      const tweenRadius = radiusDiff * t + old_MaxRadius;
      const tweenOtherAngle = otherAngleDiff * t + old_otherAngle;

      if (angleDiff > 2 || angleDiff < -2) {
        return `rotate(${tweenAngle}) translate(${tweenRadius}, 0) rotate(${tweenOtherAngle})`;
      } else {
        return `rotate(${tweenAngle}) translate(${tweenRadius}, 0) rotate(${tweenOtherAngle})`;
      }
    };
  };
}

/**
 * Calculates the text anchor ("start" or "end") based on angle.
 * @param {Object} d - The node data.
 * @returns {string} "start" or "end".
 */
export function calculateTextAnchor(d) {
  const angle = (d.angle * 180) / Math.PI;
  return angle < 270 && angle > 90 ? "end" : "start";
}

/**
 * @deprecated Use calculateTextAnchor instead
 */
export const anchorCalc = calculateTextAnchor;

/**
 * Returns an interpolator for animating link extension paths.
 * @param {number} extensionEndRadius - The end radius for the extension.
 * @returns {function} D3 attrTween interpolator.
 */
export function getLinkExtensionInterpolator(extensionEndRadius) {
  return function (d) {
    // Use stored previous positions if available, otherwise fall back to current positions
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    
    // Calculate old positions from polar coordinates
    const oldX1 = oldRadius * Math.cos(oldAngle);
    const oldY1 = oldRadius * Math.sin(oldAngle);
    const oldX2 = extensionEndRadius * Math.cos(oldAngle);
    const oldY2 = extensionEndRadius * Math.sin(oldAngle);

    // Calculate new positions
    const newX1 = d.radius * Math.cos(d.angle);
    const newY1 = d.radius * Math.sin(d.angle);
    const newX2 = extensionEndRadius * Math.cos(d.angle);
    const newY2 = extensionEndRadius * Math.sin(d.angle);

    const interpolateX1 = d3.interpolateNumber(oldX1, newX1);
    const interpolateY1 = d3.interpolateNumber(oldY1, newY1);
    const interpolateX2 = d3.interpolateNumber(oldX2, newX2);
    const interpolateY2 = d3.interpolateNumber(oldY2, newY2);

    return function (t) {
      return `M ${interpolateX1(t)}, ${interpolateY1(t)} L ${interpolateX2(t)}, ${interpolateY2(t)}`;
    };
  };
}

/**
 * Returns an interpolator for animating circle X position.
 * @returns {function} D3 attrTween interpolator.
 */
export function attrTweenCircleX() {
  return function (d) {
    // Use stored previous positions if available, otherwise fall back to current positions
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const newAngle = d.angle;
    const newRadius = d.radius;

    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius);

    return function (t) {
      const { angle: tweenAngle, radius: tweenRadius } = polarInterpolator(t);
      return tweenRadius * Math.cos(tweenAngle);
    };
  };
}

/**
 * Returns an interpolator for animating circle Y position, with explicit interpolation value t.
 * @param {number} t - Interpolation value [0,1].
 * @returns {function} D3 attrTween interpolator.
 */
export function attrTweenCircleYWithT(t) {
  return function (d) {
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const newAngle = d.angle;
    const newRadius = d.radius;

    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius);
    const { angle: tweenAngle, radius: tweenRadius } = polarInterpolator(t);

    return function() {
      return tweenRadius * Math.sin(tweenAngle);
    };
  };
}
/**
 * Returns an interpolator for animating circle Y position.
 * @returns {function} D3 attrTween interpolator.
 */
export function attrTweenCircleY() {
  return function (d) {
    // Use stored previous positions if available, otherwise fall back to current positions
    const oldAngle = d.prevAngle !== undefined ? d.prevAngle : d.angle;
    const oldRadius = d.prevRadius !== undefined ? d.prevRadius : d.radius;
    const newAngle = d.angle;
    const newRadius = d.radius;

    const polarInterpolator = createPolarInterpolator(oldAngle, oldRadius, newAngle, newRadius);

    return function (t) {
      const { angle: tweenAngle, radius: tweenRadius } = polarInterpolator(t);
      return tweenRadius * Math.sin(tweenAngle);
    };
  };
}
