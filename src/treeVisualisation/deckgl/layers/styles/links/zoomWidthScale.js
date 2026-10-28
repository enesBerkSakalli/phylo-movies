// Branch line weight is a screen-pixel width that follows the camera moderately: it doubles
// every two zoom levels away from the fit zoom, between 0.25x and 4x. deck.gl's
// widthMinPixels still keeps every line at 1 px or more.
const ZOOM_WIDTH_EXPONENT = 0.5;
const MAX_WIDTH_OCTAVES = 2;

// Typical fit zoom (500-unit world in an ~800 px canvas), used until the render context
// carries the camera's own `fitZoom`.
export const NOMINAL_FIT_ZOOM = 0.5;

export function getZoomWidthScale(state) {
  const zoom = state?.zoom;
  if (!Number.isFinite(zoom)) return 1;

  const fitZoom = Number.isFinite(state.fitZoom) ? state.fitZoom : NOMINAL_FIT_ZOOM;
  const octaves = ZOOM_WIDTH_EXPONENT * (zoom - fitZoom);
  return 2 ** Math.max(-MAX_WIDTH_OCTAVES, Math.min(MAX_WIDTH_OCTAVES, octaves));
}
