import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { msToX } from './math/coordinateUtils.js';
import { TIMELINE_THEME, createSnapFunction, getDevicePixelRatio } from './stripGeometry.js';

// ==========================================================================
// BASE LAYER FACTORIES
// ==========================================================================

function createPathLayer(id, data, color, width, options = {}) {
  return new PathLayer({
    id,
    data,
    getPath: (d) => d.path,
    getColor: color,
    widthMinPixels: width,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false,
    },
    ...options,
  });
}

function createScatterplotLayer(id, data, options = {}) {
  return new ScatterplotLayer({
    id,
    data,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false,
    },
    ...options,
  });
}

function createPolygonLayer(id, data, options = {}) {
  return new PolygonLayer({
    id,
    data,
    getPolygon: (d) => d.polygon,
    filled: true,
    stroked: false,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false,
    },
    ...options,
  });
}

// ==========================================================================
// TIMELINE LAYER FACTORIES
// ==========================================================================

export function createInputTreeLayer(inputTreePoints, inputTreeStrokeWidth) {
  return createScatterplotLayer('input-tree-layer', inputTreePoints, {
    getPosition: (d) => d.position,
    getFillColor: (d) => d.fillColor,
    getLineColor: (d) => d.borderColor,
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius,
    getLineWidth: (d) => d.lineWidth ?? inputTreeStrokeWidth,
    lineWidthMinPixels: inputTreeStrokeWidth,
    radiusUnits: 'pixels',
  });
}

export function createInputTreeTickLayer(inputTreeTicks, active = false) {
  return createPathLayer(
    active ? 'active-input-tree-tick-layer' : 'input-tree-tick-layer',
    inputTreeTicks,
    [...(active ? TIMELINE_THEME.scrubberCoreRGB : TIMELINE_THEME.stripMarkRGB), 255],
    active ? TIMELINE_THEME.activeInputTreeTickWidth : TIMELINE_THEME.inputTreeTickWidth,
    { capRounded: true }
  );
}

export function createBaselineLayer(baselines) {
  return createPathLayer('baseline-layer', baselines, [...TIMELINE_THEME.stripBaselineRGB, 255], 1);
}

/** RF bars and branch-length dashes, filled with one solid colour. */
export function createPairMarkLayer(id, marks, rgb) {
  return createPolygonLayer(id, marks, {
    getFillColor: [rgb[0], rgb[1], rgb[2], 255],
  });
}

export function createPairPipLayer(id, pips, rgb, alpha) {
  return createScatterplotLayer(id, pips, {
    getPosition: (d) => d.position,
    getRadius: (d) => d.radius,
    getFillColor: [rgb[0], rgb[1], rgb[2], alpha],
    radiusUnits: 'pixels',
  });
}

export function createInputTreeHoverLayer(hoverInputTrees, hoverRGB) {
  return createScatterplotLayer('input-tree-hover-layer', hoverInputTrees, {
    getPosition: (d) => d.position,
    getFillColor: (d) => d.fillColor,
    getLineColor: [hoverRGB[0], hoverRGB[1], hoverRGB[2], 160],
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
  });
}

export function createInputTreeSelectionLayer(selectionInputTrees) {
  return createScatterplotLayer('input-tree-selection-layer', selectionInputTrees, {
    getPosition: (d) => d.position,
    getFillColor: (d) => d.fillColor,
    getLineColor: [...TIMELINE_THEME.connectionSelectionRGB, 230],
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
  });
}

export function createSeparatorLayer(separators, width) {
  const { separatorRGB, separatorAlpha } = TIMELINE_THEME;
  return createPathLayer('separator-layer', separators, [...separatorRGB, separatorAlpha], width);
}

/**
 * Calculate separator width based on segment count.
 * Fewer segments = thicker separators, many segments = thinner.
 */
export function calculateSeparatorWidth(segmentCount) {
  const { separatorWidthMin, separatorWidthMax } = TIMELINE_THEME;
  if (segmentCount <= 5) return separatorWidthMax;
  if (segmentCount >= 30) return separatorWidthMin;
  // Linear interpolation between 5 and 30 segments
  const t = (segmentCount - 5) / 25;
  return Math.round(separatorWidthMax - t * (separatorWidthMax - separatorWidthMin));
}

// ==========================================================================
// SCRUBBER LAYER
// ==========================================================================

export function createScrubberLayer(ms, rangeStart, rangeEnd, width, height, isScrubbing) {
  const snap = createSnapFunction(getDevicePixelRatio());
  const scrubX = snap(msToX(ms, rangeStart, rangeEnd, width));
  const scrubPoly = [
    [scrubX - width / 2, -height / 2],
    [scrubX - width / 2, height / 2],
  ];
  const coreColor = [...TIMELINE_THEME.scrubberCoreRGB, 255];

  return createPathLayer('scrubber-layer', [{ path: scrubPoly }], coreColor, isScrubbing ? 10 : 7);
}
