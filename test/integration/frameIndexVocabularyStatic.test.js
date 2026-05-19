import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SEARCH_ROOTS = ['src', 'test'];

describe('frame index vocabulary', () => {
  it('does not keep activeFrameIndex aliases in source or tests', () => {
    const files = SEARCH_ROOTS.flatMap((root) => listFiles(join(repoRoot, root)));

    const offenders = files
      .map((file) => relative(repoRoot, file))
      .filter((file) => file !== 'test/integration/frameIndexVocabularyStatic.test.js')
      .filter((file) => readFileSync(join(repoRoot, file), 'utf8').includes('activeFrameIndex'));

    expect(offenders).toEqual([]);
  });
});

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
