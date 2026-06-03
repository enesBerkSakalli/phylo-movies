import { describe, expect, it } from 'vitest';
import { buildSprMoveWindowRange } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprMoveWindowRange';
import type { SprMoveEventRow } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/types';

const baseEvent: SprMoveEventRow = {
  eventId: 'SPR-1',
  pairLabel: 'Source tree 3 -> Target tree 4',
  pairId: 'pair_2_3',
  pairIndex: 2,
  sourceInputTreeIndex: 2,
  targetInputTreeIndex: 3,
  eventIndex: 0,
  signature: '1',
  splitIndices: [1],
  driverSplitIndices: [1],
  contextSplitIndices: [1],
  highlightGroup: [[1]],
  groupSize: 1,
  pivotEdge: [1, 2],
  sourceAttachment: [3],
  destinationAttachment: [4],
  stepRange: [0, 2],
  totalPathHops: 2,
  totalPathLength: 0.5,
  rfDistance: 0.25,
  weightedRfDistance: 1.5,
};

describe('SPR move window ranges', () => {
  it('formats source and target MSA ranges for the corresponding input trees', () => {
    const range = buildSprMoveWindowRange(baseEvent, {
      hasMsa: true,
      msaStepSize: 50,
      msaWindowSize: 100,
      msaColumnCount: 1000,
    });

    expect(range).toMatchObject({
      treeLabel: 'Source tree 3 -> Target tree 4',
      displayLabel: 'Sites 51-150 -> 101-200',
      sourceLabel: 'Source tree 3 sites 51-150 (mid 101)',
      targetLabel: 'Target tree 4 sites 101-200 (mid 151)',
    });
    expect(range?.searchText).toContain('Sites 51-150 -> 101-200');
  });

  it('omits ranges when there is no MSA axis', () => {
    expect(buildSprMoveWindowRange(baseEvent, { hasMsa: false })).toBeNull();
  });
});
