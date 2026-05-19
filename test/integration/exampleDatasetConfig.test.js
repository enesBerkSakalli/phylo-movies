import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_DATASETS } from '../../src/pages/WorkspaceInitialization/exampleDatasets.js';

describe('example dataset configuration', () => {
  it('copies publication example assets into production builds', () => {
    const packageJson = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'package.json'),
      'utf8',
    ));

    expect(packageJson.scripts.build).toContain('./scripts/copy-examples.sh dist');
  });

  it('keeps the norovirus example on the default IQ-TREE fast-search path', () => {
    const norovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-350');

    expect(norovirusExample?.parameters).toMatchObject({
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      useGtr: true,
      useGamma: true,
    });
  });

  it('keeps every IQ-TREE example on the fast-search path unless explicitly disabled', () => {
    const iqtreeExamples = EXAMPLE_DATASETS.filter((example) => (
      example.parameters?.treeInferenceEngine === 'iqtree'
    ));

    expect(iqtreeExamples.map((example) => example.id)).toEqual([
      'norovirus-350',
      'quick-msa-demo',
    ]);
    expect(iqtreeExamples
      .filter((example) => example.parameters?.iqtreeFastSearch === true)
      .map((example) => example.id)).toEqual([
        'norovirus-350',
        'quick-msa-demo',
      ]);
  });

  it('keeps bootstrap example copy aligned with publication tree counts', () => {
    const bootstrapExamples = EXAMPLE_DATASETS.filter((example) => example.id.startsWith('bootstrap-'));

    expect(bootstrapExamples.map((example) => example.id)).toEqual([
      'bootstrap-24',
      'bootstrap-125',
    ]);

    for (const example of bootstrapExamples) {
      const treeFile = path.join(
        process.cwd(),
        'publication_data/bootstrap_example',
        example.id.replace('bootstrap-', ''),
        example.fileName,
      );
      const treeCount = fs.readFileSync(treeFile, 'utf8').trim().split(/\r?\n/).filter(Boolean).length;

      expect(treeCount).toBe(200);
      expect(example.description).toContain('200 bootstrap replicates');
    }
  });
});
