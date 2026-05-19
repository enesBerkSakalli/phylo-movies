import { describe, expect, it, vi } from 'vitest';
import {
  buildSeriesPoints,
  findActiveInputTreeIndex,
  resolveActivePointIndex,
  resolveCursorX,
  resolveNavigationTarget,
} from '../../src/components/DistanceChart/distanceChartModel.js';

describe('distanceChartModel', () => {
  it('keeps scale point display order separate from input tree navigation target', () => {
    const { points } = buildSeriesPoints('scale', [], [], [
      { index: 0, value: 12 },
      { index: 10, value: 18 },
      { index: 20, value: 15 },
    ]);

    expect(points.map((point) => point.x)).toEqual([1, 2, 3]);
    expect(points.map((point) => point.frameIndex)).toEqual([0, 10, 20]);
    expect(points.map((point) => point.contextLabel)).toEqual([
      'Input tree 1',
      'Input tree 2',
      'Input tree 3',
    ]);
    const movieTimelineManager = {
      getTimelineProgressForFrameIndex: vi.fn(() => 0.42),
    };

    expect(resolveNavigationTarget('scale', points[1], null, movieTimelineManager)).toEqual({
      frameIndex: 10,
      seekOptions: { timelineProgress: 0.42 },
    });
  });

  it('labels distance points from pair interpolation ranges when available', () => {
    const { points } = buildSeriesPoints('rfd', [0.1], [], [], [[7, 8]]);

    expect(points.map((point) => point.contextLabel)).toEqual([
      'source input tree 8 to target input tree 9',
    ]);
    expect(points[0]).toMatchObject({
      sourceInputTreeIndex: 7,
      targetInputTreeIndex: 8,
    });
  });

  it('resolves the scale cursor from input tree indices instead of chart ordinals', () => {
    const { points } = buildSeriesPoints('scale', [], [], [
      { index: 0, value: 12 },
      { index: 10, value: 18 },
      { index: 20, value: 15 },
    ]);

    const activePointIndex = resolveActivePointIndex('scale', 10, [], points);

    expect(activePointIndex).toBe(1);
    expect(resolveCursorX(points, activePointIndex)).toBe(2);
  });

  it('names active observed-tree lookup as input-tree lookup', () => {
    expect(findActiveInputTreeIndex([0, 3, 5], 4)).toBe(1);
  });

  it('returns frame-index plus timeline seek options for distance chart navigation', () => {
    const { points } = buildSeriesPoints('rfd', [0.1, 0.4], [], [], [[7, 8], [8, 9]]);
    const transitionResolver = {
      getTreeIndexForDistanceIndex: vi.fn((index) => index === 1 ? 12 : 0),
    };
    const movieTimelineManager = {
      getTimelineProgressForFrameIndex: vi.fn(() => 0.65),
    };

    expect(resolveNavigationTarget('rfd', points[1], transitionResolver, movieTimelineManager)).toEqual({
      frameIndex: 12,
      seekOptions: { timelineProgress: 0.65 },
    });
    expect(transitionResolver.getTreeIndexForDistanceIndex).toHaveBeenCalledWith(1);
    expect(movieTimelineManager.getTimelineProgressForFrameIndex).toHaveBeenCalledWith(12);
  });
});
