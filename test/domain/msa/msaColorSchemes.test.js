import { describe, expect, it } from 'vitest';
import { getColorScheme } from '../../../src/msaViewer/utils/colorUtils.js';

describe('MSA color schemes', () => {
  it('parses shorthand white entries in built-in alignment palettes', () => {
    const zappo = getColorScheme('zappo', 'protein');
    const clustal = getColorScheme('clustal', 'protein');

    expect(zappo('B')).toEqual([255, 255, 255, 255]);
    expect(clustal('B')).toEqual([255, 255, 255, 255]);
  });
});
