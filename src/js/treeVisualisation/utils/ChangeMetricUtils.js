// Utilities to compute change metrics between two tree layouts
// Provides: computeExtensionChangeMetrics(layoutFrom, layoutTo, options)
//           classifyExtensionChanges(layoutFrom, layoutTo)

function signedShortestAngle(from, to) {
  const TAU = Math.PI * 2;
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta <= -Math.PI) delta += TAU;
  return delta;
}

function safeLeaves(layout) {
  if (!layout || !layout.tree || typeof layout.tree.leaves !== 'function') return [];
  try { return layout.tree.leaves() || []; } catch (e) { return []; }
}

function leafKey(leaf) {
  if (!leaf || !leaf.data) return null;
  const d = leaf.data;
  if (Array.isArray(d.split_indices) && d.split_indices.length > 0) return String(d.split_indices[0]);
  if (d.name !== undefined && d.name !== null) return String(d.name);
  if (d.id !== undefined && d.id !== null) return String(d.id);
  return null;
}

export function computeExtensionChangeMetrics(layoutFrom, layoutTo, options = {}) {
  // Validate inputs
  if (!layoutFrom || !layoutTo) {
    return { averageChange: 0, compared: 0, totalWeightedChange: 0 };
  }

  const fromLeaves = safeLeaves(layoutFrom);
  const toLeaves = safeLeaves(layoutTo);

  if (!fromLeaves.length || !toLeaves.length) {
    return { averageChange: 0, compared: 0, totalWeightedChange: 0 };
  }

  const toMap = new Map();
  for (const l of toLeaves) {
    const k = leafKey(l);
    if (k == null) continue;
    if (!toMap.has(k)) toMap.set(k, l);
  }

  const maxRadius = Math.max(layoutFrom.max_radius || 1, layoutTo.max_radius || 1, 1);
  const radiusWeight = typeof options.radiusWeight === 'number' ? options.radiusWeight : 0.6;
  const angleWeight = typeof options.angleWeight === 'number' ? options.angleWeight : 0.4;

  let total = 0;
  let compared = 0;

  for (const f of fromLeaves) {
    const k = leafKey(f);
    if (k == null) continue;
    const t = toMap.get(k);
    if (!t) continue;

    const angleDelta = Math.abs(signedShortestAngle(f.angle || 0, t.angle || 0));
    const angleNorm = angleDelta / Math.PI; // normalize to [0,1] where PI is opposite
    const radiusDelta = Math.abs((t.radius || 0) - (f.radius || 0));
    const radiusNorm = maxRadius > 0 ? (radiusDelta / maxRadius) : 0;

    const weighted = radiusWeight * radiusNorm + angleWeight * angleNorm;
    total += weighted;
    compared += 1;
  }

  return {
    averageChange: compared > 0 ? total / compared : 0,
    compared,
    totalWeightedChange: total
  };
}

export function classifyExtensionChanges(layoutFrom, layoutTo) {
  const fromLeaves = safeLeaves(layoutFrom);
  const toLeaves = safeLeaves(layoutTo);

  const fromMap = new Map();
  for (const l of fromLeaves) {
    const k = leafKey(l);
    if (k == null) continue;
    fromMap.set(k, l);
  }

  const toMap = new Map();
  for (const l of toLeaves) {
    const k = leafKey(l);
    if (k == null) continue;
    toMap.set(k, l);
  }

  const enter = [];
  const update = [];
  const exit = [];

  // Entries and updates
  for (const [k, tLeaf] of toMap.entries()) {
    if (fromMap.has(k)) {
      update.push(tLeaf);
    } else {
      enter.push(tLeaf);
    }
  }

  // Exits
  for (const [k, fLeaf] of fromMap.entries()) {
    if (!toMap.has(k)) exit.push(fLeaf);
  }

  return { enter, update, exit };
}

// CommonJS export for tests that use require()
module.exports = Object.assign(module.exports || {}, {
  computeExtensionChangeMetrics,
  classifyExtensionChanges
});
