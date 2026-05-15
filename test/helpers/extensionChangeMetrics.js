/**
 * Test helper utilities for comparing normalized tree-layout leaf positions.
 */

export function computeExtensionChangeMetrics(layoutFrom, layoutTo, options = {}) {
  if (!layoutFrom || !layoutTo) {
    return { averageChange: 0, compared: 0, totalWeightedChange: 0 };
  }

  const fromLeaves = safeLeaves(layoutFrom);
  const toLeaves = safeLeaves(layoutTo);

  if (!fromLeaves.length || !toLeaves.length) {
    return { averageChange: 0, compared: 0, totalWeightedChange: 0 };
  }

  const toMap = new Map();
  for (const leaf of toLeaves) {
    const key = leafKey(leaf);
    if (key == null) continue;
    if (!toMap.has(key)) toMap.set(key, leaf);
  }

  const maxRadius = Math.max(layoutFrom.max_radius || 1, layoutTo.max_radius || 1, 1);
  const radiusWeight = typeof options.radiusWeight === 'number' ? options.radiusWeight : 0.6;
  const angleWeight = typeof options.angleWeight === 'number' ? options.angleWeight : 0.4;

  let total = 0;
  let compared = 0;

  for (const fromLeaf of fromLeaves) {
    const key = leafKey(fromLeaf);
    if (key == null) continue;

    const toLeaf = toMap.get(key);
    if (!toLeaf) continue;

    const angleDelta = Math.abs(signedShortestAngle(fromLeaf.angle || 0, toLeaf.angle || 0));
    const angleNorm = angleDelta / Math.PI;
    const radiusDelta = Math.abs((toLeaf.radius || 0) - (fromLeaf.radius || 0));
    const radiusNorm = maxRadius > 0 ? radiusDelta / maxRadius : 0;

    total += radiusWeight * radiusNorm + angleWeight * angleNorm;
    compared += 1;
  }

  return {
    averageChange: compared > 0 ? total / compared : 0,
    compared,
    totalWeightedChange: total,
  };
}

export function classifyExtensionChanges(layoutFrom, layoutTo) {
  const fromLeaves = safeLeaves(layoutFrom);
  const toLeaves = safeLeaves(layoutTo);

  const fromMap = new Map();
  for (const leaf of fromLeaves) {
    const key = leafKey(leaf);
    if (key == null) continue;
    fromMap.set(key, leaf);
  }

  const toMap = new Map();
  for (const leaf of toLeaves) {
    const key = leafKey(leaf);
    if (key == null) continue;
    toMap.set(key, leaf);
  }

  const enter = [];
  const update = [];
  const exit = [];

  for (const [key, toLeaf] of toMap.entries()) {
    if (fromMap.has(key)) {
      update.push(toLeaf);
    } else {
      enter.push(toLeaf);
    }
  }

  for (const [key, fromLeaf] of fromMap.entries()) {
    if (!toMap.has(key)) exit.push(fromLeaf);
  }

  return { enter, update, exit };
}

function signedShortestAngle(from, to) {
  const tau = Math.PI * 2;
  let delta = (to - from) % tau;
  if (delta > Math.PI) delta -= tau;
  if (delta <= -Math.PI) delta += tau;
  return delta;
}

function safeLeaves(layout) {
  return Array.isArray(layout?.leaves) ? layout.leaves : [];
}

function leafKey(leaf) {
  if (!leaf || !Array.isArray(leaf.split_indices) || leaf.split_indices.length === 0) return null;
  return leaf.split_indices.slice().sort((a, b) => a - b).join(',');
}

if (typeof module !== 'undefined') {
  module.exports = Object.assign(module.exports || {}, {
    computeExtensionChangeMetrics,
    classifyExtensionChanges,
  });
}
