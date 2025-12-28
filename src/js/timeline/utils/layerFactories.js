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
    parameters: { depthTest: false },
    ...options
  };
  props.getColor = Array.isArray(color) ? color : (d => d.color);
  return new PathLayer(props);
}

export function createScatterplotLayer(id, data, options = {}) {
  return new ScatterplotLayer({
    id,
    data,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: { depthTest: false },
    ...options
  });
}

// ==========================================================================
// TIMELINE LAYER FACTORIES
// ==========================================================================

export function createAnchorLayer(anchorPoints, anchorStrokeWidth) {
  return createScatterplotLayer('anchor-layer', anchorPoints, {
    getPosition: d => d.position,
    getFillColor: d => d.fillColor,
    getLineColor: d => d.borderColor,
    stroked: true,
    filled: true,
    getRadius: d => d.radius,
    lineWidthMinPixels: anchorStrokeWidth,
    radiusUnits: 'pixels'
  });
}

export function createConnectionLayer(connections, connectionWidth) {
  return createPathLayer('connection-layer', connections, null, connectionWidth, {
    capRounded: true,
    jointRounded: true
  });
}

export function createAnchorHoverLayer(hoverAnchors, hoverRGB, onClick = null) {
  return createScatterplotLayer('anchor-hover-layer', hoverAnchors, {
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

export function createAnchorSelectionLayer(selectionAnchors, theme) {
  return createScatterplotLayer('anchor-selection-layer', selectionAnchors, {
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

export function createSeparatorLayer(separators, theme) {
  return createPathLayer('separator-layer', separators, [theme.separatorRGB[0], theme.separatorRGB[1], theme.separatorRGB[2], 120], theme.separatorWidth);
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

export function calculateRadius(anchorRadiusVar, height, zoomScale) {
  const baseRadius = Number.isFinite(anchorRadiusVar)
    ? anchorRadiusVar
    : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
}

function calculateConnectionGaps(i, segments, anchorRadius, gapDefault) {
  const leftNeighborIsAnchor = (i > 0) && segments[i - 1]?.isFullTree;
  const rightNeighborIsAnchor = (i < segments.length - 1) && segments[i + 1]?.isFullTree;

  return {
    leftGap: leftNeighborIsAnchor ? anchorRadius : gapDefault,
    rightGap: rightNeighborIsAnchor ? anchorRadius : gapDefault
  };
}

export function createAnchor(id, x0, x1, width, height, anchorFillRGB, anchorStrokeRGB, anchorRadiusVar, zoomScale, snap) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(anchorRadiusVar, height, zoomScale);
  const centeredX = toCanvasCentered(center, width);
  const clampedX = clampToViewport(centeredX, radius, width);

  return {
    id,
    position: [snap(clampedX), 0],
    fillColor: rgba(...anchorFillRGB),
    borderColor: rgba(...anchorStrokeRGB),
    radius
  };
}

export function createConnection(i, id, x0, x1, width, height, anchorRadiusVar, zoomScale, gapDefault, connectionNeutralRGB, snap, segments) {
  const anchorRadius = calculateRadius(anchorRadiusVar, height, zoomScale);
  const { leftGap, rightGap } = calculateConnectionGaps(i, segments, anchorRadius, gapDefault);

  const xStart = snap(toCanvasCentered(x0, width) + leftGap);
  const xEnd = snap(toCanvasCentered(x1, width) - rightGap);

  if (xEnd <= xStart) return null;

  return {
    id,
    path: [[xStart, 0], [xEnd, 0]],
    color: rgba(...connectionNeutralRGB, 220)
  };
}
