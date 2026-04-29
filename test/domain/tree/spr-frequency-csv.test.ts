import { describe, expect, it } from 'vitest';
import { createSprFrequencyCsv } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprFrequencyCsv';

describe('createSprFrequencyCsv', () => {
  it('uses plain move terminology in exported headers', () => {
    const csv = createSprFrequencyCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('Move Count');
    expect(header).toContain('% of Moves');
    expect(header).not.toContain('Mover Occurrence Count');
    expect(header).not.toContain('SPR Event Count');
  });
});
