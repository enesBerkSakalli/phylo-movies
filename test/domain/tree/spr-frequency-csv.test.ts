import { describe, expect, it } from 'vitest';
import { createSprFrequencyCsv } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprFrequencyCsv';

describe('createSprFrequencyCsv', () => {
  it('uses plain move terminology in exported headers', () => {
    const csv = createSprFrequencyCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('Move Count');
    expect(header).toContain('% of Moves');
    expect(header).toContain('Total Path Hops');
    expect(header).toContain('Total Path Length');
    expect(header).not.toContain('Mover Occurrence Count');
    expect(header).not.toContain('SPR Event Count');
  });

  it('exports path travel metrics for moved groups', () => {
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
