import { describe, expect, it } from 'vitest';
import { buildSprMoveEventSearchText } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprMoveEventSearch';
import type { SprMoveEventRow } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/types';

const baseEvent: SprMoveEventRow = {
  eventId: 'SPR-12',
  pairLabel: '3 -> 4',
  pairKey: 'pair_2_3',
  eventIndex: 12,
  signature: '2,5',
  splitIndices: [2, 5],
  driverSplitIndices: [2, 5],
  contextSplitIndices: [2, 5, 7],
  highlightGroup: [[2, 5], [7]],
  groupSize: 2,
  pivotEdge: [0, 1, 2, 5, 7],
  sourceAttachment: [8, 9],
  destinationAttachment: [10, 11],
  stepRange: [4, 8],
  totalPathHops: 3,
  totalPathLength: 0.42,
  rfDistance: 0.75,
  weightedRfDistance: 1.25,
};

describe('SPR move event search text', () => {
  it('indexes event identifiers, taxa names, attachments, and metrics', () => {
    const text = buildSprMoveEventSearchText(baseEvent, [
      'Root',
      'Anchor',
      'Ostrich',
      'Tinamous',
      'Moa',
      'Kiwi',
      'Rhea',
      'ContextTaxon',
      'SourceA',
      'SourceB',
      'DestinationA',
      'DestinationB',
    ]);

    expect(text).toContain('spr-12');
    expect(text).toContain('pair_2_3');
    expect(text).toContain('ostrich');
    expect(text).toContain('kiwi');
    expect(text).toContain('contexttaxon');
    expect(text).toContain('sourcea');
    expect(text).toContain('destinationb');
    expect(text).toContain('4-8');
    expect(text).toContain('0.75');
    expect(text).toContain('1.25');
    expect(text).not.toContain('measured');
    expect(text).not.toContain('inferred');
  });

  it('indexes taxa names hidden behind compact pivot or attachment labels', () => {
    const text = buildSprMoveEventSearchText(
      {
        ...baseEvent,
        splitIndices: [2],
        driverSplitIndices: [2],
        contextSplitIndices: [0, 1, 2, 3, 4],
        pivotEdge: [0, 1, 2, 3, 4],
        sourceAttachment: [0, 1, 2, 3, 4],
        destinationAttachment: [0, 1, 2, 3, 4],
        highlightGroup: [[0, 1, 2, 3, 4]],
      },
      ['Root', 'Anchor', 'Ostrich', 'Tinamous', 'HiddenMoa'],
    );

    expect(text).toContain('ostrich');
    expect(text).toContain('+2 more');
    expect(text).toContain('4');
    expect(text).toContain('hiddenmoa');
  });
});
