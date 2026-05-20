import { describe, expect, it } from 'vitest';
import {
  calculateScrollbarGeometry,
  getKeyboardScrollTarget,
  getTrackClickTarget,
} from '../../../src/components/msa/scrollbarUtils.js';

describe('MSA scrollbar utilities', () => {
  it('calculates capped thumb geometry from visible range', () => {
    expect(calculateScrollbarGeometry({
      rows: 100,
      cols: 100,
      visibleRange: { r0: 95, r1: 99, c0: 95, c1: 99 },
    })).toMatchObject({
      hThumbWidth: 10,
      hThumbLeft: 90,
      vThumbHeight: 10,
      vThumbTop: 90,
    });
  });

  it('returns empty geometry when data is unavailable', () => {
    expect(calculateScrollbarGeometry({
      rows: 0,
      cols: 0,
      visibleRange: null,
    })).toEqual({
      rows: 0,
      cols: 0,
      r0: 0,
      r1: 0,
      c0: 0,
      c1: 0,
      hThumbWidth: 0,
      hThumbLeft: 0,
      vThumbHeight: 0,
      vThumbTop: 0,
    });
  });

  it('maps track click position to a clamped zero-based index', () => {
    expect(getTrackClickTarget({
      pointerClientPosition: 200,
      trackStart: 0,
      trackSize: 200,
      itemCount: 100,
    })).toBe(99);

    expect(getTrackClickTarget({
      pointerClientPosition: -20,
      trackStart: 0,
      trackSize: 200,
      itemCount: 100,
    })).toBe(0);
  });

  it('maps keyboard input to horizontal scroll targets', () => {
    const context = {
      axis: 'horizontal',
      key: 'PageDown',
      rangeStart: 10,
      rangeEnd: 19,
      itemCount: 100,
    };

    expect(getKeyboardScrollTarget(context)).toBe(20);
    expect(getKeyboardScrollTarget({ ...context, key: 'Home' })).toBe(0);
    expect(getKeyboardScrollTarget({ ...context, key: 'End' })).toBe(99);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowLeft' })).toBe(9);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowUp' })).toBeNull();
  });

  it('maps keyboard input to vertical scroll targets', () => {
    const context = {
      axis: 'vertical',
      key: 'PageUp',
      rangeStart: 10,
      rangeEnd: 19,
      itemCount: 100,
    };

    expect(getKeyboardScrollTarget(context)).toBe(0);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowDown' })).toBe(11);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowRight' })).toBeNull();
  });
});
