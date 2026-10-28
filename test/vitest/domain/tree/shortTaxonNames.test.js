import { describe, expect, it } from 'vitest';
import {
  SHORT_TAXON_NAME_LENGTH,
  fitTaxonNames,
  shortTaxonNames,
} from '../../../../src/domain/tree/shortTaxonNames.js';
import { textWidthEm, textWidthPx } from '../../../../src/domain/tree/textWidth.js';

const rubritepida =
  'Bacteria_Proteobacteria_Alphaproteobacteria_Rhodospirillales_Acetobacteraceae_Rubritepida_flocculans_DSM_14296';
const thiohalospira =
  'Bacteria_Proteobacteria_Gammaproteobacteria_Chromatiales_Ectothiorhodospiraceae_Thiohalospira_halophila_HL3';

describe('shortTaxonNames', () => {
  it('keeps the end of a long name, where genus, species and strain sit', () => {
    const short = shortTaxonNames([rubritepida, thiohalospira]);
    expect(short.get(rubritepida)).toBe('…Rubritepida_flocculans_DSM_14296');
    expect(short.get(thiohalospira)).toBe('…Thiohalospira_halophila_HL3');
  });

  it('leaves names that fit as they are', () => {
    const name = 'PV588655_P17_GII-17';
    expect(shortTaxonNames([name]).get(name)).toBe(name);
    const edge = 'x'.repeat(SHORT_TAXON_NAME_LENGTH);
    expect(shortTaxonNames([edge]).get(edge)).toBe(edge);
  });

  it('keeps the end of a single long part', () => {
    const name = 'a'.repeat(10) + 'b'.repeat(40);
    expect(shortTaxonNames([name]).get(name)).toBe(`…${'b'.repeat(SHORT_TAXON_NAME_LENGTH)}`);
  });

  it('lets different taxa that would shorten alike keep parts until they differ', () => {
    const tail = 'Candidatus_Pelagibacter_ubique_HTCC1062';
    const first = `Bacteria_Proteobacteria_Alpha_${tail}`;
    const second = `Bacteria_Proteobacteria_Gamma_${tail}`;
    const short = shortTaxonNames([first, second]);
    expect(short.get(first)).not.toBe(short.get(second));
    expect(short.get(first).endsWith(tail)).toBe(true);
    expect(short.get(second).endsWith(tail)).toBe(true);
  });

  it('maps every distinct name once and ignores missing names', () => {
    const short = shortTaxonNames([rubritepida, rubritepida, undefined, null]);
    expect([...short.keys()]).toEqual([rubritepida]);
  });
});

describe('fitTaxonNames', () => {
  const fit = (names, maxEm) => fitTaxonNames(names, maxEm);

  it('keeps the first part and the trailing parts that fit, cut in the middle', () => {
    const short = fit([rubritepida, thiohalospira], 24);
    expect(short.get(thiohalospira)).toBe('Bacteria_…_Thiohalospira_halophila_HL3');
    expect(short.get(rubritepida)).toBe('Bacteria_…_Rubritepida_flocculans_DSM_14296');
    // A tighter budget keeps fewer trailing parts, a wider one more.
    expect(fit([thiohalospira], 12).get(thiohalospira)).toBe('Bacteria_…_HL3');
    expect(fit([thiohalospira], 34).get(thiohalospira)).toBe(
      'Bacteria_…_Ectothiorhodospiraceae_Thiohalospira_halophila_HL3'
    );
    for (const text of short.values()) expect(textWidthEm(text)).toBeLessThanOrEqual(24);
  });

  it('leaves names that fit as they are', () => {
    const name = 'PV588655_P17_GII-17';
    expect(fit([name], 24).get(name)).toBe(name);
    expect(fit([thiohalospira], 100).get(thiohalospira)).toBe(thiohalospira);
  });

  it('keeps the end of the last parts when even the first part and one more do not fit', () => {
    const single = 'a'.repeat(10) + 'b'.repeat(40);
    const cut = fit([single], 10).get(single);
    expect(cut.startsWith('…b')).toBe(true);
    expect(single.endsWith(cut.slice(1))).toBe(true);
    expect(textWidthEm(cut)).toBeLessThanOrEqual(10);
    const wideFirst = `${'x'.repeat(30)}_mid_Genus_species`;
    const end = fit([wideFirst], 12).get(wideFirst);
    expect(end.startsWith('…')).toBe(true);
    expect(end.endsWith('species')).toBe(true);
  });

  it('keeps different names different, growing the kept part where they would cut alike', () => {
    const tail = 'Candidatus_Pelagibacter_ubique_HTCC1062';
    const first = `Bacteria_Proteobacteria_Alpha_${tail}`;
    const second = `Bacteria_Proteobacteria_Gamma_${tail}`;
    const short = fit([first, second, first, undefined], 26);
    expect([...short.keys()]).toEqual([first, second]);
    expect(short.get(first)).not.toBe(short.get(second));
    expect(short.get(first).endsWith(tail)).toBe(true);
  });
});

describe('fitTaxonNames budget', () => {
  const tail = 'Candidatus_Pelagibacter_ubique_HTCC1062';
  const alpha = `Bacteria_Proteobacteria_Alpha_${tail}`;
  const gamma = `Bacteria_Proteobacteria_Gamma_${tail}`;

  it('keeps names that would be cut alike apart without exceeding the budget', () => {
    for (const maxEm of [14, 20, 24, 26]) {
      const short = fitTaxonNames([alpha, gamma], maxEm);
      expect(short.get(alpha)).not.toBe(short.get(gamma));
      for (const text of short.values()) expect(textWidthEm(text)).toBeLessThanOrEqual(maxEm);
    }
  });

  it('shows where the alike names differ', () => {
    const short = fitTaxonNames([alpha, gamma], 14);
    expect(short.get(alpha)).toContain('Alpha');
    expect(short.get(gamma)).toContain('Gamma');
  });

  it('never exceeds the budget for many alike names', () => {
    const names = Array.from({ length: 40 }, (_, i) => `Bacteria_Group${i}_Genus_species_strain`);
    const short = fitTaxonNames(names, 12);
    expect(new Set(short.values()).size).toBe(names.length);
    for (const text of short.values()) expect(textWidthEm(text)).toBeLessThanOrEqual(12);
  });

  it('answers the same names and budget again without recomputing', () => {
    const names = [alpha, gamma];
    expect(fitTaxonNames(names, 20)).toBe(fitTaxonNames([...names], 20));
    expect(fitTaxonNames(names, 20)).not.toBe(fitTaxonNames(names, 21));
  });
});

describe('textWidth', () => {
  it('measures per character, so narrow glyphs take less room than wide ones', () => {
    expect(textWidthEm('')).toBe(0);
    expect(textWidthEm('iiii')).toBeLessThan(textWidthEm('nnnn'));
    expect(textWidthEm('nnnn')).toBeLessThan(textWidthEm('WWWW'));
    expect(textWidthPx('nnnn', 20)).toBeCloseTo(textWidthPx('nnnn', 10) * 2);
  });

  it('gives a drawn width more room than the text itself, so a wider real font does not clip', () => {
    const drawn = textWidthPx('Bacteria_Proteobacteria', 10);
    expect(drawn).toBeGreaterThan(textWidthEm('Bacteria_Proteobacteria') * 10);
    expect(drawn).toBeLessThan(textWidthEm('Bacteria_Proteobacteria') * 10 * 1.25);
  });
});
