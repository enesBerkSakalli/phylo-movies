import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { msToX } from '../math/coordinateUtils.js';
import { rgba } from '../../msaViewer/utils/colorUtils.js';

// ==========================================================================
// DEVICE PIXEL RATIO HELPERS
// ==========================================================================

export function getDevicePixelRatio() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
}

export function createSnapFunction(dpr) {
  return (v) => Math.round(v * dpr) / dpr;
}

// ==========================================================================
// BASE LAYER FACTORIES
// ==========================================================================

export function createPathLayer(id, data, color, width, options = {}) {
  const props = {
    id,
    data,
    getPath: d => d.path,
    widthMinPixels: width,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false
    },
    ...options
  };
  if (Array.isArray(color)) {
    props.getColor = color;
  } else if (!props.getColor) {
    props.getColor = d => d.color;
  }
  return new PathLayer(props);
}

function createScatterplotLayer(id, data, options = {}) {
  return new ScatterplotLayer({
    id,
    data,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false
    },
    ...options
  });
}

// ==========================================================================
// TIMELINE LAYER FACTORIES
// ==========================================================================

export function createInputTreeLayer(inputTreePoints, inputTreeStrokeWidth) {
  return createScatterplotLayer('input-tree-layer', inputTreePoints, {
    getPosition: d => d.position,
    getFillColor: d => d.fillColor,
    getLineColor: d => d.borderColor,
    stroked: true,
    filled: true,
    getRadius: d => d.radius,
    getLineWidth: d => d.lineWidth ?? inputTreeStrokeWidth,
    radiusUnits: 'pixels'
  });
}

export function createInputTreeTickLayer(inputTreeTicks, theme, active = false) {
  return createPathLayer(
    active ? 'active-input-tree-tick-layer' : 'input-tree-tick-layer',
    inputTreeTicks,
    active
      ? [theme.scrubberCoreRGB[0], theme.scrubberCoreRGB[1], theme.scrubberCoreRGB[2], 255]
      : [theme.inputTreeTickRGB[0], theme.inputTreeTickRGB[1], theme.inputTreeTickRGB[2], theme.inputTreeTickAlpha],
    active ? theme.activeInputTreeTickWidth : theme.inputTreeTickWidth,
    { capRounded: true }
  );
}

export function createStripTrackLayer(stripTracks, theme) {
  return createPathLayer(
    'strip-track-layer',
    stripTracks,
    [theme.stripTrackRGB[0], theme.stripTrackRGB[1], theme.stripTrackRGB[2], theme.stripTrackAlpha],
    theme.stripTrackWidth,
    { capRounded: true }
  );
}

export function createConnectionLayer(connections, connectionWidth) {
  return createPathLayer('connection-layer', connections, null, connectionWidth, {
    capRounded: true,
    jointRounded: true
  });
}

export function createInputTreeHoverLayer(hoverInputTrees, hoverRGB, onClick = null) {
  return createScatterplotLayer('input-tree-hover-layer', hoverInputTrees, {
    getPosition: d => d.position,
    getFillColor: d => d.fillColor,
    getLineColor: [hoverRGB[0], hoverRGB[1], hoverRGB[2], 160],
    stroked: true,
    filled: true,
    getRadius: d => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
    pickable: !!onClick,
    onClick
  });
}

export function createConnectionHoverLayer(hoverConnections, hoverRGB, connectionHoverWidth, onClick = null) {
  return createPathLayer('connection-hover-layer', hoverConnections, [hoverRGB[0], hoverRGB[1], hoverRGB[2], 160], connectionHoverWidth, {
    capRounded: true,
    jointRounded: true,
    pickable: !!onClick,
    onClick
  });
}

export function createInputTreeSelectionLayer(selectionInputTrees, theme) {
  return createScatterplotLayer('input-tree-selection-layer', selectionInputTrees, {
    getPosition: d => d.position,
    getFillColor: d => d.fillColor,
    getLineColor: [theme.connectionSelectionRGB[0], theme.connectionSelectionRGB[1], theme.connectionSelectionRGB[2], 230],
    stroked: true,
    filled: true,
    getRadius: d => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels'
  });
}

export function createSeparatorLayer(separators, theme, widthOverride = 1) {
  return createPathLayer('separator-layer', separators, null, widthOverride, {
    getColor: d => {
      const alpha = d.markerMode === 'circle' ? theme.separatorAlpha : theme.separatorDenseAlpha;
      return [theme.separatorRGB[0], theme.separatorRGB[1], theme.separatorRGB[2], alpha];
    }
  });
}

/**
 * Calculate separator width based on segment count.
 * Fewer segments = thicker separators, many segments = thinner.
 */
