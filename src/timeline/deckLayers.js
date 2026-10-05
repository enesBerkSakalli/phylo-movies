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
// Colours are [r, g, b] from the theme tokens TimelineView reads; `colors` is its role map.

const opaque = (rgb) => [rgb[0], rgb[1], rgb[2], 255];

export function createInputTreeLayer(inputTreePoints, inputTreeStrokeWidth, colors) {
  return createScatterplotLayer('input-tree-layer', inputTreePoints, {
    getPosition: (d) => d.position,
    getFillColor: opaque(colors.background),
    getLineColor: opaque(colors.markStrong),
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius,
    getLineWidth: (d) => d.lineWidth ?? inputTreeStrokeWidth,
    lineWidthMinPixels: inputTreeStrokeWidth,
    radiusUnits: 'pixels',
  });
}

/** Dense input trees: a tick each, the selected or hovered one wider and in the selection ink. */
export function createInputTreeTickLayer(inputTreeTicks, rgb, active = false) {
  return createPathLayer(
    active ? 'active-input-tree-tick-layer' : 'input-tree-tick-layer',
    inputTreeTicks,
    opaque(rgb),
    active ? TIMELINE_THEME.activeInputTreeTickWidth : TIMELINE_THEME.inputTreeTickWidth,
    { capRounded: true }
  );
}

export function createBaselineLayer(baselines, rgb) {
  return createPathLayer('baseline-layer', baselines, opaque(rgb), 1);
}

/** RF bars and branch-length dashes, filled with one solid colour. */
export function createPairMarkLayer(id, marks, rgb) {
  return createPolygonLayer(id, marks, {
    getFillColor: opaque(rgb),
  });
}

export function createPairPipLayer(id, pips, rgb) {
  return createScatterplotLayer(id, pips, {
    getPosition: (d) => d.position,
    getRadius: (d) => d.radius,
    getFillColor: opaque(rgb),
    radiusUnits: 'pixels',
  });
}

export function createInputTreeHoverLayer(hoverInputTrees, colors) {
  const { hover, background } = colors;
  return createScatterplotLayer('input-tree-hover-layer', hoverInputTrees, {
    getPosition: (d) => d.position,
    getFillColor: opaque(background),
    getLineColor: [hover[0], hover[1], hover[2], 160],
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
  });
}

export function createInputTreeSelectionLayer(selectionInputTrees, colors) {
  return createScatterplotLayer('input-tree-selection-layer', selectionInputTrees, {
    getPosition: (d) => d.position,
    getFillColor: opaque(colors.background),
    getLineColor: opaque(colors.selection),
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
  });
}

export function createSeparatorLayer(separators, width, rgb) {
  return createPathLayer('separator-layer', separators, opaque(rgb), width);
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

/**
 * The playhead line: thin, so the selection it passes over stays readable. It and the bars differ
 * in hue more than in lightness, so a background edge, 1 px either side, parts them.
 */
export function createScrubberLayers(ms, rangeStart, rangeEnd, width, height, isScrubbing, colors) {
  const x = scrubberX(ms, rangeStart, rangeEnd, width);
  const path = [
    [x, -height / 2],
    [x, height / 2],
  ];
  const lineWidth = isScrubbing ? 3 : 2;

  return [
    createPathLayer('scrubber-outline-layer', [{ path }], opaque(colors.background), lineWidth + 2),
    createPathLayer('scrubber-layer', [{ path }], opaque(colors.playhead), lineWidth),
  ];
}

/** The playhead's grab handle: a pointer in the headroom above the tallest bar. */
export function createScrubberKnobLayer(ms, rangeStart, rangeEnd, width, height, rgb) {
  const { scrubberKnobWidth, scrubberKnobDepth } = TIMELINE_THEME;
  const x = scrubberX(ms, rangeStart, rangeEnd, width);
  const top = height / 2;
  const polygon = [
    [x - scrubberKnobWidth / 2, top],
    [x + scrubberKnobWidth / 2, top],
    [x, top - scrubberKnobDepth],
  ];

  return createPolygonLayer('scrubber-knob-layer', [{ polygon }], {
    getFillColor: opaque(rgb),
  });
}
