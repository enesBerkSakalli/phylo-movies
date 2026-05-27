import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return /\.(jsx?|tsx?)$/.test(entry) ? [fullPath] : [];
  });
}

describe('UI layering contract', () => {
  it('uses bracketed arbitrary z-index classes for large z-index values', () => {
    const invalidClasses = collectSourceFiles(join(repoRoot, 'src')).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/\bz-(?:[1-9]\d{2,})\b/g)].map(
        (match) => `${relative(repoRoot, file)}: ${match[0]}`
      );
    });

    expect(invalidClasses).toEqual([]);
  });

  it('keeps floating research windows above canvas HUD controls', () => {
    const floatingWindowFiles = [
      'src/components/msa/MsaRndWindow.jsx',
      'src/components/taxa-coloring/TaxaColoringRndWindow.jsx',
      'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
    ];
    const layerSource = readFileSync(
      join(repoRoot, 'src/components/ui/floating-window-layer.js'),
      'utf8'
    );

    expect(layerSource).toContain('z-[1100]');
    expect(layerSource).toContain('z-[1200]');

    const missingLayer = floatingWindowFiles
      .map((file) => join(repoRoot, file))
      .filter((file) => existsSync(file))
      .filter((file) => !readFileSync(file, 'utf8').includes('getFloatingWindowLayerClass'))
      .map((file) => relative(repoRoot, file));

    expect(missingLayer).toEqual([]);
  });

  it('lets the active floating research window move above inactive windows', () => {
    const appSource = readFileSync(join(repoRoot, 'src/App.jsx'), 'utf8');
    const floatingWindowFiles = [
      'src/components/msa/MsaRndWindow.jsx',
      'src/components/taxa-coloring/TaxaColoringRndWindow.jsx',
      'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
    ];

    expect(appSource).toContain('activeFloatingWindow');

    const missingFocusHandling = floatingWindowFiles
      .map((file) => join(repoRoot, file))
      .filter((file) => existsSync(file))
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return (
          !source.includes('isActive') ||
          !source.includes('onFocus') ||
          !source.includes('onMouseDown={onFocus}')
        );
      })
      .map((file) => relative(repoRoot, file));

    expect(missingFocusHandling).toEqual([]);
  });
});