export function calculateSeparatorWidth(segmentCount, theme) {
  const { separatorWidthMin = 1, separatorWidthMax = 2 } = theme;
  if (segmentCount <= 5) return separatorWidthMax;
  if (segmentCount >= 30) return separatorWidthMin;
  // Linear interpolation between 5 and 30 segments
  const t = (segmentCount - 5) / 25;
  return Math.round(separatorWidthMax - t * (separatorWidthMax - separatorWidthMin));
}

export function createConnectionSelectionLayer(selectionConnections, theme) {
  return createPathLayer('connection-selection-layer', selectionConnections, [theme.connectionSelectionRGB[0], theme.connectionSelectionRGB[1], theme.connectionSelectionRGB[2], 230], theme.connectionSelectionWidth, {
    capRounded: true,
    jointRounded: true
  });
}

// ==========================================================================
// SCRUBBER LAYER
// ==========================================================================

export function createScrubberLayer(ms, rangeStart, rangeEnd, width, height, theme, isScrubbing) {
  const dpr = getDevicePixelRatio();
  const snap = createSnapFunction(dpr);
  const scrubX = snap(msToX(ms, rangeStart, rangeEnd, width));
  const scrubPoly = [
    [scrubX - width / 2, -height / 2],
    [scrubX - width / 2, height / 2]
  ];
  const coreRGB = theme.scrubberCoreRGB;
  const coreColor = [coreRGB[0], coreRGB[1], coreRGB[2], 255];

  return {
    id: 'scrubber-layer',
    data: [{ path: scrubPoly }],
    getColor: coreColor,
    widthMinPixels: isScrubbing ? 10 : 7,
    getLineColor: [255, 255, 255, 180],
    lineWidthMinPixels: 1
  };
}


// ==========================================================================
// GEOMETRY DATA FACTORIES
// ==========================================================================

function toCanvasCentered(x, canvasWidth) {
  return x - canvasWidth / 2;
}

function clampToViewport(x, radius, width) {
  const halfWidth = width / 2;
  return Math.max(-halfWidth + radius, Math.min(halfWidth - radius, x));
}

function calculateRadius(inputTreeRadiusVar, height, zoomScale) {
  const baseRadius = Number.isFinite(inputTreeRadiusVar)
    ? inputTreeRadiusVar
    : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
}

function calculateConnectionGaps(i, segments, inputTreeRadius, gapDefault) {
  const leftNeighborIsInputTree = (i > 0) && segments[i - 1]?.isFullTree;
  const rightNeighborIsInputTree = (i < segments.length - 1) && segments[i + 1]?.isFullTree;

  return {
    leftGap: leftNeighborIsInputTree ? inputTreeRadius : gapDefault,
    rightGap: rightNeighborIsInputTree ? inputTreeRadius : gapDefault
  };
}

export function createInputTreeMarker(segmentIndex, id, x0, x1, width, height, theme, zoomScale, snap) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(theme.inputTreeRadiusVar, height, zoomScale);
  const centeredX = toCanvasCentered(center, width);
  const clampedX = clampToViewport(centeredX, radius, width);

  return {
    segmentIndex,
    id,
    position: [snap(clampedX), 0],
    fillColor: rgba(...theme.inputTreeFillRGB),
    borderColor: rgba(...theme.inputTreeStrokeRGB),
    radius,
    lineWidth: theme.inputTreeStrokeWidth
  };
}

export function createInputTreeTick(x0, x1, width, height, theme, snap) {
  const center = (x0 + x1) / 2;
  const x = snap(toCanvasCentered(center, width));
  const halfHeight = Math.max(5, Math.min(11, height * 0.34));

  return {
    path: [
      [x, -halfHeight],
      [x, halfHeight]
    ]
  };
}

export function createStripTrack(width, snap) {
  const left = snap(-width / 2);
  const right = snap(width / 2);

  return {
    path: [
      [left, 0],
      [right, 0]
    ]
  };
}

export function createConnection(i, id, x0, x1, width, height, inputTreeRadiusVar, zoomScale, gapDefault, connectionNeutralRGB, snap, segments) {
  const inputTreeRadius = calculateRadius(inputTreeRadiusVar, height, zoomScale);
  const { leftGap, rightGap } = calculateConnectionGaps(i, segments, inputTreeRadius, gapDefault);

  const xStart = snap(toCanvasCentered(x0, width) + leftGap);
  const xEnd = snap(toCanvasCentered(x1, width) - rightGap);

  if (xEnd <= xStart) return null;

  return {
    segmentIndex: i,
    id,
    path: [[xStart, 0], [xEnd, 0]],
    color: rgba(...connectionNeutralRGB, 220)
  };
}
