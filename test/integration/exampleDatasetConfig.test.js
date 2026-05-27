import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_DATASETS } from '../../src/pages/WorkspaceInitialization/exampleDatasets.js';

describe('example dataset configuration', () => {
  it('copies publication example assets into production builds', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

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
    const iqtreeExamples = EXAMPLE_DATASETS.filter(
      (example) => example.parameters?.treeInferenceEngine === 'iqtree'
    );

    expect(iqtreeExamples.map((example) => example.id)).toEqual([
      'norovirus-350',
      'quick-msa-demo',
    ]);
    expect(
      iqtreeExamples
        .filter((example) => example.parameters?.iqtreeFastSearch === true)
        .map((example) => example.id)
    ).toEqual(['norovirus-350', 'quick-msa-demo']);
  });

  it('keeps the paper figure example label aligned with the source tree file', () => {
    const paperExample = EXAMPLE_DATASETS.find((example) => example.id === 'paper-example');

    expect(paperExample).toBeDefined();

    const publicationRelativePath = paperExample.filePath.replace(
      /^.*examples\//,
      'publication_data/'
    );
    const treeFile = path.join(process.cwd(), publicationRelativePath);
    const treeLines = fs.readFileSync(treeFile, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    const taxa = new Set(
      treeLines.flatMap((line) =>
        Array.from(line.matchAll(/(?<=[(,])([^(),:;]+):/g), (match) => match[1])
      )
    );

    expect(treeLines).toHaveLength(2);
    expect(taxa.size).toBe(14);
    expect(paperExample.description).toContain('14 taxa');
  });

  it('keeps bootstrap example copy aligned with publication tree counts', () => {
    const bootstrapExamples = EXAMPLE_DATASETS.filter((example) =>
      example.id.startsWith('bootstrap-')
    );

    expect(bootstrapExamples.map((example) => example.id)).toEqual([
      'bootstrap-24',
      'bootstrap-125',
    ]);

    for (const example of bootstrapExamples) {
      const publicationRelativePath = example.filePath.replace(
        /^.*examples\//,
        'publication_data/'
      );
      const treeFile = path.join(process.cwd(), publicationRelativePath);
      const treeContents = fs.readFileSync(treeFile, 'utf8');
      const treeCount = treeContents.trim().split(/\r?\n/).filter(Boolean).length;
      const splitSupportFile = path.join(
        path.dirname(treeFile),
        path
          .basename(treeFile)
          .replace(/^all_trees_/, 'split_support_')
          .replace(/\.nwk$/, '.tsv')
      );
      const splitSupportHeader = fs.readFileSync(splitSupportFile, 'utf8').split(/\r?\n/, 1)[0];

      expect(treeCount).toBe(200);
      expect(treeContents).toContain('support_kind=bootstrap_replicate_subtree_frequency');
      expect(treeContents).toContain('bootstrap_frequency=');
      expect(splitSupportHeader).toContain('support_percent');
      expect(example.description).toContain('IQ-TREE default mode');
      expect(example.filePath).toContain('bootstrap_rogue_taxa/current_results');
      expect(example.fileName).toContain('source-');
    }
  });
});
