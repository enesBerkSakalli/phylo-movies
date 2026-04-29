import { describe, expect, it } from 'vitest';
import { createSprFrequencyCsv } from '../../../src/components/TreeStatsPanel/SubtreeAnalytics/sprFrequencyCsv';

describe('createSprFrequencyCsv', () => {
  it('uses mover occurrence terminology in exported headers', () => {
    const csv = createSprFrequencyCsv([], []);
    const header = csv.split('\n')[0];

    expect(header).toContain('Mover Occurrence Count');
    expect(header).not.toContain('SPR Event Count');
  });
});
