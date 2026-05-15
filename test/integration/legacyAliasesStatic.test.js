import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const legacyModules = [
  {
    filePath: join(repoRoot, 'src', 'domain', 'tree', ['subtree', 'FrequencyUtils.js'].join('')),
    importPath: ['domain', 'tree', ['subtree', 'FrequencyUtils'].join('')].join('/'),
  },
  {
    filePath: join(repoRoot, 'src', 'treeVisualisation', 'utils', ['Change', 'Metric', 'Utils.js'].join('')),
    importPath: ['treeVisualisation', 'utils', ['Change', 'Metric', 'Utils'].join('')].join('/'),
  },
];

const obsoleteDiagnostics = [
  join(repoRoot, 'scripts', 'diagnostics', ['subtree', 'logic', 'debug.js'].join('_')),
  join(repoRoot, 'test', ['reproduce', 'tooltip', 'issue.test.js'].join('_')),
];

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
  it('are removed from source and test imports', () => {
    const files = [
      ...collectSourceFiles(join(repoRoot, 'src')),
      ...collectSourceFiles(join(repoRoot, 'test')),
    ];

    for (const legacyModule of legacyModules) {
      expect(existsSync(legacyModule.filePath), relative(repoRoot, legacyModule.filePath)).toBe(false);

      const importReferences = files
        .filter((file) => file !== fileURLToPath(import.meta.url))
        .filter((file) => readFileSync(file, 'utf8').includes(legacyModule.importPath))
        .map((file) => relative(repoRoot, file));

      expect(importReferences, legacyModule.importPath).toEqual([]);
    }
  });

  it('does not keep obsolete one-off diagnostic scripts', () => {
    for (const filePath of obsoleteDiagnostics) {
      expect(existsSync(filePath), relative(repoRoot, filePath)).toBe(false);
    }
  });
});
