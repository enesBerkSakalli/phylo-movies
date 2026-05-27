import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const sourceChecks = [
  {
    file: join(
      repoRoot,
      'src',
      'state',
      'phyloStore',
      'slices',
      'comparison',
      'treeComparison.slice.js'
    ),
    terms: [
      ['viewLink', 'Mapping'],
      ['screenPositions', 'Left'],
      ['screenPositions', 'Right'],
      ['setViewLink', 'Mapping'],
      ['setScreen', 'Positions'],
      ['view', 'Offset'],
      ['setView', 'Offset'],
    ],
  },
  {
    file: join(repoRoot, 'src', 'treeVisualisation', 'deckgl', 'layers', 'LayerManager.js'),
    terms: [
      ['viewLink', 'Mapper'],
      ['buildViewLink', 'Mapping'],
      ['derivePair', 'Key'],
      ['_updateViewLink', 'Mapping'],
    ],
  },
  {
    file: join(repoRoot, 'src', 'treeVisualisation', 'viewport', 'ViewportManager.js'),
    terms: [
      ['updateScreen', 'Positions'],
      ['setScreen', 'Positions'],
      ['getView', 'Offset'],
      ['initialize', 'Offsets'],
    ],
  },
  {
    file: join(repoRoot, 'src', 'treeVisualisation', 'comparison', 'ComparisonModeRenderer.js'),
    terms: [
      ['updateScreen', 'Positions'],
      ['getView', 'Offset'],
    ],
  },
  {
    file: join(repoRoot, 'src', 'types', 'store.ts'),
    terms: [
      ['viewLink', 'Mapping'],
      ['screenPositions', 'Left'],
      ['screenPositions', 'Right'],
      ['setViewLink', 'Mapping'],
      ['setScreen', 'Positions'],
      ['view', 'Offset'],
      ['setView', 'Offset'],
    ],
  },
];

describe('comparison legacy state plumbing', () => {
  it('does not keep unused view-link, screen-position, or view-offset state', () => {
    const legacyMapper = join(
      repoRoot,
      'src',
      'domain',
      'view',
      ['viewLink', 'Mapper.js'].join('')
    );
    expect(existsSync(legacyMapper), relative(repoRoot, legacyMapper)).toBe(false);

    for (const { file, terms } of sourceChecks) {
      const source = readFileSync(file, 'utf8');

      for (const parts of terms) {
        const term = parts.join('');
        expect(
          source.includes(term),
          `${relative(repoRoot, file)} should not contain ${term}`
        ).toBe(false);
      }
    }
  });
});
