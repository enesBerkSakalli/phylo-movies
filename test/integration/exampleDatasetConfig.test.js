import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEMO_EXAMPLE_DATASETS,
  EXAMPLE_DATASETS,
} from '../../src/pages/WorkspaceInitialization/exampleDatasets.js';
import { validatePhyloMovieData } from '../../src/domain/backend/phyloMovieSchema';

function publicationPathForExampleArtifact(artifact) {
  return path.join(process.cwd(), artifact.filePath.replace(/^.*examples\//, 'publication_data/'));
}

function expectExampleArtifactExists(artifact) {
  expect(fs.existsSync(publicationPathForExampleArtifact(artifact))).toBe(true);
}

describe('example dataset configuration', () => {
  it('copies publication example assets into production builds', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

    expect(packageJson.scripts.build).toContain('./scripts/copy-examples.sh dist');
    expect(packageJson.scripts['fixtures:generate']).toContain('poetry run python');
    expect(packageJson.scripts['fixtures:check']).toContain('poetry run python');
  });

  it('keeps fixture generation scoped to current browser-demo payloads', () => {
    const fixtureGenerator = fs.readFileSync(
      path.join(process.cwd(), 'scripts/generate-frontend-fixtures.py'),
      'utf8'
    );

    expect(fixtureGenerator).not.toContain('small-example');
    expect(fixtureGenerator).not.toContain('ostrich-bug');
    expect(fixtureGenerator).not.toContain('gh-pages-demo');
    expect(fixtureGenerator).toContain('demo-paper-example');
    expect(fixtureGenerator).toContain('demo-norovirus-334');
    expect(fixtureGenerator).toContain('demo-bootstrap-125');
    expect(fixtureGenerator).toContain('demo-msprime-1000-limit');
  });

  it('keeps the browser demo library limited to generated payloads', () => {
    expect(DEMO_EXAMPLE_DATASETS.map((example) => example.id)).toEqual([
      'norovirus-334',
      'norovirus-334-stability',
      'paper-example',
      'bootstrap-24',
      'bootstrap-125',
      'quick-msa-demo',
      'msprime-1000-two-tree-limit',
    ]);
    const generatedDemoExamples = DEMO_EXAMPLE_DATASETS.filter(
      (example) => example.precomputedPayloadPath
    );
    expect(generatedDemoExamples.map((example) => example.id)).toEqual([
      'norovirus-334',
      'norovirus-334-stability',
      'paper-example',
      'bootstrap-24',
      'bootstrap-125',
      'quick-msa-demo',
      'msprime-1000-two-tree-limit',
    ]);

    for (const example of generatedDemoExamples) {
      expect(example.precomputedPayloadPath).toContain('/examples/precomputed/');
      expect(example.precomputedPayloadPath).toMatch(/\.movie\.json$/);
    }

    const limitDemo = DEMO_EXAMPLE_DATASETS.find(
      (example) => example.id === 'msprime-1000-two-tree-limit'
    );
    expect(limitDemo.scale).toBe('1000 taxa / 2 trees');
    expect(limitDemo.badge).toBe('Limit');
  });

  it('does not keep the legacy single-payload GitHub Pages demo loader', () => {
    const routerSource = fs.readFileSync(path.join(process.cwd(), 'src/Router.jsx'), 'utf8');
    const infoPageSource = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/GitHubPages/GitHubPagesInfoPage.jsx'),
      'utf8'
    );
    const seoSource = fs.readFileSync(path.join(process.cwd(), 'scripts/apply-gh-seo.js'), 'utf8');

    expect(routerSource).not.toContain('GitHubPagesDemoLoader');
    expect(
      fs.existsSync(path.join(process.cwd(), 'src/pages/GitHubPages/GitHubPagesDemoLoader.jsx'))
    ).toBe(false);
    expect(infoPageSource).not.toContain('one precomputed paper-figure payload');
    expect(infoPageSource).not.toContain('Open Precomputed Demo');
    expect(seoSource).not.toContain('precomputed paper-figure demo');
    expect(seoSource).not.toContain('static precomputed paper-figure payload');
  });

  it('pre-renders raw HTML for the generated browser demo page', () => {
    const seoSource = fs.readFileSync(path.join(process.cwd(), 'scripts/apply-gh-seo.js'), 'utf8');

    expect(seoSource).toContain('data-prerendered-demo="true"');
    expect(seoSource).toContain('Phylo-Movies Browser Demo: Generated Phylogenetic Examples');
    expect(seoSource).toContain('Norovirus Polymerase-Capsid Recombination');
    expect(seoSource).toContain('IQ-TREE Bootstrap Trees (125 taxa)');
    expect(seoSource).toContain('msprime 1000-Taxa Limit Demo');
    expect(seoSource).toContain('writeDemoIndexHtml(indexHtml)');
    expect(seoSource).not.toContain('writeDemoIndexHtml(updatedIndexHtml)');
  });

  it('keeps browser demo payload files generated and schema-valid', () => {
    const expectedPayloadFiles = [
      'all_trees_125_source-125_taxa125_sites29149.input.movie.json',
      'all_trees_24_source-24_taxa24_sites14190.input.movie.json',
      'msprime_1000taxa_2trees_seed100005.movie.json',
      'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.input.movie.json',
      'norovirus_334_iqtree_fast_window750_step500.input.movie.json',
      'paper_example.movie.json',
      'quick_msa_demo_30taxa_10trees.movie.json',
    ];
    const generatedPayloadFiles = fs
      .readdirSync(path.join(process.cwd(), 'publication_data/precomputed'))
      .filter((fileName) => fileName.endsWith('.movie.json'))
      .sort();

    expect(generatedPayloadFiles).toEqual(expectedPayloadFiles);

    for (const example of DEMO_EXAMPLE_DATASETS.filter(
      (candidate) => candidate.precomputedPayloadPath
    )) {
      const precomputedRelativePath = example.precomputedPayloadPath.replace(
        /^.*examples\/precomputed\//,
        'publication_data/precomputed/'
      );
      const payloadPath = path.join(process.cwd(), precomputedRelativePath);
      const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
      const validated = validatePhyloMovieData(payload);

      expect(validated.file_name).toBeTruthy();
      expect(validated.interpolated_trees.length).toBe(validated.frames.length);
    }

    const payloadsById = new Map(
      DEMO_EXAMPLE_DATASETS.filter((example) => example.precomputedPayloadPath).map((example) => {
        const payloadPath = path.join(
          process.cwd(),
          example.precomputedPayloadPath.replace(
            /^.*examples\/precomputed\//,
            'publication_data/precomputed/'
          )
        );
        return [example.id, JSON.parse(fs.readFileSync(payloadPath, 'utf8'))];
      })
    );

    expect(payloadsById.get('norovirus-334').interpolated_trees).toHaveLength(17);
    expect(payloadsById.get('norovirus-334').msa.window_size).toBe(750);
    expect(payloadsById.get('norovirus-334-stability').interpolated_trees).toHaveLength(17);
    expect(payloadsById.get('norovirus-334-stability').msa.window_size).toBe(1000);
    expect(payloadsById.get('norovirus-334-stability').msa.step_size).toBe(500);
  });

  it('keeps publication source artifacts copied into production builds', () => {
    const copyScript = fs.readFileSync(
      path.join(process.cwd(), 'scripts/copy-examples.sh'),
      'utf8'
    );

    for (const expectedSourceArtifact of [
      'full_genome_accession_versions.txt',
      'full_genome_metadata.tsv',
      'subsampled_350_metadata.csv',
      'rename_map.tsv',
      'recombination_norovirus/REGENERATE.md',
      'current_results/phylo_movies/"*.nwk',
      'current_results/window_tables/"*.tsv',
      'paper_example.tree',
      '"$SOURCE/precomputed/"*.movie.json',
      'source_alignments/MANIFEST.tsv',
      'aberer_roguenarok_dataset_24_taxa24_sites14190.phy',
      'aberer_roguenarok_dataset_125_taxa125_sites29149.phy',
      'bootstrap_rogue_taxa/REGENERATE.md',
    ]) {
      expect(copyScript).toContain(expectedSourceArtifact);
    }
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
      'norovirus-334-stability',
      'quick-msa-demo',
    ]);
    expect(
      iqtreeExamples
        .filter((example) => example.parameters?.iqtreeFastSearch === true)
        .map((example) => example.id)
    ).toEqual(['norovirus-334', 'norovirus-334-stability', 'quick-msa-demo']);
  });

  it('adds a norovirus stability-score run without duplicating source data', () => {
    const fastNorovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334');
    const stabilityNorovirusExample = EXAMPLE_DATASETS.find(
      (example) => example.id === 'norovirus-334-stability'
    );

    expect(stabilityNorovirusExample).toBeDefined();
    expect(stabilityNorovirusExample.filePath).toBe(fastNorovirusExample.filePath);
    expect(stabilityNorovirusExample.name).toBe('Norovirus Stability Scan');
    expect(stabilityNorovirusExample.provenance.settings).toContainEqual({
      label: 'Stability scores',
      value: 'SH-aLRT, 1000 replicates',
    });
    expect(stabilityNorovirusExample.provenance.settings).toContainEqual({
      label: 'Windowing',
      value: '1000 sites, 500-site step',
    });
    expect(stabilityNorovirusExample.precomputedPayloadPath).toContain(
      'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.input.movie.json'
    );
    expect(stabilityNorovirusExample.parameters).toMatchObject({
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      windowSize: 1000,
      stepSize: 500,
      iqtreeSupportMode: 'sh_alrt',
      iqtreeUfbootReplicates: 1000,
      iqtreeShAlrtReplicates: 1000,
      iqtreeBnni: false,
      useGtr: true,
      useGamma: true,
    });
    expect(stabilityNorovirusExample.runtimeWarning).toContain('Runs IQ-TREE');

    const windowTableArtifact = stabilityNorovirusExample.generatedArtifactFiles.find(
      (artifact) => artifact.fileName === 'norovirus_334_window1000_step500_windows.tsv'
    );
    const windowTableRows = fs
      .readFileSync(publicationPathForExampleArtifact(windowTableArtifact), 'utf8')
      .trim()
      .split(/\r?\n/);

    expect(windowTableRows[0]).toBe(
      'window_index\twindow_name\tstart_1based\tmid_1based\tend_1based_inclusive\tlength'
    );
    expect(windowTableRows).toHaveLength(18);
    expect(windowTableRows[1]).toBe('0\t1\t1\t1\t500\t500');
    expect(windowTableRows.at(-1)).toBe('16\t8001\t7501\t8001\t8058\t558');
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

  it('exposes one norovirus source truth plus regenerated metadata artifacts', () => {
    const norovirusExamples = EXAMPLE_DATASETS.filter((example) =>
      example.id.startsWith('norovirus-334')
    );

    expect(norovirusExamples).toHaveLength(2);

    for (const example of norovirusExamples) {
      expect(example.sourceTruthFile).toMatchObject({
        label: 'Locked accession versions',
        fileName: 'full_genome_accession_versions.txt',
      });
      expect(example.regenerationGuide).toMatchObject({
        label: 'Regeneration workflow',
        fileName: 'REGENERATE.md',
      });
      expect(example.generatedArtifactFiles).toContainEqual(
        expect.objectContaining({
          label: 'Taxa coloring metadata table',
          fileName: 'subsampled_350_metadata.csv',
        })
      );
      expect(example.generatedArtifactFiles.map((file) => file.fileName)).toEqual([
        'full_genome_metadata.tsv',
        'subsampled_350_metadata.csv',
        'rename_map.tsv',
        ...(example.id === 'norovirus-334'
          ? ['norovirus_334_iqtree_fast_window750_step500.nwk']
          : [
              'norovirus_334_window1000_step500_windows.tsv',
              'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk',
            ]),
      ]);

      for (const artifact of [
        example.sourceTruthFile,
        example.regenerationGuide,
        ...example.generatedArtifactFiles,
      ]) {
        expectExampleArtifactExists(artifact);
      }
    }
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
    expect(paperExample.sourceTruthFile).toMatchObject({
      label: 'Source tree file',
      fileName: 'paper_example.tree',
    });
    expectExampleArtifactExists(paperExample.sourceTruthFile);
  });

  it('exposes source truth and regenerated artifacts for bootstrap publication examples', () => {
    const bootstrap24 = EXAMPLE_DATASETS.find((example) => example.id === 'bootstrap-24');
    const bootstrap125 = EXAMPLE_DATASETS.find((example) => example.id === 'bootstrap-125');
    const expectedGeneratedFilesById = new Map([
      [
        'bootstrap-24',
        [
          'DATASET_MANIFEST.json',
          'composition_ranked_bootstrap_replicates_24_source-24_taxa24_sites14190.tsv',
          'split_support_24_source-24_taxa24_sites14190.tsv',
          'ORDERING_SEMANTICS.md',
        ],
      ],
      [
        'bootstrap-125',
        [
          'DATASET_MANIFEST.json',
          'composition_ranked_bootstrap_replicates_125_source-125_taxa125_sites29149.tsv',
          'split_support_125_source-125_taxa125_sites29149.tsv',
          'ORDERING_SEMANTICS.md',
        ],
      ],
    ]);

    expect(bootstrap24).toBeDefined();
    expect(bootstrap125).toBeDefined();
    expect(bootstrap24?.sourceTruthFile).toMatchObject({
      label: 'Source alignment',
      fileName: 'aberer_roguenarok_dataset_24_taxa24_sites14190.phy',
    });
    expect(bootstrap125?.sourceTruthFile).toMatchObject({
      label: 'Source alignment',
      fileName: 'aberer_roguenarok_dataset_125_taxa125_sites29149.phy',
    });

    for (const example of [bootstrap24, bootstrap125]) {
      expect(example.regenerationGuide).toMatchObject({
        label: 'Regeneration workflow',
        fileName: 'REGENERATE.md',
      });
      expect(example.generatedArtifactFiles.map((file) => file.fileName)).toEqual(
        expectedGeneratedFilesById.get(example.id)
      );

      for (const artifact of [
        example.sourceTruthFile,
        example.regenerationGuide,
        ...example.generatedArtifactFiles,
      ]) {
        expectExampleArtifactExists(artifact);
      }
    }
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
      ['msprime-performance-500-short', { taxa: 500, trees: 5 }],
      ['msprime-performance-1000', { taxa: 1000, trees: 10 }],
      ['msprime-performance-1000-short', { taxa: 1000, trees: 5 }],
    ]);

    expect(msprimeExamples.map((example) => example.id)).toEqual([
      'msprime-performance-250',
      'msprime-performance-500',
      'msprime-performance-1000',
      'msprime-performance-500-short',
      'msprime-performance-1000-short',
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
