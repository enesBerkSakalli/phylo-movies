import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function source(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('branch length labels', () => {
  it('uses scale-oriented wording instead of metric wording for branch length modes', () => {
    const treeStructureSource = source('src/components/appearance/layout/TreeStructure.jsx');
    const manualSource = source('manual/docs/feature-reference/workspace-controls.md');

    expect(treeStructureSource).toContain('Original: input branch lengths');
    expect(treeStructureSource).toContain('Readable scale: global sqrt transform');
    expect(treeStructureSource).toContain('Animation scale: normalized input lengths');
    expect(treeStructureSource).not.toContain('Metric:');
    expect(treeStructureSource).not.toContain('Metric modes');

    expect(manualSource).toContain('Original: input branch lengths');
    expect(manualSource).toContain('Readable scale: global sqrt transform');
    expect(manualSource).toContain('Animation scale: normalized input lengths');
    expect(manualSource).not.toContain('Metric:');
    expect(manualSource).not.toContain('Metric modes');
  });
});
