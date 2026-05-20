import { describe, expect, it } from 'vitest';
import { calculateWindow } from '../../../src/domain/msa/msaWindowCalculator.js';

describe('MSA window calculator', () => {
  it('builds windows from discrete input-tree indices', () => {
    expect(calculateWindow(2, 50, 100, 1000)).toEqual({
      startPosition: 51,
      midPosition: 101,
      endPosition: 150,
    });
  });

  it('truncates discrete windows at alignment edges', () => {
    expect(calculateWindow(0, 50, 100, 1000)).toEqual({
      startPosition: 1,
      midPosition: 1,
      endPosition: 50,
    });
  });
});
