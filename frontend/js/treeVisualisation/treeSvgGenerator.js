import { kar2pol, shortestAngle } from "./phyoMoviesMath.js";

/**
 * Generates the SVG path string for a branch (radial layout).
 * @param {Object} d - The link data.
 * @returns {string} SVG path string.
 */
export function buildSvgString(d) {
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
 * @param {Array} pathArray - Previous path as array of points.
 * @returns {string} SVG path string.
 */
export function buildSvgStringTime(d, t, pathArray) {
  let old_startRadius = 0;
  let old_startAngle = 0;
  let old_endRadius = 0;
  let old_endAngle = 0;
  if (!!pathArray) {
    let old_start = kar2pol(pathArray[0].x, pathArray[0].y);
    old_startRadius = old_start.r;
    old_startAngle = old_start.angle;
    let last = pathArray[pathArray.length - 1];
    let old_end = kar2pol(last.x, last.y);
    old_endRadius = old_end.r;
    old_endAngle = old_end.angle;
  }
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
  let sweepFlag = 0;
  if (shortestAngle(tween_startAngle, tween_endAngle) > 0) {
    sweepFlag = 1;
  }
  const largeArcFlag = 0;
  const xAxisRotation = 0;
  return `M ${mx}, ${my} A${rx}, ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
}

/**
 * Generates the SVG path string for a branch extension with interpolation (radial layout).
 * @param {Object} d - The leaf node data.
 * @param {number} t - Interpolation parameter [0,1].
 * @param {Array} pathArray - Previous path as array of points.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {string} SVG path string.
 */
export function buildLinkExtensionTime(d, t, pathArray, currentMaxRadius) {
  let old_startRadius = 0;
  let old_startAngle = 0;
  let old_endRadius = 0;
  let old_endAngle = 0;
  if (!!pathArray) {
    let old_start = kar2pol(pathArray[0].x, pathArray[0].y);
    old_startRadius = old_start.r;
    old_startAngle = old_start.angle;
    let last = pathArray[pathArray.length - 1];
    let old_end = kar2pol(last.x, last.y);
    old_endRadius = old_end.r;
    old_endAngle = old_end.angle;
  }
  let new_startAngle = d.angle;
  let new_endAngle = d.angle;
  let new_startRadius = d.radius;
  let new_endRadius = currentMaxRadius;
  let startDiff = shortestAngle(old_startAngle, new_startAngle);
  let endDiff = shortestAngle(old_endAngle, new_endAngle);
  let tween_startAngle = startDiff * t + old_startAngle;
  let tween_endAngle = endDiff * t + old_endAngle;
  let tween_startRadius =
    (new_startRadius - old_startRadius) * t + old_startRadius;
  let tween_endRadius = (new_endRadius - old_endRadius) * t + old_endRadius;
  let mx = tween_startRadius * Math.cos(tween_startAngle);
  let my = tween_startRadius * Math.sin(tween_startAngle);
  let lx = tween_endRadius * Math.cos(tween_endAngle);
  let ly = tween_endRadius * Math.sin(tween_endAngle);
  return `M ${mx}, ${my} L ${lx}, ${ly}`;
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
  return function (d, i) {
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
export function anchorCalc(d) {
  const angle = (d.angle * 180) / Math.PI;
  return angle < 270 && angle > 90 ? "end" : "start";
}

/**
 * Returns an interpolator for animating circle X position.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {function} D3 attrTween interpolator.
 */
export function attr2TweenCircleX(currentMaxRadius) {
  let self = this;

  return function (d) {
    let cx = d3.select(this).attr("cx");
    let cy = d3.select(this).attr("cy");

    let polarCoordinates = kar2pol(cx, cy);
    const newAngle = d.angle;
    const oldAngle = polarCoordinates.angle;
    const diff = shortestAngle(oldAngle, newAngle);

    return function (t) {
      const tweenAngle = diff * t + oldAngle;
      return (currentMaxRadius - 30) * Math.cos(tweenAngle);
    };
  };
}

/**
 * Returns an interpolator for animating circle Y position.
 * @param {number} currentMaxRadius - The current maximum radius.
 * @returns {function} D3 attrTween interpolator.
 */
export function attr2TweenCircleY(currentMaxRadius) {
  return function (d) {
    let cx = d3.select(this).attr("cx");
    let cy = d3.select(this).attr("cy");

    let polarCoordinates = kar2pol(cx, cy);

    let newAngle = d.angle;
    let oldAngle = polarCoordinates.angle;
    let diff = shortestAngle(oldAngle, newAngle);

    return function (t) {
      const tween_startAngle = diff * t + oldAngle;
      return (currentMaxRadius - 30) * Math.sin(tween_startAngle);
    };
  };
}