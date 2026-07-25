/**
 * Layout projection barrel export.
 *
 * radial: default d3 radial layout, unmodified (see applyProjection.js)
 * hyperbolic: single-parameter tanh focus+context compression in the radial
 *   dimension only (radialProjection.js)
 * walrus-3d: full H3/hyperboloid ("Walrus") layout — subtree sizing, angle
 *   assignment, and Lorentz coordinate frames all live under walrus3d/
 */
export { LAYOUT_PROJECTION_MODES, DEFAULT_LAYOUT_PROJECTION_MODE, DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH } from './constants.js';
export { normalizeLayoutProjectionMode, normalizeHyperbolicProjectionStrength } from './normalization.js';
export { applyLayoutProjection } from './applyProjection.js';
export { applyHyperbolicRadialProjection } from './radialProjection.js';
export { applyWalrus3dProjection } from './walrus3d/index.js';
