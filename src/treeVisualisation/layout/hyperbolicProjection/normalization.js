import { DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH, LAYOUT_PROJECTION_MODES } from './constants.js';

export function normalizeLayoutProjectionMode(mode) {
  if (mode === LAYOUT_PROJECTION_MODES.HYPERBOLIC) return LAYOUT_PROJECTION_MODES.HYPERBOLIC;
  if (mode === LAYOUT_PROJECTION_MODES.WALRUS_3D) return LAYOUT_PROJECTION_MODES.WALRUS_3D;
  return LAYOUT_PROJECTION_MODES.RADIAL;
}

export function normalizeHyperbolicProjectionStrength(strength) {
  const value = Number(strength);
  if (!Number.isFinite(value)) return DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH;
  return Math.min(1, Math.max(0, value));
}
