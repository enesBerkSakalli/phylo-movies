import { describe, expect, it } from 'vitest';
import * as spatialBounds from '../src/treeVisualisation/spatial/bounds.js';

const {
  areBoundsInView,
  calculateViewportBoundsPadding,
  isBoundsInsidePaddedViewport,
  resolveLabelBoundsSize,
} = spatialBounds;

describe('viewport bounds helpers', () => {
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

  it('checks whether bounds sit inside a padded viewport', () => {
    expect(typeof isBoundsInsidePaddedViewport).toBe('function');

    const viewBounds = [0, 0, 100, 100];
    const padding = { x: 10, y: 20 };

    expect(
      isBoundsInsidePaddedViewport(
        { minX: -10, maxX: 110, minY: -20, maxY: 120 },
        viewBounds,
        padding
      )
    ).toBe(true);
    expect(
      isBoundsInsidePaddedViewport(
        { minX: -11, maxX: 110, minY: -20, maxY: 120 },
        viewBounds,
        padding
      )
    ).toBe(false);
  });
});

describe('areBoundsInView', () => {
  it('returns false when no viewport bounds API is available', () => {
    expect(areBoundsInView({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, null)).toBe(false);
  });

  it('checks bounds against padded viewport bounds', () => {
    const viewport = {
      getBounds: () => [0, 0, 100, 100],
    };

    expect(areBoundsInView({ minX: 5, maxX: 95, minY: 5, maxY: 95 }, viewport)).toBe(true);
    expect(areBoundsInView({ minX: -10, maxX: 95, minY: 5, maxY: 95 }, viewport)).toBe(false);
  });

  it('surfaces unexpected viewport bounds failures', () => {
    const error = new Error('getBounds failed');
    const viewport = {
      getBounds: () => {
        throw error;
      },
    };

    expect(() => areBoundsInView({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, viewport)).toThrow(error);
  });
});

describe('label bounds constants', () => {
  it('exports named label bounds heuristic constants', () => {
    expect(spatialBounds.LABEL_BOUNDS_CHAR_WIDTH_RATIO).toBe(0.6);
    expect(spatialBounds.LABEL_BOUNDS_LINE_HEIGHT_RATIO).toBe(1.2);
    expect(spatialBounds.LABEL_BOUNDS_MAX_WIDTH_PX).toBe(2000);
    expect(spatialBounds.LABEL_BOUNDS_DEFAULT_SIZE_PX).toBe(16);
  });
});
describe('label bounds size helper', () => {
  it('resolves label bounds size from explicit size, provider, then default', () => {
    expect(typeof resolveLabelBoundsSize).toBe('function');
    expect(
      resolveLabelBoundsSize(12, () => {
        throw new Error('provider should not be called');
      })
    ).toBe(12);
    expect(
      resolveLabelBoundsSize(0, () => {
        throw new Error('provider should not be called');
      })
    ).toBe(0);
    expect(resolveLabelBoundsSize(undefined, () => 14)).toBe(14);
    expect(resolveLabelBoundsSize(null, () => 14)).toBe(14);
    expect(resolveLabelBoundsSize(undefined, null)).toBe(
      spatialBounds.LABEL_BOUNDS_DEFAULT_SIZE_PX
    );
  });
});
