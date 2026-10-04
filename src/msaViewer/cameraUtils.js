import { getZoomScale } from './viewportUtils.js';

export function getInitialAlignmentViewState({
  containerWidth,
  containerHeight,
  labelsWidth,
  axisHeight,
}) {
  const zoom = 0;
  const scale = getZoomScale(zoom);
  const viewportWidth = Math.max(1, containerWidth - labelsWidth);
  const viewportHeight = Math.max(1, containerHeight - axisHeight);

  return {
    target: [viewportWidth / 2 / scale, viewportHeight / 2 / scale, 0],
    zoom,
  };
}

export function getFitAlignmentViewState({
  containerWidth,
  containerHeight,
  labelsWidth,
  axisHeight,
  cellSize,
  rows,
  cols,
}) {
  const viewportWidth = Math.max(1, containerWidth - labelsWidth);
  const viewportHeight = Math.max(1, containerHeight - axisHeight);
  const contentWidth = Math.max(1, cols * cellSize);
  const contentHeight = Math.max(1, rows * cellSize);
  const zoomX = Math.log2(viewportWidth / contentWidth);
  const zoomY = Math.log2(viewportHeight / contentHeight);

  return {
    target: [contentWidth / 2, contentHeight / 2, 0],
    zoom: Math.min(zoomX, zoomY, 0) - 0.1,
  };
}

const REGION_FOCUS_PADDING = 1.1;

/**
 * Center a 1-based inclusive column region, zooming out only as far as needed
 * for the whole region to fit the main viewport width. Never zooms in.
 */
export function getRegionFocusViewState({
  currentViewState,
  containerWidth,
  labelsWidth,
  cellSize,
  startCol,
  endCol,
  padding = REGION_FOCUS_PADDING,
}) {
  const target = normalizeTarget(currentViewState?.target);
  const currentZoom = Number.isFinite(currentViewState?.zoom) ? currentViewState.zoom : 0;
  const viewportWidth = Math.max(1, containerWidth - labelsWidth);
  const regionWidth = Math.max(1, (endCol - startCol + 1) * cellSize * padding);

  target[0] = ((startCol - 1 + endCol) / 2) * cellSize;

  return {
    ...currentViewState,
    target,
    zoom: Math.min(currentZoom, Math.log2(viewportWidth / regionWidth)),
  };
}

export function deriveSynchronizedViewStates({ mainViewState, labelsWidth, axisHeight }) {
  const scale = getZoomScale(mainViewState?.zoom);
  const main = {
    ...mainViewState,
    target: normalizeTarget(mainViewState?.target),
  };

  return {
    main,
    labels: {
      ...main,
      target: [labelsWidth / 2 / scale, main.target[1], 0],
    },
    axis: {
      ...main,
      target: [main.target[0], axisHeight / 2 / scale, 0],
    },
    corner: {
      ...main,
      target: [labelsWidth / 2 / scale, axisHeight / 2 / scale, 0],
    },
  };
}

export function getCenteredViewState({ currentViewState, cellSize, row, column }) {
  const target = normalizeTarget(currentViewState?.target);

  if (column !== undefined && column !== null) {
    target[0] = Number(column) * cellSize + cellSize / 2;
  }

  if (row !== undefined && row !== null) {
    target[1] = Number(row) * cellSize + cellSize / 2;
  }

  return {
    ...currentViewState,
    target,
  };
}

function normalizeTarget(target) {
  return [
    Number.isFinite(target?.[0]) ? target[0] : 0,
    Number.isFinite(target?.[1]) ? target[1] : 0,
    0,
  ];
}
