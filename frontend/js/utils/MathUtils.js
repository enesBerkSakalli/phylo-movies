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


export default function calculateScales(treeList) {
  let scaleList = [];
  for (let i = 0; i < treeList.length; i += 5) {
    const scale = _calculateScale(treeList[i]);
    scaleList.push({ value: scale, index: i / 5 });
  }
  return scaleList;
}

function _calculateScale(node) {
  let maxRadius = 0;
  if (node.children) {
    node.children.forEach((child) => {
      let child_scale = _calculateScale(child);

      if (maxRadius < child_scale) {
        maxRadius = child_scale;
      }
    });
  }
  maxRadius = maxRadius + (parseFloat(node.length) || 0);
  return maxRadius;
}
