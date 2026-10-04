import { describe, expect, it } from 'vitest';
import {
  describeProcessingProgress,
  formatDuration,
  formatElapsed,
} from '../../../../src/pages/WorkspaceInitialization/processingProgress.js';

describe('upload processing progress copy', () => {
  it('turns tree inference progress into a count and time estimate without file names', () => {
    expect(describeProcessingProgress('Inferred tree 12/100 from 131.fasta', 24_000)).toEqual({
      headline: 'Inferring tree 12 of 100',
      detail: 'About 3 min left',
    });
    expect(describeProcessingProgress('Inferred tree 100/100 from 9.fasta', 60_000).detail).toBe(
      null
    );
    expect(describeProcessingProgress('Inferred tree 99/100 from 9.fasta', 9_900).detail).toBe(
      'Almost done'
    );
  });

  it('passes other backend messages through', () => {
    expect(describeProcessingProgress('Received 5 / 10 trees...', 1000)).toEqual({
      headline: 'Received 5 / 10 trees...',
      detail: null,
    });
    expect(describeProcessingProgress('', 0).headline).toBe('Processing…');
  });

  it('formats durations and elapsed time', () => {
    expect(formatDuration(42_000)).toBe('42 s');
    expect(formatDuration(150_000)).toBe('3 min');
    expect(formatDuration(3_900_000)).toBe('1 h 5 min');
    expect(formatElapsed(83_000)).toBe('1:23');
  });
});
