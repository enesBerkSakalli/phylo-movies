import { describe, expect, it } from 'vitest';
import {
  createSprFrequencyCsv,
  createSprMoveEventCsv,
} from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprFrequencyCsv';

describe('createSprFrequencyCsv', () => {
  it('uses event-ledger terminology in exported headers', () => {
    const csv = createSprFrequencyCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('SPR Event Count');
    expect(header).toContain('% of SPR Events');
    expect(header).toContain('Tree Pair Count');
    expect(header).toContain('Total Path Hops');
    expect(header).toContain('Total Path Length');
    expect(header).not.toContain('Mover Occurrence Count');
  });

  it('exports path travel metrics for moved subtrees', () => {
    const csv = createSprFrequencyCsv([
      {
        signature: '1,2',
        splitIndices: [1, 2],
        count: 3,
        percentage: 50,
        pathEventCount: 2,
        totalPathHops: 7,
        averagePathHops: 3.5,
        totalPathLength: 1.25,
        averagePathLength: 0.625,
      },
    ], ['a', 'b', 'c']);
    const row = csv.split('\n')[1];

    expect(row).toContain('7');
    expect(row).toContain('3.500000');
    expect(row).toContain('1.250000');
    expect(row).toContain('0.625000');
  });
});

describe('createSprMoveEventCsv', () => {
  it('exports one auditable row per SPR move event', () => {
    const csv = createSprMoveEventCsv([
      {
        eventId: 'pair_0_1:0',
        pairLabel: '0 -> 1',
        pairKey: 'pair_0_1',
        eventIndex: 0,
        signature: '1',
        splitIndices: [1],
        pivotEdge: [9],
        sourceAttachment: [7, 8],
        destinationAttachment: [5, 6],
        stepRange: [0, 4],
        totalPathHops: 3,
        totalPathLength: 0.6,
        rfDistance: 0.25,
        weightedRfDistance: 1.25,
        hasMeasuredPath: true,
      },
    ], ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);

    const [header, row] = csv.split('\n');

    expect(header).toContain('Event ID');
    expect(header).toContain('From Attachment');
    expect(header).toContain('To Attachment');
    expect(row).toContain('pair_0_1:0');
    expect(row).toContain('"h, i"');
    expect(row).toContain('"f, g"');
    expect(row).toContain('0.600000');
  });

  it('leaves missing optional tree-change metrics blank', () => {
    const csv = createSprMoveEventCsv([
      {
        eventId: 'pair_0_1:0',
        pairLabel: '0 -> 1',
        pairKey: 'pair_0_1',
        eventIndex: 0,
        signature: '1',
        splitIndices: [1],
        pivotEdge: [9],
        sourceAttachment: [],
        destinationAttachment: [],
        stepRange: null,
        totalPathHops: 0,
        totalPathLength: 0,
        rfDistance: null,
        weightedRfDistance: null,
        hasMeasuredPath: false,
      },
    ], ['a', 'b']);

    const row = csv.split('\n')[1].split(',');

    expect(row[12]).toBe('');
    expect(row[13]).toBe('');
    expect(row[14]).toBe('no');
  });
});
