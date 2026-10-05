import { describe, expect, it } from 'vitest';
import { followRange, panRange, zoomRange } from '../../../../src/timeline/math/coordinateUtils.js';

const total = 10000;

describe('panRange', () => {
  it('moves the range and keeps its span', () => {
    expect(panRange(2000, 4000, total, 500)).toEqual([2500, 4500]);
    expect(panRange(2000, 4000, total, -500)).toEqual([1500, 3500]);
  });

  it('stops at both ends of the timeline', () => {
    expect(panRange(2000, 4000, total, -5000)).toEqual([0, 2000]);
    expect(panRange(2000, 4000, total, 99999)).toEqual([8000, 10000]);
  });

  it('cannot move a range that shows everything', () => {
    expect(panRange(0, total, total, 500)).toEqual([0, total]);
  });
});

describe('zoomRange', () => {
  // Where the anchor sits in the view, 0 = left edge, 1 = right edge
  const place = ([start, end], ms) => (ms - start) / (end - start);

  it('keeps the anchor where it is in the view', () => {
    for (const anchor of [3000, 4000, 5500]) {
      const before = [3000, 6000];
      const zoomedIn = zoomRange(...before, total, 0.8, anchor);
      expect(zoomedIn[1] - zoomedIn[0]).toBeCloseTo(2400);
      expect(place(zoomedIn, anchor)).toBeCloseTo(place(before, anchor));
      const zoomedOut = zoomRange(...before, total, 1.2, anchor);
      expect(place(zoomedOut, anchor)).toBeCloseTo(place(before, anchor));
    }
  });

  it('zooms about the middle of a range that shows everything', () => {
    expect(zoomRange(0, total, total, 0.8, 5000)).toEqual([1000, 9000]);
  });

  it('never shows more than the timeline or less than 1 ms, and stays inside it', () => {
    expect(zoomRange(1000, 9000, total, 5, 500)).toEqual([0, total]);
    const [start, end] = zoomRange(5000, 5002, total, 0.1, 5001);
    expect(end - start).toBe(1);
    // The anchor at the edge cannot hold its place without leaving the timeline
    const [edgeStart, edgeEnd] = zoomRange(0, 4000, total, 1.2, 0);
    expect([edgeStart, edgeEnd]).toEqual([0, 4800]);
  });
});

describe('followRange', () => {
  const view = [4000, 6000];

  it('leaves the view alone while the playhead stays in it', () => {
    expect(followRange(...view, total, 4500, 5900)).toEqual(view);
  });

  it('pages once when the playhead crosses an edge, landing a tenth in from it', () => {
    const [start, end] = followRange(...view, total, 5990, 6010);
    expect(start).toBeCloseTo(6010 - 200);
    expect(end - start).toBeCloseTo(2000);
    // And the next steps are inside the new page: no more moves
    expect(followRange(start, end, total, 6010, 6200)).toEqual([start, end]);
  });

  it('pages back when the playhead leaves by the left edge', () => {
    const [start, end] = followRange(...view, total, 4010, 3990);
    expect(start).toBeCloseTo(3990 - 1800);
    expect(end - start).toBeCloseTo(2000);
  });

  it('does not chase a playhead that was already out of view', () => {
    expect(followRange(...view, total, 8000, 8100)).toEqual(view);
  });

  it('stays inside the timeline', () => {
    expect(followRange(8000, 10000, total, 9990, 10000)).toEqual([8000, 10000]);
    expect(followRange(0, 2000, total, 10, -5)).toEqual([0, 2000]);
  });
});
