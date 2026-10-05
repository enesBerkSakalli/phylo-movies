import { describe, expect, it } from 'vitest';
import {
  extractAffectedSubtreeGroups,
  formatPairFacts,
  formatPivotEdgePreview,
  formatSubtreeNames,
  formatTransitionHeading,
  getSegmentStepRange,
} from '../../../../src/components/timeline/timelineSegmentTooltipUtils.js';

describe('TimelineSegmentTooltip subtree extraction', () => {
  const leafNames = ['Leaf 0', 'Leaf 1', 'Leaf 2', 'Leaf 3'];

  it('names the leaves of flat and nested affected subtree groups', () => {
    expect(extractAffectedSubtreeGroups([[1, 2, 3]], leafNames)).toEqual([
      ['Leaf 1', 'Leaf 2', 'Leaf 3'],
    ]);
    expect(extractAffectedSubtreeGroups([[[1, 2], [3]]], leafNames)).toEqual([
      ['Leaf 1', 'Leaf 2'],
      ['Leaf 3'],
    ]);
  });

  it('has no groups when nothing moved or a leaf has no name', () => {
    expect(extractAffectedSubtreeGroups(null, leafNames)).toEqual([]);
    expect(extractAffectedSubtreeGroups([[7, 8]], leafNames)).toEqual([]);
  });

  it('labels a subtree by its names, or by its first name and a count', () => {
    expect(formatSubtreeNames(['A'])).toBe('A');
    expect(formatSubtreeNames(['A', 'B'])).toBe('A, B');
    expect(formatSubtreeNames(['A', 'B', 'C', 'D'])).toBe('A, +3');
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
});
