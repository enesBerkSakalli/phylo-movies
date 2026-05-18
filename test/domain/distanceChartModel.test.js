import { describe, expect, it, vi } from 'vitest';
import {
  buildSeriesPoints,
  resolveActivePointIndex,
  resolveCursorX,
  resolveNavigationTarget,
} from '../../src/components/DistanceChart/distanceChartModel.js';

describe('distanceChartModel', () => {
  it('keeps scale point display order separate from source tree navigation target', () => {
    const { points } = buildSeriesPoints('scale', [], [], [
      { index: 0, value: 12 },
      { index: 10, value: 18 },
      { index: 20, value: 15 },
    ]);

    expect(points.map((point) => point.x)).toEqual([1, 2, 3]);
    expect(points.map((point) => point.treeIndex)).toEqual([0, 10, 20]);
    expect(points.map((point) => point.contextLabel)).toEqual([
      'Source tree 1',
      'Source tree 2',
      'Source tree 3',
    ]);
    expect(resolveNavigationTarget('scale', points[1], null)).toBe(10);
  });

  it('labels distance points as source-tree comparisons', () => {
    const { points } = buildSeriesPoints('rfd', [0.1, 0.4], [], []);

    expect(points.map((point) => point.contextLabel)).toEqual([
      'Source trees 1 to 2',
      'Source trees 2 to 3',
    ]);
  });

  it('resolves the scale cursor from source tree indices instead of chart ordinals', () => {
    const { points } = buildSeriesPoints('scale', [], [], [
      { index: 0, value: 12 },
      { index: 10, value: 18 },
      { index: 20, value: 15 },
    ]);

    const activePointIndex = resolveActivePointIndex('scale', 10, [], points);

    expect(activePointIndex).toBe(1);
    expect(resolveCursorX(points, activePointIndex)).toBe(2);
  });

  it('keeps distance chart navigation delegated to the transition resolver', () => {
    const { points } = buildSeriesPoints('rfd', [0.1, 0.4], [], []);
    const transitionResolver = {
      getTreeIndexForDistanceIndex: vi.fn((index) => index === 1 ? 12 : 0),
    };

    expect(resolveNavigationTarget('rfd', points[1], transitionResolver)).toBe(12);
    expect(transitionResolver.getTreeIndexForDistanceIndex).toHaveBeenCalledWith(1);
  });
});
