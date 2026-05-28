import { describe, expect, it } from 'vitest';
import {
  buildSeriesPoints,
  findActiveInputTreeIndex,
  resolveActivePointIndex,
  resolveCursorX,
  resolveNavigationTarget,
} from '../../src/components/DistanceChart/distanceChartModel.js';
import { DISTANCE_CHART_METRIC_OPTIONS } from '../../src/components/DistanceChart/distanceChartLanguage.js';

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
      weighted_robinson_foulds: 1.5,
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
  it('names selector options with the metric normalization visible', () => {
    expect(DISTANCE_CHART_METRIC_OPTIONS.map(({ value, label }) => [value, label])).toEqual([
      ['rfd', 'Normalized RF'],
      ['w-rfd', 'Raw Weighted RF'],
      ['scale', 'Raw Tree Size'],
    ]);
  });

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
    const { points, yMax } = buildSeriesPoints('rfd', pairMetrics, [], pairs);

    expect(points.map((point) => point.contextLabel)).toEqual([
      'Tree 8 -> 9',
      'Tree 9 -> 10',
    ]);
    expect(yMax).toBe(1);
    expect(points[0]).toMatchObject({
      pairId: 'pair-a',
      sourceInputTreeIndex: 7,
      targetInputTreeIndex: 8,
      sourceFrameIndex: 10,
      y: 0.1,
    });
  });

  it('uses genome-window coordinates for distance points when MSA context exists', () => {
    const { points } = buildSeriesPoints('rfd', pairMetrics, [], pairs, {
      hasMsa: true,
      msaStepSize: 50,
      msaWindowSize: 100,
      msaColumnCount: 1000,
    });

    expect(points.map((point) => point.x)).toEqual([376, 426]);
    expect(points.map((point) => point.contextLabel)).toEqual([
      'Tree 8 -> 9; genome windows 301-400 -> 351-450',
      'Tree 9 -> 10; genome windows 351-450 -> 401-500',
    ]);
    expect(points[0].sourceWindow).toEqual({
      startPosition: 301,
      midPosition: 351,
      endPosition: 400,
    });
    expect(points[0].targetWindow).toEqual({
      startPosition: 351,
      midPosition: 401,
      endPosition: 450,
    });
  });

  it('keeps raw weighted RF values above one and auto-scales the axis', () => {
    const { points, yMax } = buildSeriesPoints('w-rfd', pairMetrics, [], pairs);

    expect(points.map((point) => point.y)).toEqual([1.1, 1.5]);
    expect(points[1]).toMatchObject({
      pairId: 'pair-b',
      contextLabel: 'Tree 9 -> 10',
      y: 1.5,
    });
    expect(yMax).toBe('auto');
  });

  it('keeps raw tree-size values above one and auto-scales the axis', () => {
    const { points, yMax } = buildSeriesPoints(
      'scale',
      pairMetrics,
      [
        { index: 0, value: 0.75 },
        { index: 10, value: 1.5 },
      ],
      pairs
    );

    expect(points.map((point) => point.y)).toEqual([0.75, 1.5]);
    expect(points[1]).toMatchObject({
      contextLabel: 'Input tree 2',
      frameIndex: 10,
      y: 1.5,
    });
    expect(yMax).toBe('auto');
  });

  it('uses genome-window midpoint coordinates for scale points when MSA context exists', () => {
    const { points } = buildSeriesPoints(
      'scale',
      pairMetrics,
      [
        { index: 0, value: 0.75 },
        { index: 10, value: 1.5 },
      ],
      pairs,
      {
        hasMsa: true,
        msaStepSize: 50,
        msaWindowSize: 100,
        msaColumnCount: 1000,
      }
    );

    expect(points.map((point) => point.x)).toEqual([1, 51]);
    expect(points.map((point) => point.contextLabel)).toEqual([
      'Input tree 1; genome window 1-50',
      'Input tree 2; genome window 1-100',
    ]);
  });

  it('keeps distance point values aligned to pair order when metric rows are unordered', () => {
    const unorderedPairMetrics = {
      ...pairMetrics,
      rows: [pairMetrics.rows[1], pairMetrics.rows[0]],
    };

    const { points } = buildSeriesPoints('rfd', unorderedPairMetrics, [], pairs);

    expect(points.map((point) => point.pairId)).toEqual(['pair-a', 'pair-b']);
    expect(points.map((point) => point.y)).toEqual([0.1, 0.4]);
  });

  it('resolves the active distance point from input-tree ordinals, not frame indices', () => {
    const { points } = buildSeriesPoints('rfd', pairMetrics, [], pairs);

    expect(
      resolveActivePointIndex(
        'rfd',
        { sourceInputTreeIndex: 8, sourceFrameIndex: 12 },
        [10, 12, 20],
        points
      )
    ).toBe(1);
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
