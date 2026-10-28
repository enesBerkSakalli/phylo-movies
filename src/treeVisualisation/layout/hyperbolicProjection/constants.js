export const LAYOUT_PROJECTION_MODES = {
  RADIAL: 'radial',
  HYPERBOLIC: 'hyperbolic',
  WALRUS_3D: 'walrus-3d',
  // Equal-angle unrooted embedding. Unlike the others this is not a warp of the
  // radial layout's radii -- it replaces the polar placement entirely, so it
  // branches in TidyTreeLayout rather than in applyLayoutProjection.
  UNROOTED: 'unrooted',
  // Phylogram rows: x = branch length, y = leaf order; also replaces polar placement.
  RECTANGULAR: 'rectangular',
};

export const DEFAULT_LAYOUT_PROJECTION_MODE = LAYOUT_PROJECTION_MODES.RADIAL;
export const DEFAULT_HYPERBOLIC_PROJECTION_STRENGTH = 0.65;
