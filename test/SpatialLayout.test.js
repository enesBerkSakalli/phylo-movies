// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import * as spatialLayout from '../src/treeVisualisation/spatial/layout.js';

const { calculateSafeAreaPadding, normalizeSafeArea } = spatialLayout;

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
