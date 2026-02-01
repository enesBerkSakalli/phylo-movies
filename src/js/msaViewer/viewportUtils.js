/**
 * Viewport utilities for MSADeckGLViewer
 * Keeps zoom math, clamping, and visible range calculations in one place.
 */

export function getZoomScale(zoom = 0) {
  return Math.pow(2, zoom || 0);
}

export function clampViewState(viewState, {
  minZoom,
  maxZoom,
  containerWidth,
  containerHeight,
  labelsWidth = 0,
  axisHeight = 0,
  cellSize,
  rows,
  cols
}) {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, viewState.zoom));

  // If no data, just clamp zoom and keep target as-is
  if (!rows || !cols) {
    return { ...viewState, zoom: clampedZoom };
  }

  const contentWidth = cols * cellSize;
  const contentHeight = rows * cellSize;
  const zoomScale = getZoomScale(clampedZoom);

  const viewportWidth = Math.max(1, (containerWidth - labelsWidth));
  const viewportHeight = Math.max(1, (containerHeight - axisHeight));
  const halfW = (viewportWidth / zoomScale) / 2;
  const halfH = (viewportHeight / zoomScale) / 2;

  const minX = Math.min(halfW, contentWidth / 2);
  const maxX = Math.max(contentWidth - halfW, contentWidth / 2);
  const minY = Math.min(halfH, contentHeight / 2);
  const maxY = Math.max(contentHeight - halfH, contentHeight / 2);

  const target = [
    Math.max(minX, Math.min(maxX, viewState.target[0])),
    Math.max(minY, Math.min(maxY, viewState.target[1])),
    0
  ];

  return { ...viewState, zoom: clampedZoom, target };
}

export function getVisibleRange(viewState, { containerWidth, containerHeight, labelsWidth = 0, axisHeight = 0 }, cellSize, rows, cols) {
  const zoomScale = getZoomScale(viewState?.zoom || 0);
  const worldPerPixel = 1 / zoomScale;

  // Use main view dimensions (subtract labels and axis from container)
  const mainWidth = Math.max(1, containerWidth - labelsWidth);
  const mainHeight = Math.max(1, containerHeight - axisHeight);

  const halfW = (mainWidth * worldPerPixel) / 2;
  const halfH = (mainHeight * worldPerPixel) / 2;
  const [cx, cy] = viewState.target || [0, 0];

  let c0 = Math.floor((cx - halfW) / cellSize) - 1;
  let c1 = Math.ceil((cx + halfW) / cellSize) + 1;
  let r0 = Math.floor((cy - halfH) / cellSize) - 1;
  let r1 = Math.ceil((cy + halfH) / cellSize) + 1;

  c0 = Math.max(0, Math.min((cols ?? 0) - 1, c0));
  c1 = Math.max(0, Math.min((cols ?? 0) - 1, c1));
  r0 = Math.max(0, Math.min((rows ?? 0) - 1, r0));
  r1 = Math.max(0, Math.min((rows ?? 0) - 1, r1));

  return { r0, r1, c0, c1 };
}
