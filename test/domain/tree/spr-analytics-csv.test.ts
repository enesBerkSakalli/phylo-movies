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

  it('uses SPR move terminology in exported headers', () => {
    const csv = createSprMovedSubtreeRecurrenceCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('SPR Move Count');
    expect(header).toContain('% of SPR Moves');
    expect(header).toContain('Tree Pair Count');
    expect(header).toContain('Topology Variant Count');
    expect(header).toContain('Source Parent Branch Support Median');
    expect(header).toContain('Target Parent Branch Support Median');
    expect(header).toContain('Source Moved Subtree Newick');
    expect(header).not.toContain('Total Path Hops');
    expect(header).not.toContain('Total Path Length');
    expect(header).not.toContain('Path Event Count');
    expect(header).not.toContain('SPR Event Count');
    expect(header).not.toContain('Mover Occurrence Count');
  });

  it('exports topology and parent-branch summaries for moved subtrees', () => {
    const csv = createSprMovedSubtreeRecurrenceCsv(
      [
        {
          signature: '1,2',
          splitIndices: [1, 2],
          count: 3,
          percentage: 50,
          topologyVariantCount: 2,
          sourceTopologyVariantCount: 1,
          destinationTopologyVariantCount: 2,
          sourceParentBranchValueMedian: 52.5,
          destinationParentBranchValueMedian: 84,
          lowParentBranchValueCount: 1,
          missingParentBranchValueCount: 0,
          sourceMovedSubtreeNewick: '(b:1,c:1):0.2;',
          destinationMovedSubtreeNewick: '(c:1,b:1):0.2;',
        },
      ],
      ['a', 'b', 'c']
    );
    const row = csv.split('\n')[1];

    expect(row).toContain('2');
    expect(row).toContain('52.500000');
    expect(row).toContain('84.000000');
    expect(row).toContain('"(b:1,c:1):0.2;"');
  });

  it('uses moved-subtree terminology in exported filenames', () => {
    expect(
      createSprMovedSubtreeRecurrenceExportName('sample.tree', new Date('2026-05-15T00:00:00.000Z'))
    ).toBe('sample-recurrent-moved-subtrees-2026-05-15.csv');
  });
});

describe('createSprMoveEventCsv', () => {
  it('exports one auditable row per SPR move', () => {
    const csv = createSprMoveEventCsv(
      [
        {
          eventId: 'pair_0_1:0',
          pairLabel: 'Source tree 1 -> Target tree 2',
          pairId: 'pair_0_1',
          pairIndex: 0,
          sourceInputTreeIndex: 0,
          targetInputTreeIndex: 1,
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
      ],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      {
        hasMsa: true,
        msaStepSize: 50,
        msaWindowSize: 100,
        msaColumnCount: 1000,
      }
    );

    const [header, row] = csv.split('\n');

    expect(header).toContain('SPR Move ID');
    expect(header).toContain('SPR Move Index');
    expect(header).toContain('Source Window');
    expect(header).toContain('Target Window');
    expect(header).toContain('Source Moved Subtree Newick');
    expect(header).toContain('Target Moved Subtree Newick');
    expect(header).toContain('Source Attachment');
    expect(header).toContain('Target Attachment');
    expect(header).toContain('Source Moved Subtree Value');
    expect(header).toContain('Target Parent Branch Value');
    expect(header).toContain('Moved Subtree Value Class');
    expect(header).toContain('Parent Branch Value Class');
    expect(header).not.toContain('Parent Branch Taxa');
    expect(header).not.toContain('Parent Branch Split Indices');
    expect(header).not.toContain('Path Hops');
    expect(header).not.toContain('Path Length');
    expect(header).not.toContain('Measured Path');
    expect(header).not.toContain('Event ID');
    expect(row).toContain('pair_0_1:0');
    expect(row).toContain('Source tree 1 sites 1-50 (mid 1)');
    expect(row).toContain('Target tree 2 sites 1-100 (mid 51)');
    expect(row).toContain('"h, i"');
    expect(row).toContain('"f, g"');
    expect(row).not.toContain(',yes,');
    expect(row).not.toContain(',no,');
  });

  it('leaves missing optional tree-change metrics blank', () => {
    const csv = createSprMoveEventCsv(
      [
        {
          eventId: 'pair_0_1:0',
          pairLabel: 'Source tree 1 -> Target tree 2',
          pairId: 'pair_0_1',
          pairIndex: 0,
          sourceInputTreeIndex: 0,
          targetInputTreeIndex: 1,
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
      ],
      ['a', 'b']
    );

    const [headerLine, rowLine] = csv.split('\n');
    const headers = headerLine.split(',');
    const row = rowLine.split(',');
    const valueFor = (header: string) => row[headers.indexOf(header)];

    expect(valueFor('Source Attachment Support')).toBe('');
    expect(valueFor('Target Attachment Support')).toBe('');
    expect(valueFor('Source Moved Subtree Value')).toBe('');
    expect(valueFor('Target Moved Subtree Value')).toBe('');
    expect(valueFor('Source Parent Branch Value')).toBe('');
    expect(valueFor('Target Parent Branch Value')).toBe('');
    expect(valueFor('Step Range')).toBe('');
    expect(valueFor('RF Distance')).toBe('');
    expect(valueFor('Weighted RF Distance')).toBe('');
    expect(headers).not.toContain('Path Hops');
    expect(headers).not.toContain('Path Length');
  });

  it('uses SPR move terminology in exported filenames', () => {
    expect(createSprMoveEventExportName('sample.tree', new Date('2026-05-15T00:00:00.000Z'))).toBe(
      'sample-spr-moves-2026-05-15.csv'
    );
  });
});
