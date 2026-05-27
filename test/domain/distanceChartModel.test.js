import { describe, expect, it } from 'vitest';
import {
  buildSeriesPoints,
  findActiveInputTreeIndex,
  resolveActivePointIndex,
  resolveCursorX,
  resolveNavigationTarget,
} from '../../src/components/DistanceChart/distanceChartModel.js';

const pairMetrics = {
  rows: [
    {
      pair_id: 'pair-a',
      pair_ordinal: 0,
      robinson_foulds: 0.1,
      weighted_robinson_foulds: 1.1,
    },
    {
      pair_id: 'pair-b',
      pair_ordinal: 1,
      robinson_foulds: 0.4,
      weighted_robinson_foulds: 1.4,
    },
  ],
  semantics: {},
};

const pairs = [
  {
    pair_id: 'pair-a',
    pair_ordinal: 0,
    source_input_tree_index: 7,
    target_input_tree_index: 8,
    source_frame_index: 10,
    target_frame_index: 12,
  },
  {
    pair_id: 'pair-b',
    pair_ordinal: 1,
    source_input_tree_index: 8,
    target_input_tree_index: 9,
    source_frame_index: 12,
    target_frame_index: 20,
  },
];

describe('distanceChartModel', () => {
  it('keeps scale point display order separate from input tree navigation target', () => {
    const { points } = buildSeriesPoints(
      'scale',
      pairMetrics,
      [
        { index: 0, value: 12 },
        { index: 10, value: 18 },
        { index: 20, value: 15 },
      ],
      pairs
    );

    expect(points.map((point) => point.x)).toEqual([1, 2, 3]);
    expect(points.map((point) => point.frameIndex)).toEqual([0, 10, 20]);
    expect(points.map((point) => point.contextLabel)).toEqual([
      'Input tree 1',
      'Input tree 2',
      'Input tree 3',
    ]);
    expect(resolveNavigationTarget('scale', points[1])).toEqual({
      frameIndex: 10,
    });
  });

  it('labels distance points from normalized pair metrics and pair rows', () => {
    const { points } = buildSeriesPoints('rfd', pairMetrics, [], pairs);

    expect(points.map((point) => point.contextLabel)).toEqual([
      'source input tree 8 to target input tree 9',
      'source input tree 9 to target input tree 10',
    ]);
    expect(points[0]).toMatchObject({
      pairId: 'pair-a',
      sourceInputTreeIndex: 7,
      targetInputTreeIndex: 8,
      sourceFrameIndex: 10,
      y: 0.1,
    });
  });

  it('resolves the scale cursor from input tree indices instead of chart ordinals', () => {
    const { points } = buildSeriesPoints(
      'scale',
      pairMetrics,
      [
        { index: 0, value: 12 },
        { index: 10, value: 18 },
        { index: 20, value: 15 },
      ],
      pairs
    );

    const activePointIndex = resolveActivePointIndex('scale', { sourceFrameIndex: 10 }, [], points);

    expect(activePointIndex).toBe(1);
    expect(resolveCursorX(points, activePointIndex)).toBe(2);
  });

  it('names active observed-tree lookup as input-tree lookup', () => {
    expect(findActiveInputTreeIndex([0, 3, 5], 4)).toBe(1);
  });

  it('returns the pair source frame directly for distance chart navigation', () => {
    const { points } = buildSeriesPoints('rfd', pairMetrics, [], pairs);
    expect(resolveNavigationTarget('rfd', points[1])).toEqual({
      frameIndex: 12,
    });
  });
});
