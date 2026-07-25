import { LAYOUT_PROJECTION_MODES } from './constants.js';
import { normalizeLayoutProjectionMode } from './normalization.js';
import { applyHyperbolicRadialProjection } from './radialProjection.js';
import { applyWalrus3dProjection } from './walrus3d/index.js';

export function applyLayoutProjection(root, options = {}) {
  const projectionMode = normalizeLayoutProjectionMode(options.projectionMode);
  if (projectionMode === LAYOUT_PROJECTION_MODES.RADIAL) {
    return root;
  }

  if (projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D) {
    return applyWalrus3dProjection(root, {
      strength: options.strength,
      maxRadius: options.maxRadius,
    });
  }

  return applyHyperbolicRadialProjection(root, {
    strength: options.strength,
    maxRadius: options.maxRadius,
  });
}
