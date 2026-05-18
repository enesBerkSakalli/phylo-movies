import { describe, expect, it } from 'vitest';
import {
  TIMELINE_AXIS,
  TIMELINE_AXIS_TYPE,
  getTimelineAxis,
  isKnownTimelineAxis,
} from '../../../src/timeline/time/TimelineAxis.js';
import { TimelinePoint } from '../../../src/timeline/time/TimelinePoint.js';
import {
  TimelineInterval,
  TIMELINE_HOLD_KIND,
  TIMELINE_INTERVAL_TYPE,
} from '../../../src/timeline/time/TimelineInterval.js';
import { TimelineContext } from '../../../src/timeline/time/TimelineContext.js';
import { PlaybackCursor } from '../../../src/timeline/time/PlaybackCursor.js';
import { TransitionFrame } from '../../../src/timeline/time/TransitionFrame.js';

describe('timeline time domain', () => {
  it('defines named axes with explicit time types', () => {
    expect(getTimelineAxis(TIMELINE_AXIS.FRAME_INDEX)).toMatchObject({
      name: 'frame_index',
      type: TIMELINE_AXIS_TYPE.SEQUENCE,
    });
    expect(getTimelineAxis(TIMELINE_AXIS.MOVIE_TIME_MS)).toMatchObject({
      name: 'movie_time_ms',
      type: TIMELINE_AXIS_TYPE.DURATION_MS,
    });
    expect(getTimelineAxis(TIMELINE_AXIS.TIMELINE_PROGRESS)).toMatchObject({
      name: 'timeline_progress',
      type: TIMELINE_AXIS_TYPE.NORMALIZED,
    });
    expect(isKnownTimelineAxis('unknown_axis')).toBe(false);
  });

  it('stores multiple axis values in an immutable timeline point', () => {
    const point = TimelinePoint.from({
      [TIMELINE_AXIS.FRAME_INDEX]: 3,
      [TIMELINE_AXIS.PAIR_STEP]: 2,
      unknown_axis: 'kept-for-roundtrip',
    });
    const updated = point.with(TIMELINE_AXIS.MOVIE_TIME_MS, 1200);

    expect(point.get(TIMELINE_AXIS.MOVIE_TIME_MS)).toBeUndefined();
    expect(updated.get(TIMELINE_AXIS.MOVIE_TIME_MS)).toBe(1200);
    expect(updated.knownValues()).toEqual({
      [TIMELINE_AXIS.FRAME_INDEX]: 3,
      [TIMELINE_AXIS.PAIR_STEP]: 2,
      [TIMELINE_AXIS.MOVIE_TIME_MS]: 1200,
    });
  });

  it('constructs timing intervals without changing the segment timing wire format', () => {
    expect(TimelineInterval.motion({
      fromIndex: 1,
      toIndex: 2,
      durationMs: 1000,
    })).toEqual({
      type: TIMELINE_INTERVAL_TYPE.MOTION,
      fromIndex: 1,
      toIndex: 2,
      durationMs: 1000,
    });
    expect(TimelineInterval.hold({
      holdIndex: 2,
      holdKind: TIMELINE_HOLD_KIND.MOVER,
      durationMs: 200,
    })).toEqual({
      type: TIMELINE_INTERVAL_TYPE.HOLD,
      holdIndex: 2,
      holdKind: 'mover',
      durationMs: 200,
    });
  });

  it('creates fixed contexts that can carry independent playback cursors', () => {
    const cursor = PlaybackCursor.fromTransitionFrame(TransitionFrame.from({
      sourceTreeIndex: 1,
      targetTreeIndex: 1,
      transitionProgress: 0,
      holdKind: TIMELINE_HOLD_KIND.MOVER,
    }, {
      timelineProgress: 0.25,
    }), {
      treeCount: 4,
    });
    const context = TimelineContext.fixed({
      start: 0,
      end: 4100,
    }).withCursor(cursor);

    expect(context.contains(1100)).toBe(true);
    expect(context.contains(5000)).toBe(false);
    expect(context.toJSON()).toMatchObject({
      mode: 'fixed',
      axis: TIMELINE_AXIS.MOVIE_TIME_MS,
      cursor: {
        animationProgress: 1 / 3,
        timelineProgress: 0.25,
        currentTreeIndex: 1,
        holdKind: 'mover',
      },
    });
  });

  it('normalizes store playheads into cursor-shaped state without inventing timeline progress', () => {
    const cursor = PlaybackCursor.fromPlayhead({
      animationProgress: 1.4,
      timelineProgress: null,
      currentTreeIndex: 2.8,
    });

    expect(cursor.currentTreeIndex).toBe(2);
    expect(cursor.toPlayhead()).toEqual({
      animationProgress: 1,
      timelineProgress: null,
    });
    expect(cursor.point.toJSON()).toEqual({
      [TIMELINE_AXIS.FRAME_INDEX]: 2,
    });
  });
});
