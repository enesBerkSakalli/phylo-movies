/**
 * Colour scheme catalog for the MSA viewer: which schemes apply to which
 * sequence type, how they are grouped in the picker, and what their legend is.
 */
import { getColorScheme } from './colorUtils.js';

const SEQUENCE_TYPES = Object.freeze({ DNA: 'dna', PROTEIN: 'protein' });
const ALL_TYPES = [SEQUENCE_TYPES.DNA, SEQUENCE_TYPES.PROTEIN];

const MSA_COLOR_SCHEME_GROUPS = Object.freeze([
  {
    label: 'General',
    types: ALL_TYPES,
    schemes: [
      { value: 'default', label: 'Default' },
      { value: 'taxa', label: 'Taxa' },
      { value: 'identity', label: 'Identity to consensus' },
      { value: 'grayscale', label: 'Grayscale' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    label: 'Nucleotide',
    types: [SEQUENCE_TYPES.DNA],
    schemes: [
      { value: 'nucleotide', label: 'Nucleotide' },
      { value: 'purine', label: 'Purine / pyrimidine' },
    ],
  },
  {
    label: 'Protein residue classes',
    types: [SEQUENCE_TYPES.PROTEIN],
    schemes: [
      { value: 'clustal', label: 'Clustal' },
      { value: 'clustal2', label: 'Clustal2' },
      { value: 'zappo', label: 'Zappo' },
      { value: 'taylor', label: 'Taylor' },
      { value: 'lesk', label: 'Lesk' },
      { value: 'mae', label: 'Mae' },
      { value: 'cinema', label: 'Cinema' },
    ],
  },
  {
    label: 'Protein properties',
    types: [SEQUENCE_TYPES.PROTEIN],
    schemes: [
      { value: 'hydrophobicity', label: 'Hydrophobicity' },
      { value: 'buried', label: 'Buried index' },
      { value: 'helix', label: 'Helix propensity' },
      { value: 'strand', label: 'Strand propensity' },
      { value: 'turn', label: 'Turn propensity' },
    ],
  },
]);

const NUCLEOTIDE_LEGEND_SYMBOLS = ['A', 'C', 'G', 'T', '-'];

/** Groups whose schemes apply to the sequence type; all groups when unknown. */
export function getColorSchemeGroups(type) {
  if (!ALL_TYPES.includes(type)) return MSA_COLOR_SCHEME_GROUPS;
  return MSA_COLOR_SCHEME_GROUPS.filter((group) => group.types.includes(type));
}

export function isColorSchemeAvailable(scheme, type) {
  return getColorSchemeGroups(type).some((group) =>
    group.schemes.some((option) => option.value === scheme)
  );
}

/**
 * Legend for the active scheme: residue swatches for nucleotide palettes, a
 * one-line note for schemes whose colour is not per residue, or null.
 * @returns {{ swatches?: Array<{ symbol: string, color: number[] }>, note?: string, tone?: 'warning' } | null}
 */
export function getColorSchemeLegend(scheme, type, { hasTaxonColors = true } = {}) {
  if (scheme === 'taxa') {
    return hasTaxonColors
      ? { note: 'Rows coloured by taxon group' }
      : {
          note: 'No taxon colours assigned yet. Set them in Taxa & Highlights.',
          tone: 'warning',
        };
  }
  if (scheme === 'identity') return { note: 'Darker blue cells match the consensus' };
  if (type !== SEQUENCE_TYPES.DNA) return null;
  if (!['default', 'nucleotide', 'purine'].includes(scheme)) return null;

  const colorFor = getColorScheme(scheme, type);
  return {
    swatches: NUCLEOTIDE_LEGEND_SYMBOLS.map((symbol) => ({ symbol, color: colorFor(symbol) })),
  };
}
