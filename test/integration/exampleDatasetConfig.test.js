import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEMO_EXAMPLE_DATASETS,
  EXAMPLE_DATASETS,
} from '../../src/pages/WorkspaceInitialization/exampleDatasets.js';
import { validatePhyloMovieData } from '../../src/domain/backend/phyloMovieSchema';
import { buildSprAnalyticsModel } from '../../src/domain/spr/sprAnalytics';

function publicationPathForExampleArtifact(artifact) {
  return path.join(process.cwd(), artifact.filePath.replace(/^.*examples\//, 'publication_data/'));
}

function expectExampleArtifactExists(artifact) {
  expect(fs.existsSync(publicationPathForExampleArtifact(artifact))).toBe(true);
}

function countFramesByType(payload) {
  return payload.frames.reduce((counts, frame) => {
    counts[frame.frame_type] = (counts[frame.frame_type] || 0) + 1;
    return counts;
  }, {});
}

function recurrenceCountBySignature(payload, signature) {
  const analyticsModel = buildSprAnalyticsModel(payload.pairs, {
    temporalEvents: payload.temporal_events,
    pairMetrics: payload.pair_metrics,
  });
  return analyticsModel.movedSubtreeRecurrences.find((row) => row.signature === signature)?.count;
}

describe('example dataset configuration', () => {
  it('copies publication example assets into production builds', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

    expect(packageJson.scripts.build).toContain('node scripts/copy-examples.mjs dist');
    expect(packageJson.scripts['build:gh']).toContain('npm run fixtures:generate:ci');
    expect(packageJson.scripts['build:gh']).toContain('npm run build:gh:ci');
    expect(packageJson.scripts['build:gh:ci']).toContain('node scripts/copy-examples.mjs dist');
    expect(packageJson.scripts['build:gh:ci']).not.toContain('fixtures:generate');
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
    expect(fixtureGenerator).not.toContain('demo-norovirus-334-stability');
    expect(fixtureGenerator).toContain('demo-bootstrap-24-weighted-rf');
    expect(fixtureGenerator).toContain('demo-bootstrap-125');
    expect(fixtureGenerator).toContain('demo-bootstrap-125-weighted-rf');
    expect(fixtureGenerator).toContain('demo-iqtree-search-500');
    expect(fixtureGenerator).not.toContain('demo-msprime-1000-limit');
  });

  it('keeps the browser demo library limited to generated payloads', () => {
    expect(DEMO_EXAMPLE_DATASETS.map((example) => example.id)).toEqual([
      'norovirus-334',
      'paper-example',
      'bootstrap-24',
      'bootstrap-24-weighted-rf',
      'bootstrap-125',
      'bootstrap-125-weighted-rf',
      'iqtree-search-500',
      'quick-msa-demo',
    ]);
    const generatedDemoExamples = DEMO_EXAMPLE_DATASETS.filter(
      (example) => example.precomputedPayloadPath
    );
    expect(generatedDemoExamples.map((example) => example.id)).toEqual([
      'norovirus-334',
      'paper-example',
      'bootstrap-24',
      'bootstrap-24-weighted-rf',
      'bootstrap-125',
      'bootstrap-125-weighted-rf',
      'iqtree-search-500',
      'quick-msa-demo',
    ]);

    for (const example of generatedDemoExamples) {
      expect(example.precomputedPayloadPath).toContain('/examples/precomputed/');
      expect(example.precomputedPayloadPath).toMatch(/\.movie\.json$/);
    }

    expect(DEMO_EXAMPLE_DATASETS.some((example) => example.id.includes('msprime'))).toBe(false);
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
    expect(seoSource).toContain('IQ-TREE Search Trajectory (500 taxa)');
    expect(seoSource).not.toContain('msprime 1000-Taxa Limit Demo');
    expect(seoSource).toContain('writeDemoIndexHtml(indexHtml)');
    expect(seoSource).not.toContain('writeDemoIndexHtml(updatedIndexHtml)');
  });

  it('keeps browser demo payload files generated and schema-valid', () => {
    const expectedPayloadFiles = [
      'all_trees_125_source-125_taxa125_sites29149.movie.json',
      'all_trees_24_source-24_taxa24_sites14190.movie.json',
      'iqtree500_fast_search_trajectory.movie.json',
      'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.movie.json',
      'paper_example.movie.json',
      'quick_msa_demo_30taxa_10trees.movie.json',
      'weighted_rf_nearest_neighbor_all_trees_125_source-125_taxa125_sites29149.movie.json',
      'weighted_rf_nearest_neighbor_all_trees_24_source-24_taxa24_sites14190.movie.json',
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
      const validated = validatePhyloMovieData(payload, { hydrateTrees: false });

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

    expect(
      countFramesByType(payloadsById.get('norovirus-334')).interpolation_frame
    ).toBeGreaterThan(0);
    expect(payloadsById.get('norovirus-334').msa.window_size).toBe(1000);
    expect(payloadsById.get('norovirus-334').msa.step_size).toBe(500);
    expect(payloadsById.get('norovirus-334').frames).toHaveLength(6408);
    expect(countFramesByType(payloadsById.get('norovirus-334'))).toMatchObject({
      input_tree: 17,
      interpolation_frame: 6391,
    });
    expect(
      payloadsById
        .get('norovirus-334')
        .temporal_events.filter((event) => event.event_type === 'spr_move')
    ).toHaveLength(1616);
    expect(countFramesByType(payloadsById.get('bootstrap-24')).interpolation_frame).toBeGreaterThan(
      0
    );
    expect(
      countFramesByType(payloadsById.get('bootstrap-24-weighted-rf')).interpolation_frame
    ).toBeGreaterThan(0);
    expect(
      countFramesByType(payloadsById.get('bootstrap-125')).interpolation_frame
    ).toBeGreaterThan(0);
    expect(
      countFramesByType(payloadsById.get('bootstrap-125-weighted-rf')).interpolation_frame
    ).toBeGreaterThan(0);
  }, 60_000);

  it('keeps app-level SPR recurrence counts aligned with publication bootstrap CSVs', () => {
    const bootstrap24Payload = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'publication_data/precomputed/all_trees_24_source-24_taxa24_sites14190.movie.json'
        ),
        'utf8'
      )
    );
    const bootstrap125Payload = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'publication_data/precomputed/all_trees_125_source-125_taxa125_sites29149.movie.json'
        ),
        'utf8'
      )
    );

    expect(recurrenceCountBySignature(bootstrap24Payload, '20')).toBe(79);
    expect(recurrenceCountBySignature(bootstrap125Payload, '114')).toBe(91);
  }, 30000);

  it('keeps publication source artifacts copied into production builds', () => {
    const copyScript = fs.readFileSync(
      path.join(process.cwd(), 'scripts/copy-examples.mjs'),
      'utf8'
    );

    for (const expectedSourceArtifact of [
      'full_genome_accession_versions.txt',
      'full_genome_metadata.tsv',
      'subsampled_350_metadata.csv',
      'rename_map.tsv',
      'recombination_norovirus/REGENERATE.md',
      'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk',
      'current_results/window_tables',
      'paper_example.tree',
      "entry.endsWith('.movie.json')",
      'source_alignments/MANIFEST.tsv',
      'aberer_roguenarok_dataset_24_taxa24_sites14190.phy',
      'aberer_roguenarok_dataset_125_taxa125_sites29149.phy',
      'bootstrap_rogue_taxa/REGENERATE.md',
      "entry.endsWith('.nwk')",
      "entry.endsWith('.tsv')",
      'aberer_roguenarok_dataset_500_taxa500_sites1398.phy',
    ]) {
      expect(copyScript).toContain(expectedSourceArtifact);
    }
    expect(copyScript).not.toContain('norovirus_334_iqtree_fast_window750_step500.nwk');
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
      'quick-msa-demo',
    ]);
    expect(
      iqtreeExamples
        .filter((example) => example.parameters?.iqtreeFastSearch === true)
        .map((example) => example.id)
    ).toEqual(['norovirus-334', 'quick-msa-demo']);
  });

  it('keeps the norovirus publication example on the SH-aLRT branch-support run', () => {
    const norovirusExample = EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334');

    expect(norovirusExample).toBeDefined();
    expect(norovirusExample.provenance.settings).toContainEqual({
      label: 'Branch support',
      value: 'SH-aLRT, 1000 replicates',
    });
    expect(norovirusExample.provenance.settings).toContainEqual({
      label: 'Windowing',
      value: '1000 sites, 500-site step',
    });
    expect(norovirusExample.precomputedPayloadPath).toContain(
      'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.movie.json'
    );
    expect(norovirusExample.parameters).toMatchObject({
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

    const windowTableArtifact = norovirusExample.generatedArtifactFiles.find(
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

    expect(norovirusExamples).toHaveLength(1);

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
        'norovirus_334_window1000_step500_windows.tsv',
        'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk',
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
          'moved_subtree_recurrence_24_source-24_taxa24_sites14190.csv',
          'SPR_RECURRENCE_SUMMARY.json',
          'ORDERING_SEMANTICS.md',
        ],
      ],
      [
        'bootstrap-125',
        [
          'DATASET_MANIFEST.json',
          'composition_ranked_bootstrap_replicates_125_source-125_taxa125_sites29149.tsv',
          'split_support_125_source-125_taxa125_sites29149.tsv',
          'moved_subtree_recurrence_125_source-125_taxa125_sites29149.csv',
          'SPR_RECURRENCE_SUMMARY.json',
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
      'bootstrap-24-weighted-rf',
      'bootstrap-125',
      'bootstrap-125-weighted-rf',
    ]);

    for (const example of bootstrapExamples) {
      const publicationRelativePath = example.filePath.replace(
        /^.*examples\//,
        'publication_data/'
      );
      const treeFile = path.join(process.cwd(), publicationRelativePath);
      const treeContents = fs.readFileSync(treeFile, 'utf8');
      const treeCount = treeContents.trim().split(/\r?\n/).filter(Boolean).length;
      const splitSupportArtifact = example.generatedArtifactFiles.find((artifact) =>
        artifact.fileName.startsWith('split_support_')
      );
      expect(splitSupportArtifact).toBeDefined();
      const splitSupportFile = publicationPathForExampleArtifact(splitSupportArtifact);
      const splitSupportHeader = fs.readFileSync(splitSupportFile, 'utf8').split(/\r?\n/, 1)[0];

      expect(treeCount).toBe(200);
      expect(treeContents).toContain('support_kind=bootstrap_replicate_split_frequency');
      expect(treeContents).toContain('bootstrap_frequency=');
      expect(treeContents).toContain('iqtree_support_kind=sh_alrt');
      expect(treeContents).toContain('iqtree_sh_alrt=');
      expect(splitSupportHeader).toContain('support_percent');
      if (example.id.endsWith('weighted-rf')) {
        expect(example.description).toContain('Weighted-RF ordered');
        expect(example.description).toContain('SPR moves');
      } else {
        expect(example.description).toContain('IQ-TREE default mode');
        expect(example.description).toContain('split-frequency branch labels');
        expect(example.description).toContain('SH-aLRT support metadata');
        expect(example.description).toContain('SPR recurrence tables');
      }
      expect(example.provenance.settings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Branch labels',
            value: 'Split-frequency support across the 200 trees',
          }),
          expect.objectContaining({
            label: 'IQ-TREE support metadata',
            value: 'SH-aLRT, 1,000 replicates',
          }),
        ])
      );
      expect(example.filePath).toContain('bootstrap_rogue_taxa/current_results');
      expect(example.fileName).toContain('source-');
    }
  });

  it('exposes the IQ-TREE topology-search trajectory example', () => {
    const example = EXAMPLE_DATASETS.find((entry) => entry.id === 'iqtree-search-500');

    expect(example).toBeDefined();
    expect(example.name).toBe('IQ-TREE Search Trajectory (500 taxa)');
    expect(example.workflow).toBe('Tree search trajectory');
    expect(example.scale).toBe('500 taxa / 21 trees');
    expect(example.precomputedPayloadPath).toContain('iqtree500_fast_search_trajectory.movie.json');
    expect(example.sourceTruthFile).toMatchObject({
      label: 'Source alignment',
      fileName: 'aberer_roguenarok_dataset_500_taxa500_sites1398.phy',
    });
    expect(example.generatedArtifactFiles.map((file) => file.fileName)).toEqual([
      'trajectory_summary.tsv',
    ]);

    const treeFile = path.join(
      process.cwd(),
      example.filePath.replace(/^.*examples\//, 'publication_data/')
    );
    const treeLines = fs.readFileSync(treeFile, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    const firstTreeTaxa = new Set(
      Array.from(treeLines[0].matchAll(/(?<=[(,])([^(),:;]+):/g), (match) => match[1])
    );
    const alignmentHeader = fs
      .readFileSync(publicationPathForExampleArtifact(example.sourceTruthFile), 'utf8')
      .split(/\r?\n/, 1)[0]
      .trim();

    expect(treeLines).toHaveLength(21);
    expect(firstTreeTaxa.size).toBe(500);
    expect(alignmentHeader).toBe('500 1398');
    expect(example.provenance.settings).toContainEqual({
      label: 'Search mode',
      value: 'Fast search',
    });
    expect(example.provenance.settings).toContainEqual({
      label: 'Search trajectory',
      value: '21 trees from the full fast run',
    });

    for (const artifact of [example.sourceTruthFile, ...example.generatedArtifactFiles]) {
      expectExampleArtifactExists(artifact);
    }
  });

  it('does not expose msprime performance fixtures as retained examples', () => {
    expect(EXAMPLE_DATASETS.some((example) => example.id.includes('msprime'))).toBe(false);
  });
});
