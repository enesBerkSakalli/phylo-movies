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

const SCRUBBER_EDGE_PX = 1.5; // half the line while scrubbing: at either end it stays whole

// Centred on the canvas like every other mark, snapped to a device pixel
function scrubberX(ms, rangeStart, rangeEnd, width) {
  const snap = createSnapFunction(getDevicePixelRatio());
  const x = snap(msToX(ms, rangeStart, rangeEnd, width)) - width / 2;
  return Math.max(SCRUBBER_EDGE_PX - width / 2, Math.min(width / 2 - SCRUBBER_EDGE_PX, x));
}

/** The playhead line: thin, so the selection it passes over stays readable. */
export function createScrubberLayer(ms, rangeStart, rangeEnd, width, height, isScrubbing) {
  const x = scrubberX(ms, rangeStart, rangeEnd, width);
  const path = [
    [x, -height / 2],
    [x, height / 2],
  ];

  return createPathLayer(
    'scrubber-layer',
    [{ path }],
    [...TIMELINE_THEME.scrubberCoreRGB, 255],
    isScrubbing ? 3 : 2
  );
}

/** The playhead's grab handle: a pointer in the headroom above the tallest bar. */
export function createScrubberKnobLayer(ms, rangeStart, rangeEnd, width, height) {
  const { scrubberKnobWidth, scrubberKnobDepth, scrubberCoreRGB } = TIMELINE_THEME;
  const x = scrubberX(ms, rangeStart, rangeEnd, width);
  const top = height / 2;
  const polygon = [
    [x - scrubberKnobWidth / 2, top],
    [x + scrubberKnobWidth / 2, top],
    [x, top - scrubberKnobDepth],
  ];

  return createPolygonLayer('scrubber-knob-layer', [{ polygon }], {
    getFillColor: [...scrubberCoreRGB, 255],
  });
}
