/** msa section validation: sequences plus the windowing parameters. */

import type { MsaData } from './phyloMovieTypes';
import { assertExactRecordKeys, assertRecord, validateInteger } from './schemaValidation';

export function validateMsa(value: unknown): MsaData {
  assertRecord(value, 'msa');
  assertExactRecordKeys(value, 'msa', ['sequences', 'window_size', 'step_size']);

  const sequences = value.sequences;
  let validatedSequences: Record<string, string> | null = null;
  if (sequences === undefined) {
    throw new Error('Invalid phyloMovieData payload: msa.sequences must be an object or null');
  }
  if (sequences !== null) {
    assertRecord(sequences, 'msa.sequences');
    validatedSequences = {};
    for (const [name, sequence] of Object.entries(sequences)) {
      if (typeof sequence !== 'string') {
        throw new Error(`Invalid phyloMovieData payload: msa.sequences.${name} must be a string`);
      }
      validatedSequences[name] = sequence;
    }
  }

  const windowSize = validateInteger(value.window_size, 'msa.window_size');
  if (windowSize <= 0) {
    throw new Error('Invalid phyloMovieData payload: msa.window_size must be positive');
  }

  const stepSize = validateInteger(value.step_size, 'msa.step_size');
  if (stepSize <= 0) {
    throw new Error('Invalid phyloMovieData payload: msa.step_size must be positive');
  }

  return {
    sequences: validatedSequences,
    window_size: windowSize,
    step_size: stepSize,
  };
}
