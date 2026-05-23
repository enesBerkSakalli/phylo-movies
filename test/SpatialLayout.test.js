// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import * as spatialLayout from '../src/treeVisualisation/spatial/layout.js';

const {
  calculateUnobstructedFitAreas,
  calculateViewportFitAreas,
  calculateRectOverlap,
  VIEWPORT_FIT_OBSTRUCTION_PADDING_PX,
  VIEWPORT_FIT_OBSTRUCTION_SELECTORS
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

describe('spatial viewport fit layout helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes named viewport fit obstruction policy constants', () => {
    expect(VIEWPORT_FIT_OBSTRUCTION_SELECTORS).toEqual([
      '.movie-player-bar',
      '#top-scale-bar-container',
      '[role="group"][aria-label="Tree viewport controls"]',
      '[role="group"][aria-label="Canvas export controls"]',
      '[role="complementary"][aria-label="Comparison Panel"]',
      '.phylo-hud',
      '.phylo-hud-restore',
      '[aria-label="Transition Inspector"]'
    ]);
    expect(VIEWPORT_FIT_OBSTRUCTION_PADDING_PX).toBe(20);
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

  it('calculates unobstructed fit areas around floating viewport UI', () => {
    expect(calculateUnobstructedFitAreas(1000, 800, [
      rect(760, 0, 240, 120),
      rect(0, 480, 220, 160),
    ])[0]).toEqual({
      left: 220,
      top: 120,
      width: 780,
      height: 680
    });
  });

  it('calculates viewport fit areas from overlapping canvas UI', () => {
    const container = elementWithRect({ bounds: rect(100, 50, 1000, 800) });
    elementWithRect({
      className: 'movie-player-bar',
      bounds: rect(100, 790, 1000, 60)
    });
    const controls = elementWithRect({
      bounds: rect(900, 60, 180, 70)
    });
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Tree viewport controls');
    const panel = elementWithRect({
      className: 'phylo-hud',
      bounds: rect(116, 550, 180, 120)
    });
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Comparison Panel');

    expect(calculateViewportFitAreas(container)[0]).toEqual({
      left: 216,
      top: 100,
      width: 784,
      height: 620
    });
  });
});
