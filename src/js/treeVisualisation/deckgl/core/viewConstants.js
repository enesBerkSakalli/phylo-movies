export const VIEW_IDS = {
  ORTHO: 'ortho',
  ORBIT: 'orbit'
};

export const DEFAULT_ORTHO_STATE = {
  id: VIEW_IDS.ORTHO,
  target: [0, 0, 0],
  zoom: 0,
  minZoom: -4,  // Far enough to see large trees, prevents over-zoom-out
  maxZoom: 6    // Close enough for detail, prevents excessive zoom-in
};

export const DEFAULT_ORBIT_STATE = {
  id: VIEW_IDS.ORBIT,
  target: [0, 0, 0],
  zoom: 0,
  minZoom: -4,
  maxZoom: 6,
  rotationX: 30,
  rotationOrbit: -30
};
