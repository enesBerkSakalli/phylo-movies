import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = join(repoRoot, 'src');

const legacyTerms = [
  'markedSubtree',
  'markedSubtrees',
  'MarkedSubtree',
  'MarkedSubtrees',
  'markedColor',
  'currentMovingSubtrees',
  'CurrentMovingSubtree'
];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx|ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe('subtree highlight vocabulary', () => {
  it('does not keep legacy marked-subtree render/store names in active source', () => {
    const violations = [];

    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const term of legacyTerms) {
        if (source.includes(term) || relative(repoRoot, file).includes(term)) {
          violations.push(`${relative(repoRoot, file)}: ${term}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
