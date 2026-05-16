import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('example dataset configuration', () => {
  it('copies publication example assets into production builds', () => {
    const packageJson = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'package.json'),
      'utf8',
    ));

    expect(packageJson.scripts.build).toContain('./scripts/copy-examples.sh dist');
  });

  it('keeps the norovirus example on the default IQ-TREE fast-search path', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/WorkspaceInitialization/exampleDatasets.js'),
      'utf8',
    );

    const norovirusBlock = source.match(/id: 'norovirus-350',[\s\S]*?badge: 'Publication'/)?.[0] ?? '';

    expect(norovirusBlock).toContain("treeInferenceEngine: 'iqtree'");
    expect(norovirusBlock).toContain('iqtreeFastSearch: true');
    expect(norovirusBlock).toContain('useGtr: true');
    expect(norovirusBlock).toContain('useGamma: true');
  });

  it('keeps every IQ-TREE example on the fast-search path unless explicitly disabled', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/WorkspaceInitialization/exampleDatasets.js'),
      'utf8',
    );
    const exampleBlocks = Array.from(source.matchAll(/id: '([^']+)',[\s\S]*?badge: '[^']+'/g))
      .map((match) => ({ id: match[1], source: match[0] }));
    const iqtreeExamples = exampleBlocks.filter((example) => (
      example.source.includes("treeInferenceEngine: 'iqtree'")
    ));

    expect(iqtreeExamples.map((example) => example.id)).toEqual([
      'norovirus-350',
      'quick-msa-demo',
    ]);
    expect(iqtreeExamples
      .filter((example) => example.source.includes('iqtreeFastSearch: true'))
      .map((example) => example.id)).toEqual([
        'norovirus-350',
        'quick-msa-demo',
      ]);
  });
});
