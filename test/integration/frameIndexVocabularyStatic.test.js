import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SEARCH_ROOTS = ['src', 'test'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mts', '.mjs']);

describe('frame index vocabulary', () => {
  it('does not keep legacy frame cursor aliases in source or tests', () => {
    const files = SEARCH_ROOTS.flatMap((root) => listFiles(join(repoRoot, root)));

    const legacyTerms = [
      'activeFrameIndex',
      'currentTreeIndex',
      'selectCurrentTreeIndex',
    ];
    const offenders = files
      .map((file) => relative(repoRoot, file))
      .filter((file) => file !== 'test/integration/frameIndexVocabularyStatic.test.js')
      .flatMap((file) => {
        const source = readFileSync(join(repoRoot, file), 'utf8');
        return legacyTerms
          .filter((term) => source.includes(term))
          .map((term) => `${file}: ${term}`);
      });

    expect(offenders).toEqual([]);
  });
});

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return SOURCE_EXTENSIONS.has(fullPath.slice(fullPath.lastIndexOf('.'))) ? [fullPath] : [];
  });
}
