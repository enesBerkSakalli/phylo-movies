import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return /\.(jsx?|tsx?|mts|cts)$/.test(entry) ? [fullPath] : [];
  });
}

describe('legacy module aliases', () => {
  it('keeps the MSA module free of compatibility aliases and alternate exports', () => {
    const msaDirectories = [
      join(repoRoot, 'src', 'components', 'msa'),
      join(repoRoot, 'src', 'msaViewer'),
    ];
    const msaFiles = msaDirectories.flatMap(collectSourceFiles);

    expect(existsSync(join(repoRoot, 'src', 'components', 'msa', 'controls', 'index.js'))).toBe(
      false
    );
    expect(
      existsSync(join(repoRoot, 'src', 'msaViewer', 'layers', 'selectionBorderLayer.js'))
    ).toBe(false);

    const dualExportFiles = msaFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return (
        /\bexport\s+default\b/.test(source) && /\bexport\s+(?:function|class|const)\b/.test(source)
      );
    });
    expect(dualExportFiles.map((file) => relative(repoRoot, file))).toEqual([]);
  });
});
