import { describe, expect, it } from 'vitest';
import { processMsaSequences } from '../../../src/msaViewer/utils/dataUtils.js';

describe('MSA data utilities', () => {
  it('classifies ambiguous nucleotide alignments as DNA', () => {
    const processed = processMsaSequences({
      taxonA: 'ACGTNRY-',
      taxonB: 'ACGTNRY-',
    });

    expect(processed.type).toBe('dna');
  });
});
