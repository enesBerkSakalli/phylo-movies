import { describe, expect, it } from 'vitest';
import {
  getColorSchemeGroups,
  getColorSchemeLegend,
  isColorSchemeAvailable,
} from '../../../../src/msaViewer/utils/colorSchemeCatalog.js';

describe('MSA colour scheme catalog', () => {
  it('offers only schemes that apply to the sequence type', () => {
    const dnaGroups = getColorSchemeGroups('dna').map((group) => group.label);
    expect(dnaGroups).toEqual(['General', 'Nucleotide']);
    expect(isColorSchemeAvailable('zappo', 'dna')).toBe(false);
    expect(isColorSchemeAvailable('nucleotide', 'dna')).toBe(true);
    expect(isColorSchemeAvailable('nucleotide', 'protein')).toBe(false);
    expect(isColorSchemeAvailable('clustal', 'protein')).toBe(true);
  });

  it('keeps every scheme reachable when the type is unknown', () => {
    expect(getColorSchemeGroups(undefined)).toHaveLength(4);
  });

  it('builds nucleotide swatches and notes for non-residue schemes', () => {
    const legend = getColorSchemeLegend('default', 'dna');
    expect(legend.swatches.map((swatch) => swatch.symbol)).toEqual(['A', 'C', 'G', 'T', '-']);
    expect(legend.swatches[0].color).toEqual([0, 158, 115, 255]);
    expect(getColorSchemeLegend('taxa', 'dna')).toEqual({ note: 'Rows coloured by taxon group' });
    expect(getColorSchemeLegend('clustal', 'protein')).toBeNull();
  });

  it('explains an empty taxa colouring instead of showing a blank alignment', () => {
    expect(getColorSchemeLegend('taxa', 'dna', { hasTaxonColors: false })).toEqual({
      note: 'No taxon colours assigned yet. Set them in Taxa & Highlights.',
      tone: 'warning',
    });
  });
});
