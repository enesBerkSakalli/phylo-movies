import { describe, expect, it } from 'vitest';
import {
  areBoundsInView,
  expandBoundsForLabels
} from '../src/treeVisualisation/spatial/bounds.js';

describe('areBoundsInView', () => {
  it('returns false when no viewport bounds API is available', () => {
    expect(areBoundsInView(
      { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      null
    )).toBe(false);
  });

  it('checks bounds against padded viewport bounds', () => {
    const viewport = {
      getBounds: () => [0, 0, 100, 100],
    };

    expect(areBoundsInView(
      { minX: 5, maxX: 95, minY: 5, maxY: 95 },
      viewport
    )).toBe(true);
    expect(areBoundsInView(
      { minX: -10, maxX: 95, minY: 5, maxY: 95 },
      viewport
    )).toBe(false);
  });

  it('surfaces unexpected viewport bounds failures', () => {
    const error = new Error('getBounds failed');
    const viewport = {
      getBounds: () => {
        throw error;
      },
    };

    expect(() => areBoundsInView(
      { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      viewport
    )).toThrow(error);
  });
});

describe('expandBoundsForLabels', () => {
  it('returns original bounds when there are no labels', () => {
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 20 };

    expect(expandBoundsForLabels(bounds, [])).toBe(bounds);
  });

  it('expands bounds using label text length and size', () => {
    expect(expandBoundsForLabels(
      { minX: 0, maxX: 10, minY: 0, maxY: 20 },
      [{ position: [0, 0, 0], text: 'abc' }],
      10
    )).toEqual({
      minX: -18,
      maxX: 28,
      minY: -12,
      maxY: 32,
    });
  });

  it('surfaces unexpected label-size failures', () => {
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 20 };
    const error = new Error('label size failed');

    expect(() => expandBoundsForLabels(
      bounds,
      [{ position: [0, 0, 0], text: 'abc' }],
      undefined,
      () => {
        throw error;
      }
    )).toThrow(error);
  });
});
