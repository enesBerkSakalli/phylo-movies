import { Bezier } from 'bezier-js';

/**
 * Calculate a "radial bundle point" that pulls the bundle OUTWARD from the tree center.
 * This prevents lines from crossing through the tree structure.
 * @param {Array<Array<number>>} points - Array of [x, y] points
 * @param {Array<number>} treeCenter - [x, y] center of the tree
 * @returns {Array<number>} [x, y, z] bundle point
 */
export function calculateRadialBundlePoint(points, treeCenter) {
  if (!points.length) return treeCenter;

  // 1. Calculate simple centroid
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  const centroid = [sum[0] / points.length, sum[1] / points.length];

  // 2. Calculate vector from tree center to centroid
  const dx = centroid[0] - treeCenter[0];
  const dy = centroid[1] - treeCenter[1];
  const angle = Math.atan2(dy, dx);

  // 3. Find the maximum radius in this group of points (relative to tree center)
  let maxRadius = 0;
  points.forEach(p => {
    const r = Math.sqrt(Math.pow(p[0] - treeCenter[0], 2) + Math.pow(p[1] - treeCenter[1], 2));
    if (r > maxRadius) maxRadius = r;
  });

  // 4. Project the bundle point OUTWARD beyond the leaves
  // Add a padding factor (e.g., 1.2x max radius)
  const bundleRadius = maxRadius * 1.35;

  return [
    treeCenter[0] + Math.cos(angle) * bundleRadius,
    treeCenter[1] + Math.sin(angle) * bundleRadius,
    0
  ];
}

/**
 * Build bundled Bezier path using radial bundle points.
 * @param {Array<number>} from - Start point [x, y]
 * @param {Array<number>} to - End point [x, y]
 * @param {Array<number>} srcBundlePoint - Source bundle control point
 * @param {Array<number>} dstBundlePoint - Destination bundle control point
 * @param {number} [samples=24] - Number of points in resulting path
 * @returns {Array<Array<number>>} Array of points along the curve
 */
export function buildBundledBezierPath(from, to, srcBundlePoint, dstBundlePoint, samples = 24) {
  if (!from || !to) return [];

  // Bundling strength
  const BUNDLING_STRENGTH = 0.85;

  const p0 = from;
  const p3 = to;

  // Standard "individual" control points (horizontal S-curve)
  const midX = (p0[0] + p3[0]) / 2;
  const offset = Math.max(Math.abs(p3[0] - p0[0]) * 0.15, 30);

  const cp1_indiv = [midX - offset, p0[1]];
  const cp2_indiv = [midX + offset, p3[1]];

  // "Bundle" control points (using the radial bundle points)
  // We pull the curve towards these outer points
  const cp1_bundle = [srcBundlePoint[0], srcBundlePoint[1]];
  const cp2_bundle = [dstBundlePoint[0], dstBundlePoint[1]];

  // Interpolate between individual and bundle control points
  const lerp = (a, b, t) => a + (b - a) * t;

  const p1 = [
    lerp(cp1_indiv[0], cp1_bundle[0], BUNDLING_STRENGTH),
    lerp(cp1_indiv[1], cp1_bundle[1], BUNDLING_STRENGTH)
  ];

  const p2 = [
    lerp(cp2_indiv[0], cp2_bundle[0], BUNDLING_STRENGTH),
    lerp(cp2_indiv[1], cp2_bundle[1], BUNDLING_STRENGTH)
  ];

  // Create cubic Bezier curve
  const curve = new Bezier(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const lut = curve.getLUT(samples);
  return lut.map(p => [p.x, p.y, 0]);
}
