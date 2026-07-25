import { LAYOUT_PROJECTION_MODES } from './constants.js';
import { normalizeHyperbolicProjectionStrength } from './normalization.js';
import { resolveMaxRadius } from './geometryUtils.js';

const MIN_PROJECTION_CURVATURE = 0.25;
const MAX_PROJECTION_CURVATURE = 4.5;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function tagProjection(root, strength) {
  root.each((node) => {
    node.projectionMode = LAYOUT_PROJECTION_MODES.HYPERBOLIC;
    node.hyperbolicProjectionStrength = strength;
    node.hyperbolicOriginalRadius = Number.isFinite(node.radius) ? node.radius : 0;
  });
}

export function applyHyperbolicRadialProjection(root, options = {}) {
  if (!root || typeof root.each !== 'function') return root;

  const strength = normalizeHyperbolicProjectionStrength(options.strength);
  if (strength <= 0) {
    tagProjection(root, strength);
    return root;
  }

  const maxRadius = resolveMaxRadius(root, options.maxRadius);
  if (!Number.isFinite(maxRadius) || maxRadius <= 0) {
    tagProjection(root, strength);
    return root;
  }

  const curvature =
    MIN_PROJECTION_CURVATURE + strength * (MAX_PROJECTION_CURVATURE - MIN_PROJECTION_CURVATURE);
  const denominator = Math.tanh(curvature);

  // This is a PhyloMovies projection layer, not a full Walrus/H3 layout:
  // it preserves the existing branch-length radial layout and applies the
  // hyperbolic focus+context compression in the radial dimension.
  root.each((node) => {
    const originalRadius = Number.isFinite(node.radius) ? Math.max(0, node.radius) : 0;
    const normalizedRadius = Math.min(1, originalRadius / maxRadius);
    const ballRadius =
      denominator > 0 ? Math.tanh(curvature * normalizedRadius) / denominator : normalizedRadius;
    const projectedRadius = maxRadius * lerp(normalizedRadius, ballRadius, strength);
    const angle = Number.isFinite(node.rotatedAngle)
      ? node.rotatedAngle
      : Number.isFinite(node.angle)
        ? node.angle
        : 0;

    node.hyperbolicOriginalRadius = originalRadius;
    node.radius = projectedRadius;
    node.x = projectedRadius * Math.cos(angle);
    node.y = projectedRadius * Math.sin(angle);
    node.projectionMode = LAYOUT_PROJECTION_MODES.HYPERBOLIC;
    node.hyperbolicProjectionStrength = strength;
  });

  return root;
}
