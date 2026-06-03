import { describe, expect, it } from 'vitest';
import {
  formatInputTreePair,
  getRecurrenceJumpFrame,
  getSprMoveJumpFrame,
} from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprMoveJumpTarget';

describe('SPR move jump targets', () => {
  it('uses the event frame range as the only jump target for SPR moves', () => {
    expect(getSprMoveJumpFrame({ frameRange: [12, 20] })).toBe(12);
    expect(getSprMoveJumpFrame({ frameRange: null })).toBeNull();
  });

  it('uses the representative event frame range for recurrence jumps', () => {
    expect(
      getRecurrenceJumpFrame({
        signature: '1',
        splitIndices: [1],
        count: 1,
        percentage: 100,
        totalPathHops: 1,
        averagePathHops: 1,
        totalPathLength: 0.5,
        averagePathLength: 0.5,
        representativeSourceInputTreeIndex: 0,
        representativeTargetInputTreeIndex: 1,
        representativeFrameRange: [7, 9],
      })
    ).toBe(7);
  });

  it('formats source and target tree labels consistently', () => {
    expect(formatInputTreePair(0, 1)).toBe('Source tree 1 -> Target tree 2');
    expect(formatInputTreePair(null, 1)).toBe('selected source/target tree pair');
  });
});
