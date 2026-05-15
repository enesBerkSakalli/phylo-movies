import { describe, expect, it } from 'vitest';
import * as spatialBounds from '../src/treeVisualisation/spatial/bounds.js';

const {
  areBoundsInView,
  calculateViewportBoundsPadding,
  estimateLabelBoundsPadding,
  expandBoundsForLabels,
  resolveLabelBoundsSize
} = spatialBounds;

describe('areBoundsInView', () => {
  it('calculates viewport bounds padding from bounds and padding factor', () => {
    expect(typeof calculateViewportBoundsPadding).toBe('function');
    expect(calculateViewportBoundsPadding([10, 20, 110, 220], 1.5)).toEqual({
      x: 25,
      y: 50,
    });
    expect(calculateViewportBoundsPadding([10, 20, 110, 220], 1)).toEqual({
      x: 0,
      y: 0,
    });
  });

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
  it('exports named label bounds heuristic constants', () => {
    expect(spatialBounds.LABEL_BOUNDS_CHAR_WIDTH_RATIO).toBe(0.6);
    expect(spatialBounds.LABEL_BOUNDS_LINE_HEIGHT_RATIO).toBe(1.2);
    expect(spatialBounds.LABEL_BOUNDS_MAX_WIDTH_PX).toBe(2000);
    expect(spatialBounds.LABEL_BOUNDS_DEFAULT_SIZE_PX).toBe(16);
  });

  it('resolves label bounds size from explicit size, provider, then default', () => {
    expect(typeof resolveLabelBoundsSize).toBe('function');
    expect(resolveLabelBoundsSize(12, () => {
      throw new Error('provider should not be called');
    })).toBe(12);
    expect(resolveLabelBoundsSize(undefined, () => 14)).toBe(14);
    expect(resolveLabelBoundsSize(undefined, null)).toBe(spatialBounds.LABEL_BOUNDS_DEFAULT_SIZE_PX);
  });

  it('estimates label bounds padding from longest label and size', () => {
    expect(typeof estimateLabelBoundsPadding).toBe('function');
    expect(estimateLabelBoundsPadding(
      [{ text: 'abc' }, { text: 'abcdef' }],
      10
    )).toEqual({
      width: 36,
      height: 12,
    });
  });

  it('caps estimated label bounds padding width', () => {
    expect(estimateLabelBoundsPadding(
      [{ text: 'x'.repeat(400) }],
      10
    )).toEqual({
      width: spatialBounds.LABEL_BOUNDS_MAX_WIDTH_PX,
      height: 12,
    });
  });

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

  it('caps estimated label width at the named maximum', () => {
    expect(expandBoundsForLabels(
      { minX: 0, maxX: 10, minY: 0, maxY: 20 },
      [{ position: [0, 0, 0], text: 'x'.repeat(400) }],
      10
    )).toEqual({
      minX: -spatialBounds.LABEL_BOUNDS_MAX_WIDTH_PX,
      maxX: 10 + spatialBounds.LABEL_BOUNDS_MAX_WIDTH_PX,
      minY: -12,
      maxY: 32,
    });
  });

  it('uses the named default label size when no size is provided', () => {
    expect(expandBoundsForLabels(
      { minX: 0, maxX: 10, minY: 0, maxY: 20 },
      [{ position: [0, 0, 0], text: 'abc' }]
    )).toEqual({
      minX: -28.799999999999997,
      maxX: 38.8,
      minY: -19.2,
      maxY: 39.2,
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
