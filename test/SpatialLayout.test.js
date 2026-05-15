// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import * as spatialLayout from '../src/treeVisualisation/spatial/layout.js';

const {
  clampSafeAreaPadding,
  calculateRectOverlap,
  calculateSafeAreaPadding,
  calculateSafeAreaPaddingForRect,
  classifySafeAreaBar,
  normalizeSafeArea,
  scaleSafeAreaToMinimumVisibleViewport
} = spatialLayout;

function rect(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function elementWithRect({ className, id, bounds }) {
  const el = document.createElement('div');
  if (className) el.className = className;
  if (id) el.id = id;
  el.getBoundingClientRect = () => bounds;
  document.body.appendChild(el);
  return el;
}

describe('spatial safe-area layout helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes named safe-area policy constants', () => {
    expect(spatialLayout.SAFE_AREA_UI_SELECTORS).toEqual([
      '.movie-player-bar',
      '#top-scale-bar-container'
    ]);
    expect(spatialLayout.SAFE_AREA_EDGE_THRESHOLD_PX).toBe(24);
    expect(spatialLayout.SAFE_AREA_EXTRA_PADDING_PX).toBe(20);
    expect(spatialLayout.SAFE_AREA_MIN_VISIBLE_FRACTION).toBe(0.4);
    expect(spatialLayout.SAFE_AREA_BAR_COVERAGE_FRACTION).toBe(0.5);
  });

  it('calculates rectangle overlap without DOM access', () => {
    expect(calculateRectOverlap(
      rect(50, 75, 200, 100),
      rect(0, 0, 150, 125)
    )).toEqual({ x: 100, y: 50 });

    expect(calculateRectOverlap(
      rect(200, 200, 50, 50),
      rect(0, 0, 100, 100)
    )).toEqual({ x: 0, y: 0 });
  });

  it('classifies safe-area bars by canvas coverage', () => {
    const canvasRect = rect(0, 0, 1000, 800);

    expect(classifySafeAreaBar(rect(0, 740, 501, 60), canvasRect)).toEqual({
      horizontal: true,
      vertical: false
    });
    expect(classifySafeAreaBar(rect(960, 0, 40, 401), canvasRect)).toEqual({
      horizontal: false,
      vertical: true
    });
    expect(classifySafeAreaBar(rect(960, 740, 40, 60), canvasRect)).toEqual({
      horizontal: false,
      vertical: false
    });
  });

  it('calculates raw edge padding for one overlapping safe-area element', () => {
    const canvasRect = rect(0, 0, 1000, 800);

    expect(calculateSafeAreaPaddingForRect(rect(0, 740, 1000, 60), canvasRect)).toEqual({
      top: 0,
      right: 0,
      bottom: 60,
      left: 0
    });
    expect(calculateSafeAreaPaddingForRect(rect(0, 0, 40, 800), canvasRect)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 40
    });
  });

  it('clamps raw safe-area padding to canvas dimensions', () => {
    expect(clampSafeAreaPadding({
      top: 900,
      right: 1200,
      bottom: -10,
      left: Number.NaN
    }, 1000, 800)).toEqual({
      top: 800,
      right: 1000,
      bottom: 0,
      left: 0
    });
  });

  it('scales opposing safe-area padding to preserve the minimum visible viewport', () => {
    expect(scaleSafeAreaToMinimumVisibleViewport({
      top: 700,
      right: 500,
      bottom: 700,
      left: 500
    }, 1000, 800)).toEqual({
      top: 240,
      right: 300,
      bottom: 240,
      left: 300
    });
  });

  it('adds extra bottom padding for an overlapping movie player bar', () => {
    const container = elementWithRect({ bounds: rect(0, 0, 1000, 800) });
    elementWithRect({
      className: 'movie-player-bar',
      bounds: rect(0, 740, 1000, 60)
    });

    expect(calculateSafeAreaPadding(container)).toEqual({
      top: 0,
      right: 0,
      bottom: 80,
      left: 0
    });
  });

  it('ignores overlapping elements that do not cover enough of an edge', () => {
    const container = elementWithRect({ bounds: rect(0, 0, 1000, 800) });
    elementWithRect({
      className: 'movie-player-bar',
      bounds: rect(0, 740, 400, 60)
    });

    expect(calculateSafeAreaPadding(container)).toBeNull();
  });

  it('scales normalized padding to keep the minimum visible viewport area', () => {
    expect(normalizeSafeArea({
      top: 700,
      right: 500,
      bottom: 700,
      left: 500
    }, 1000, 800)).toEqual({
      top: 240,
      right: 300,
      bottom: 240,
      left: 300
    });
  });
});
