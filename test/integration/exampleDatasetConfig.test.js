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
    const norovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334');

    expect(norovirusExample?.parameters).toMatchObject({
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      useGtr: true,
      useGamma: true,
    });
  });

  it('keeps every IQ-TREE example on its intended search path', () => {
    const iqtreeExamples = EXAMPLE_DATASETS.filter(
      (example) => example.parameters?.treeInferenceEngine === 'iqtree'
    );

    expect(iqtreeExamples.map((example) => example.id)).toEqual([
      'norovirus-334',
      'norovirus-334-bootstrap',
      'quick-msa-demo',
    ]);
    expect(
      iqtreeExamples
        .filter((example) => example.parameters?.iqtreeFastSearch === true)
        .map((example) => example.id)
    ).toEqual(['norovirus-334', 'quick-msa-demo']);
  });

  it('adds a norovirus thorough-search bootstrap run without duplicating source data', () => {
    const fastNorovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334');
    const bootstrapNorovirusExample = EXAMPLE_DATASETS.find(
      (example) => example.id === 'norovirus-334-bootstrap'
    );

    expect(bootstrapNorovirusExample).toBeDefined();
    expect(bootstrapNorovirusExample.filePath).toBe(fastNorovirusExample.filePath);
    expect(bootstrapNorovirusExample.name).toBe('Norovirus Bootstrap Tree Search');
    expect(bootstrapNorovirusExample.provenance.settings).toContainEqual({
      label: 'Branch support',
      value: 'UFBoot, 1000 replicates, BNNI optimization',
    });
    expect(bootstrapNorovirusExample.parameters).toMatchObject({
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: false,
      iqtreeSupportMode: 'ufboot',
      iqtreeUfbootReplicates: 1000,
      iqtreeBnni: true,
      useGtr: true,
      useGamma: true,
    });
  });

  it('keeps the norovirus example label aligned with the retained FASTA', () => {
    const norovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334');

    expect(norovirusExample).toBeDefined();

    const publicationRelativePath = norovirusExample.filePath.replace(
      /^.*examples\//,
      'publication_data/'
    );
    const fastaFile = path.join(process.cwd(), publicationRelativePath);
    const records = fs
      .readFileSync(fastaFile, 'utf8')
      .split(/^>/m)
      .filter(Boolean)
      .map((record) => record.split(/\r?\n/).slice(1).join('').replace(/\s/g, ''));
    const sequenceLengths = new Set(records.map((sequence) => sequence.length));

    expect(records).toHaveLength(334);
    expect(sequenceLengths).toEqual(new Set([8058]));
    expect(norovirusExample.name).toBe('Norovirus Polymerase-Capsid Recombination');
    expect(norovirusExample.description).toContain('polymerase-capsid recombination panel');
    expect(norovirusExample.description).toContain('334 retained sequences');
    expect(norovirusExample.description).toContain('8,058 bp');
    expect(norovirusExample.scale).toBe('334 taxa / 8,058 bp');
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

  it('keeps msprime performance examples aligned with their committed fixtures', () => {
    const msprimeExamples = EXAMPLE_DATASETS.filter((example) =>
      example.id.startsWith('msprime-performance-')
    );
    const expectedById = new Map([
      ['msprime-performance-250', { taxa: 250, trees: 50 }],
      ['msprime-performance-500', { taxa: 500, trees: 25 }],
      ['msprime-performance-1000', { taxa: 1000, trees: 10 }],
    ]);

    expect(msprimeExamples.map((example) => example.id)).toEqual([
      'msprime-performance-250',
      'msprime-performance-500',
      'msprime-performance-1000',
    ]);

    for (const example of msprimeExamples) {
      const expected = expectedById.get(example.id);
      const publicationRelativePath = example.filePath.replace(
        /^.*examples\//,
        'publication_data/'
      );
      const treeFile = path.join(process.cwd(), publicationRelativePath);
      const treeLines = fs.readFileSync(treeFile, 'utf8').trim().split(/\r?\n/).filter(Boolean);
      const firstTreeTaxa = new Set(
        Array.from(treeLines[0].matchAll(/(?<=[(,])([^(),:;]+):/g), (match) => match[1])
      );

      expect(treeLines).toHaveLength(expected.trees);
      expect(firstTreeTaxa.size).toBe(expected.taxa);
      expect(example.description).toContain(`${expected.taxa} taxa`);
      expect(example.description).toContain(`${expected.trees} independent trees`);
      expect(example.scale).toBe(`${expected.taxa} taxa / ${expected.trees} trees`);
      expect(example.filePath).toContain('scale_fixtures/msprime_performance');
      expect(example.provenance.sourceType).toBe('Synthetic performance fixture');
      expect(example.provenance.settings).toContainEqual({
        label: 'Simulator',
        value: 'msprime',
      });
    }
  });
});
