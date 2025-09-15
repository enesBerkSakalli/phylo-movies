import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

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
  // Allow constant color or per-datum color accessor
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

export function createAnchorHoverLayer(hoverAnchors, hoverRGB) {
  return createScatterplotLayer('anchor-hover-layer', hoverAnchors, {
    getPosition: d => d.position,
    getFillColor: d => d.fillColor,
    getLineColor: [hoverRGB[0], hoverRGB[1], hoverRGB[2], 160],
    stroked: true,
    filled: true,
    getRadius: d => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels'
  });
}

export function createConnectionHoverLayer(hoverConnections, hoverRGB, connectionHoverWidth) {
  return createPathLayer('connection-hover-layer', hoverConnections, [hoverRGB[0], hoverRGB[1], hoverRGB[2], 160], connectionHoverWidth, {
    capRounded: true,
    jointRounded: true
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
