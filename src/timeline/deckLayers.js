import { PathLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { msToX } from './math/coordinateUtils.js';
import { createSnapFunction, getDevicePixelRatio } from './stripGeometry.js';

export const TIMELINE_THEME = {
  connectionSelectionRGB: [5, 150, 105],
  connectionHoverRGB: [128, 128, 128],
  // The strip reads bottom-up: pips sit under the baseline, RF bars rise from it.
  // Every y is in px from the top of the strip.
  stripBaselineY: 30,
  stripBaselineRGB: [203, 213, 225],
  stripBarMaxHeight: 24,
  stripBarMinHeight: 2,
  stripBarInset: 0.5,
  stripBarMinWidth: 1,
  stripMarkRGB: [100, 116, 139],
  stripMarkHoverRGB: [30, 41, 59],
  stripDashWidth: 2,
  stripDashLength: 4,
  stripDashGap: 3,
  stripSelectionSpanWidth: 2,
  stripPipY: 39,
  stripPipRGB: [51, 65, 85],
  stripPipAlpha: 220,
  stripPipRadiusBase: 1.5,
  stripPipRadiusPerSqrtTaxon: 0.9,
  stripPipRadiusMax: 4,
  inputTreeStrokeWidth: 3,
  inputTreeFillRGB: [240, 240, 245],
  inputTreeStrokeRGB: [60, 60, 80],
  inputTreeRadiusVar: 7,
  inputTreeDenseThresholdPx: 18,
  inputTreeTickLength: 4,
  inputTreeTickWidth: 1,
  activeInputTreeTickWidth: 4,
  separatorRGB: [0, 0, 0],
  separatorWidthMax: 2,
  separatorWidthMin: 1,
  separatorAlpha: 56,
  separatorDenseAlpha: 24,
  scrubberCoreRGB: [64, 128, 255],
  transitionGap: 3,
  paddingX: 8,
  paddingY: 0,
};

// ==========================================================================
// BASE LAYER FACTORIES
// ==========================================================================

export function createPathLayer(id, data, color, width, options = {}) {
  const props = {
    id,
    data,
    getPath: (d) => d.path,
    widthMinPixels: width,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    parameters: {
      depthCompare: 'always',
      depthWriteEnabled: false,
    },
    ...options,
  };
  if (Array.isArray(color)) {
    props.getColor = color;
  } else if (!props.getColor) {
    props.getColor = (d) => d.color;
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

export function createInputTreeTickLayer(inputTreeTicks, theme, active = false) {
  return createPathLayer(
    active ? 'active-input-tree-tick-layer' : 'input-tree-tick-layer',
    inputTreeTicks,
    active
      ? [theme.scrubberCoreRGB[0], theme.scrubberCoreRGB[1], theme.scrubberCoreRGB[2], 255]
      : [theme.stripMarkRGB[0], theme.stripMarkRGB[1], theme.stripMarkRGB[2], 255],
    active ? theme.activeInputTreeTickWidth : theme.inputTreeTickWidth,
    { capRounded: true }
  );
}

export function createBaselineLayer(baselines, theme) {
  return createPathLayer(
    'baseline-layer',
    baselines,
    [theme.stripBaselineRGB[0], theme.stripBaselineRGB[1], theme.stripBaselineRGB[2], 255],
    1
  );
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

export function createInputTreeSelectionLayer(selectionInputTrees, theme) {
  return createScatterplotLayer('input-tree-selection-layer', selectionInputTrees, {
    getPosition: (d) => d.position,
    getFillColor: (d) => d.fillColor,
    getLineColor: [
      theme.connectionSelectionRGB[0],
      theme.connectionSelectionRGB[1],
      theme.connectionSelectionRGB[2],
      230,
    ],
    stroked: true,
    filled: true,
    getRadius: (d) => d.radius + 1,
    lineWidthMinPixels: 2,
    radiusUnits: 'pixels',
  });
}

export function createSeparatorLayer(separators, theme, width) {
  return createPathLayer('separator-layer', separators, null, width, {
    getColor: (d) => {
      const alpha = d.markerMode === 'circle' ? theme.separatorAlpha : theme.separatorDenseAlpha;
      return [theme.separatorRGB[0], theme.separatorRGB[1], theme.separatorRGB[2], alpha];
    },
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

// ==========================================================================
// SCRUBBER LAYER
// ==========================================================================

export function createScrubberLayer(ms, rangeStart, rangeEnd, width, height, theme, isScrubbing) {
  const dpr = getDevicePixelRatio();
  const snap = createSnapFunction(dpr);
  const scrubX = snap(msToX(ms, rangeStart, rangeEnd, width));
  const scrubPoly = [
    [scrubX - width / 2, -height / 2],
    [scrubX - width / 2, height / 2],
  ];
  const coreRGB = theme.scrubberCoreRGB;
  const coreColor = [coreRGB[0], coreRGB[1], coreRGB[2], 255];

  return createPathLayer('scrubber-layer', [{ path: scrubPoly }], coreColor, isScrubbing ? 10 : 7);
}
