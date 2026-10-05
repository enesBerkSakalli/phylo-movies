/**
 * ConnectorGeometryBuilder - Generates Bezier curve paths for tree connectors
 * Used for bundled edge visualization between trees in comparison mode
 */
import { Bezier } from 'bezier-js';
import { pointsToFloat32Path } from '../../../utils/pathFormat.js';

/**
 * Build bundled Bezier path using radial bundle points.
 * @param {Array<number>} from - Start point [x, y]
 * @param {Array<number>} to - End point [x, y]
 * @param {Array<number>} srcBundlePoint - Source bundle control point
 * @param {Array<number>} dstBundlePoint - Destination bundle control point
 * @param {number} samples - Number of points in resulting path
 * @param {Object} options
 * @param {number} options.bundlingStrength - 0 keeps individual tangents, 1 follows the bundle points
 * @param {Array<number>} options.sourceCenter - Center of the source tree, for the radial tangent
 * @param {Array<number>} options.targetCenter - Center of the target tree, for the radial tangent
 * @returns {Float32Array} Flat XYZ points along the curve
 */
export function buildBundledBezierPath(
  from,
  to,
  srcBundlePoint,
  dstBundlePoint,
  samples,
  { bundlingStrength, sourceCenter, targetCenter }
) {
  if (
    !hasFinitePoint(from) ||
    !hasFinitePoint(to) ||
    !hasFinitePoint(srcBundlePoint) ||
    !hasFinitePoint(dstBundlePoint)
  ) {
    return new Float32Array(0);
  }

  const p0 = from;
  const p3 = to;

  // Radial vector from source center to start point
  const dx1 = p0[0] - sourceCenter[0];
  const dy1 = p0[1] - sourceCenter[1];
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;

  // Radial vector from target center to end point
  const dx2 = p3[0] - targetCenter[0];
  const dy2 = p3[1] - targetCenter[1];
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

  // Control point distance (handle length) - proportional to distance
  // We want to shoot "outward"
  const handleLen = Math.min(len1, len2) * 0.5;

  const cp1_indiv = [p0[0] + (dx1 / len1) * handleLen, p0[1] + (dy1 / len1) * handleLen];
  const cp2_indiv = [p3[0] + (dx2 / len2) * handleLen, p3[1] + (dy2 / len2) * handleLen];

  // "Bundle" control points (using the radial bundle points)
  // We pull the curve towards these outer points
  const cp1_bundle = [srcBundlePoint[0], srcBundlePoint[1]];
  const cp2_bundle = [dstBundlePoint[0], dstBundlePoint[1]];

  // Interpolate between individual and bundle control points
  const lerp = (a, b, t) => a + (b - a) * t;

  const p1 = [
    lerp(cp1_indiv[0], cp1_bundle[0], bundlingStrength),
    lerp(cp1_indiv[1], cp1_bundle[1], bundlingStrength),
  ];

  const p2 = [
    lerp(cp2_indiv[0], cp2_bundle[0], bundlingStrength),
    lerp(cp2_indiv[1], cp2_bundle[1], bundlingStrength),
  ];

  // Create cubic Bezier curve
  const curve = new Bezier(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const lut = curve.getLUT(samples);
  return pointsToFloat32Path(lut);
}

function hasFinitePoint(point) {
  return (
    Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]) && Number.isFinite(point?.[2] ?? 0)
  );
}
