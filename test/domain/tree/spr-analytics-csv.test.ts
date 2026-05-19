import { describe, expect, it } from 'vitest';
import * as sprAnalyticsCsv from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprAnalyticsCsv';

const {
  createSprMovedSubtreeRecurrenceCsv,
  createSprMovedSubtreeRecurrenceExportName,
  createSprMoveEventExportName,
  createSprMoveEventCsv,
} = sprAnalyticsCsv;

describe('createSprMovedSubtreeRecurrenceCsv', () => {
  it('exports moved-subtree recurrence helpers without legacy frequency names', () => {
    expect(sprAnalyticsCsv.createSprMovedSubtreeRecurrenceCsv).toBeTypeOf('function');
    expect(sprAnalyticsCsv.createSprMovedSubtreeRecurrenceExportName).toBeTypeOf('function');
    expect(sprAnalyticsCsv.createSprFrequencyCsv).toBeUndefined();
    expect(sprAnalyticsCsv.createSprFrequencyExportName).toBeUndefined();
  });

  it('uses movement terminology in exported headers', () => {
    const csv = createSprMovedSubtreeRecurrenceCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('Movement Count');
    expect(header).toContain('% of Movements');
    expect(header).toContain('Tree Pair Count');
    expect(header).toContain('Total Path Hops');
    expect(header).toContain('Total Path Length');
    expect(header).not.toContain('Path Event Count');
    expect(header).not.toContain('SPR Event Count');
    expect(header).not.toContain('Mover Occurrence Count');
  });

  it('exports path travel metrics for moved subtrees', () => {
    const csv = createSprMovedSubtreeRecurrenceCsv([
      {
        signature: '1,2',
        splitIndices: [1, 2],
        count: 3,
        percentage: 50,
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

  it('uses moved-subtree terminology in exported filenames', () => {
    expect(createSprMovedSubtreeRecurrenceExportName('sample.tree', new Date('2026-05-15T00:00:00.000Z')))
      .toBe('sample-recurrent-moved-subtrees-2026-05-15.csv');
  });
});

describe('createSprMoveEventCsv', () => {
  it('exports one auditable row per movement', () => {
    const csv = createSprMoveEventCsv([
      {
        eventId: 'pair_0_1:0',
        pairLabel: 'source input tree 1 to target input tree 2',
        pairKey: 'pair_0_1',
        eventIndex: 0,
        signature: '1',
        splitIndices: [1],
        contextSplitIndices: [1, 2],
        pivotEdge: [9],
        sourceAttachment: [7, 8],
        destinationAttachment: [5, 6],
        stepRange: [0, 4],
        totalPathHops: 3,
        totalPathLength: 0.6,
        rfDistance: 0.25,
        weightedRfDistance: 1.25,
      },
    ], ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);

    const [header, row] = csv.split('\n');

    expect(header).toContain('Movement ID');
    expect(header).toContain('Movement Index');
    expect(header).toContain('Context Subtree');
    expect(header).toContain('From Attachment');
    expect(header).toContain('To Attachment');
    expect(header).not.toContain('Measured Path');
    expect(header).not.toContain('Event ID');
    expect(row).toContain('pair_0_1:0');
    expect(row).toContain('"b, c"');
    expect(row).toContain('"h, i"');
    expect(row).toContain('"f, g"');
    expect(row).toContain('0.600000');
    expect(row).not.toContain(',yes,');
    expect(row).not.toContain(',no,');
  });

  it('leaves missing optional tree-change metrics blank', () => {
    const csv = createSprMoveEventCsv([
      {
        eventId: 'pair_0_1:0',
        pairLabel: 'source input tree 1 to target input tree 2',
        pairKey: 'pair_0_1',
        eventIndex: 0,
        signature: '1',
        splitIndices: [1],
        contextSplitIndices: [1],
        pivotEdge: [9],
        sourceAttachment: [],
        destinationAttachment: [],
        stepRange: null,
        totalPathHops: 0,
        totalPathLength: 0,
        rfDistance: null,
        weightedRfDistance: null,
      },
    ], ['a', 'b']);

    const row = csv.split('\n')[1].split(',');

    expect(row[13]).toBe('');
    expect(row[14]).toBe('');
    expect(row[15]).toBe('1');
  });

  it('uses movement terminology in exported filenames', () => {
    expect(createSprMoveEventExportName('sample.tree', new Date('2026-05-15T00:00:00.000Z')))
      .toBe('sample-spr-movements-2026-05-15.csv');
  });
});
