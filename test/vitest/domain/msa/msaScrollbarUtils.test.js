import { describe, expect, it } from 'vitest';
import {
  calculateScrollbarGeometry,
  getKeyboardScrollTarget,
  getTrackClickTarget,
} from '../../../../src/components/msa/scrollbarUtils.js';
import { getCenteredViewState } from '../../../../src/msaViewer/cameraUtils.js';
import { getVisibleRange } from '../../../../src/msaViewer/viewportUtils.js';

describe('MSA scrollbar utilities', () => {
  it('calculates capped thumb geometry from visible range', () => {
    expect(
      calculateScrollbarGeometry({
        rows: 100,
        cols: 100,
        visibleRange: { r0: 95, r1: 99, c0: 95, c1: 99 },
      })
    ).toMatchObject({
      hThumbWidth: 10,
      hThumbLeft: 90,
      vThumbHeight: 10,
      vThumbTop: 90,
    });
  });

  it('returns empty geometry when data is unavailable', () => {
    expect(
      calculateScrollbarGeometry({
        rows: 0,
        cols: 0,
        visibleRange: null,
      })
    ).toEqual({
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
    expect(
      getTrackClickTarget({
        pointerClientPosition: 200,
        trackStart: 0,
        trackSize: 200,
        itemCount: 100,
      })
    ).toBe(99);

    expect(
      getTrackClickTarget({
        pointerClientPosition: -20,
        trackStart: 0,
        trackSize: 200,
        itemCount: 100,
      })
    ).toBe(0);
  });

  it('maps keyboard input to horizontal scroll targets', () => {
    const context = {
      axis: 'horizontal',
      key: 'PageDown',
      rangeStart: 10,
      rangeEnd: 19,
      itemCount: 100,
    };

    expect(getKeyboardScrollTarget(context)).toBe(24.5);
    expect(getKeyboardScrollTarget({ ...context, key: 'Home' })).toBe(0);
    expect(getKeyboardScrollTarget({ ...context, key: 'End' })).toBe(99);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowLeft' })).toBe(13.5);
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

    expect(getKeyboardScrollTarget(context)).toBe(4.5);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowDown' })).toBe(15.5);
    expect(getKeyboardScrollTarget({ ...context, key: 'ArrowRight' })).toBeNull();
  });

  it('moves the rendered viewport right when ArrowRight is pressed', () => {
    const layout = {
      containerWidth: 240,
      containerHeight: 240,
      labelsWidth: 72,
      axisHeight: 24,
    };
    const currentViewState = { target: [612, 60, 0], zoom: 0 };
    const before = getVisibleRange(currentViewState, layout, 12, 10, 100);
    const column = getKeyboardScrollTarget({
      axis: 'horizontal',
      key: 'ArrowRight',
      rangeStart: before.c0,
      rangeEnd: before.c1,
      itemCount: 100,
    });
    const nextViewState = getCenteredViewState({
      currentViewState,
      cellSize: 12,
      column,
    });
    const after = getVisibleRange(nextViewState, layout, 12, 10, 100);

    expect(after.c0).toBeGreaterThan(before.c0);
  });
});
