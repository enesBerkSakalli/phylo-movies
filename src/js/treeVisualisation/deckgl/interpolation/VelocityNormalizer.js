/**
 * VelocityNormalizer - Ensures matched elements rotate at the same angular
 * speed during reorder animations.
 *
 * Normalisation is angle-only:
 *
 * 1. Angular: Elements with large angular displacements sweep faster than
 *    elements with small displacements. Normalise by global max |Δθ| so
 *    every element rotates at the same angular velocity.
 *
 * Radius is intentionally excluded from normalisation. Radial interpolation
 * stays on the base eased timeline so branch-length changes do not distort
 * angular phase alignment across the tree.
 */
import { shortestAngle, crossesAngle, longArcDelta } from '../../../domain/math/mathUtils.js';

/**
 * Compute the absolute angular displacement between two elements,
 * respecting root-crossing avoidance (same logic as PolarNodeInterpolator).
 *
 * @param {Object} fromNode - Source node ({ angle })
 * @param {Object} toNode   - Target node ({ angle })
 * @param {number} [rootAngle=0] - Root angle for crossing detection
 * @returns {number} Absolute angular displacement in radians (≥ 0)
 */
export function computeAngularDistance(fromNode, toNode, rootAngle = 0) {
  if (!fromNode || !toNode) return 0;

  const fromAngle = fromNode.angle || 0;
  const toAngle = toNode.angle || 0;

  const shortDelta = shortestAngle(fromAngle, toAngle);
  const shortEnd = fromAngle + shortDelta;
  const crosses = crossesAngle(fromAngle, shortEnd, rootAngle);
  const delta = crosses ? longArcDelta(shortDelta) : shortDelta;

  return Math.abs(delta);
}

/**
 * Compute per-element angular distances for a matched element set.
 *
 * @param {Map} fromMap   - Map<id, element> with .angle
 * @param {Map} toMap     - Map<id, element> with .angle
 * @param {number} [rootAngle=0]
 * @returns {Map<string, number>} elementId → absolute angular distance
 */
export function computeAngularDistances(fromMap, toMap, rootAngle = 0) {
  const distances = new Map();
  for (const [id, toElement] of toMap) {
    const fromElement = fromMap.get(id);
    if (!fromElement) continue;
    distances.set(id, computeAngularDistance(fromElement, toElement, rootAngle));
  }
  return distances;
}

/**
 * Build velocity maps for multiple element types using a single global
 * angular maximum across all types.
 *
 * @param {Object} angularDistanceMaps - { nodes: Map, labels: Map, links: Map, extensions: Map }
 * @param {number} t - Global eased time (0-1)
 * @returns {{ velocityMaps: Object, globalMaxAngle: number }}
 *   velocityMaps has the same keys, each a Map<id, { angularT }>.
 */
export function buildGlobalVelocityMaps(angularDistanceMaps, t) {
  const MIN_DIST = 1e-8;

  let globalMaxAngle = 0;
  for (const distances of Object.values(angularDistanceMaps)) {
    for (const dist of distances.values()) {
      if (dist > globalMaxAngle) globalMaxAngle = dist;
    }
  }

  const velocityMaps = {};
  const types = Object.keys(angularDistanceMaps);

  for (const type of types) {
    const angularDists = angularDistanceMaps[type] || new Map();
    const velocityMap = new Map();

    for (const id of angularDists.keys()) {
      const aDist = angularDists.get(id) ?? 0;

      const angularT = (aDist < MIN_DIST || globalMaxAngle < MIN_DIST)
        ? t
        : Math.min(1, t * globalMaxAngle / aDist);

      velocityMap.set(id, { angularT });
    }

    velocityMaps[type] = velocityMap;
  }

  return { velocityMaps, globalMaxAngle };
}

/**
 * Build a velocity map for a single element type (backward-compatible).
 * @deprecated Prefer buildGlobalVelocityMaps for cross-type consistency.
 */
export function buildVelocityMap(fromMap, toMap, t, rootAngle = 0) {
  const angularDists = computeAngularDistances(fromMap, toMap, rootAngle);
  const { velocityMaps, globalMaxAngle } = buildGlobalVelocityMaps({ _: angularDists }, t);
  return { velocityMap: velocityMaps._, maxAngle: globalMaxAngle };
}
