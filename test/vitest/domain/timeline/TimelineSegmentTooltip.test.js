import { describe, expect, it } from 'vitest';
import {
  clampTooltipLeft,
  extractAffectedSubtreeGroups,
  formatPairFacts,
  formatPivotEdgePreview,
  formatTransitionHeading,
  getSegmentStepRange,
  getSplitEventPosition,
} from '../../../../src/components/timeline/timelineSegmentTooltipUtils.js';

describe('TimelineSegmentTooltip subtree extraction', () => {
  it('extracts leaf names from both flat and nested affected subtree groups', () => {
    const getLeafNames = (indices) => indices.map((index) => `Leaf ${index}`);

    expect(extractAffectedSubtreeGroups([[9, 10, 11]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
    expect(extractAffectedSubtreeGroups([[[9, 10, 11]]], getLeafNames)).toEqual([
      ['Leaf 9', 'Leaf 10', 'Leaf 11'],
    ]);
  });

  it('formats compact pivot edge previews', () => {
    expect(formatPivotEdgePreview([1, 2, 4])).toBe('1, 2, 4');
    expect(formatPivotEdgePreview([1, 2, 4, 5, 6, 7])).toBe('1, 2, 4, 5 +2');
    expect(formatPivotEdgePreview([])).toBeNull();
    expect(formatPivotEdgePreview(null)).toBeNull();
  });
});

const transition = {
  pairOrdinal: 2,
  sourceInputTreeIndex: 2,
  targetInputTreeIndex: 3,
  sourceGlobalIndex: 10,
  targetGlobalIndex: 22,
  globalStart: 11,
  globalEnd: 21,
  localStepStart: 0,
};

describe('TimelineSegmentTooltip transition wording', () => {
  it('names the transition by its pair and 1-based trees', () => {
    expect(formatTransitionHeading(transition, 199)).toBe('Transition 3 of 199 · Tree 3 → 4');
  });

  it('summarises RF and the SPR moves of a topology pair', () => {
    expect(
      formatPairFacts({
        kind: 'topology',
        rf: 4,
        weightedRf: 0.5333,
        sprMoveCount: 2,
        movedTaxaCount: 5,
      })
    ).toEqual({ metrics: 'RF 4.00 · weighted RF 0.53', change: '2 SPR moves · 5 taxa moved' });
    expect(
      formatPairFacts({
        kind: 'topology',
        rf: 1,
        weightedRf: 1,
        sprMoveCount: 1,
        movedTaxaCount: 1,
      }).change
    ).toBe('1 SPR move · 1 taxon moved');
  });

  it('says so when a pair only changes branch lengths or not at all', () => {
    const base = { rf: 0, weightedRf: 0.25, sprMoveCount: 0, movedTaxaCount: 0 };
    expect(formatPairFacts({ ...base, kind: 'branch-lengths' }).change).toBe('Branch lengths only');
    expect(formatPairFacts({ ...base, weightedRf: 0, kind: 'unchanged' }).change).toBe('No change');
    expect(formatPairFacts(undefined)).toBeNull();
  });
});

describe('TimelineSegmentTooltip step numbering', () => {
  it('counts a split-event segment in 1-based steps of its pair', () => {
    expect(getSegmentStepRange(transition)).toEqual({ start: 1, end: 11, total: 11 });
    expect(getSegmentStepRange({ ...transition, globalStart: 15, globalEnd: 18 })).toEqual({
      start: 5,
      end: 8,
      total: 11,
    });
  });

  it('starts a fulfillment segment after the frame the previous segment ended on', () => {
    expect(
      getSegmentStepRange({ ...transition, localStepStart: null, globalStart: 15, globalEnd: 22 })
    ).toEqual({ start: 6, end: 11, total: 11 });
  });

  it('has no steps when the pair generates no frames', () => {
    expect(
      getSegmentStepRange({ ...transition, targetGlobalIndex: 11, globalStart: 10, globalEnd: 11 })
    ).toBeNull();
  });

  it('places a segment among its pair split events only when there are several', () => {
    const events = [
      { event_type: 'split_change', pair_id: 'p', frame_range: [1, 5] },
      { event_type: 'spr_move', pair_id: 'p', frame_range: [1, 5] },
      { event_type: 'split_change', pair_id: 'p', frame_range: [6, 9] },
      { event_type: 'split_change', pair_id: 'q', frame_range: [20, 25] },
    ];
    expect(getSplitEventPosition({ pairId: 'p', globalStart: 6 }, events)).toEqual({
      index: 2,
      count: 2,
    });
    expect(getSplitEventPosition({ pairId: 'q', globalStart: 20 }, events)).toBeNull();
  });
});

describe('TimelineSegmentTooltip placement', () => {
  it('follows the pointer and stays 8px inside the viewport', () => {
    expect(clampTooltipLeft(500, 300, 1000)).toBe(350);
    expect(clampTooltipLeft(20, 300, 1000)).toBe(8);
    expect(clampTooltipLeft(990, 300, 1000)).toBe(692);
    expect(clampTooltipLeft(100, 500, 375)).toBe(8);
  });
});
