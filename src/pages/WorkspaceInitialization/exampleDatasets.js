/**
 * Example datasets configuration for the home page.
 * Each example specifies the file path (relative to public/examples/),
 * display metadata, and processing parameters.
 */

const PUBLICATION_CITATION =
  'Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. doi:10.64898/2026.04.01.715821';

const PRECOMPUTED_EXAMPLE_BASE = import.meta.env.BASE_URL + 'examples/precomputed/';
const NOROVIRUS_SOURCE_BASE =
  import.meta.env.BASE_URL +
  'examples/recombination_norovirus/source_preparation/augur_subsampling/';
const NOROVIRUS_SOURCE_TRUTH = {
  label: 'Locked accession versions',
  fileName: 'full_genome_accession_versions.txt',
  filePath: NOROVIRUS_SOURCE_BASE + '01_raw/full_genome_accession_versions.txt',
};
const NOROVIRUS_REGENERATION_GUIDE = {
  label: 'Regeneration workflow',
  fileName: 'REGENERATE.md',
  filePath: import.meta.env.BASE_URL + 'examples/recombination_norovirus/REGENERATE.md',
};
const NOROVIRUS_PHYLO_MOVIES_BASE =
  import.meta.env.BASE_URL + 'examples/recombination_norovirus/current_results/phylo_movies/';
const NOROVIRUS_WINDOW_TABLE_BASE =
  import.meta.env.BASE_URL + 'examples/recombination_norovirus/current_results/window_tables/';
const NOROVIRUS_STABILITY_WINDOW_TABLE = {
  label: 'Exact publication window table',
  fileName: 'norovirus_334_window1000_step500_windows.tsv',
  filePath: NOROVIRUS_WINDOW_TABLE_BASE + 'norovirus_334_window1000_step500_windows.tsv',
};
const NOROVIRUS_STABILITY_TREE_SERIES = {
  label: 'Generated SH-aLRT window trees',
  fileName: 'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk',
  filePath:
    NOROVIRUS_PHYLO_MOVIES_BASE + 'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk',
};
const NOROVIRUS_GENERATED_METADATA_FILES = [
  {
    label: 'Full Augur metadata table',
    fileName: 'full_genome_metadata.tsv',
    filePath: NOROVIRUS_SOURCE_BASE + 'metadata/full_genome_metadata.tsv',
  },
  {
    label: 'Taxa coloring metadata table',
    fileName: 'subsampled_350_metadata.csv',
    filePath: NOROVIRUS_SOURCE_BASE + 'metadata/subsampled_350_metadata.csv',
  },
  {
    label: 'Taxon rename map',
    fileName: 'rename_map.tsv',
    filePath: NOROVIRUS_SOURCE_BASE + 'metadata/rename_map.tsv',
  },
];
const BOOTSTRAP_SOURCE_BASE = import.meta.env.BASE_URL + 'examples/bootstrap_rogue_taxa/';
const BOOTSTRAP_REGENERATION_GUIDE = {
  label: 'Regeneration workflow',
  fileName: 'REGENERATE.md',
  filePath: BOOTSTRAP_SOURCE_BASE + 'REGENERATE.md',
};
const BOOTSTRAP_ORDERING_SEMANTICS = {
  label: 'Ordering semantics',
  fileName: 'ORDERING_SEMANTICS.md',
  filePath: BOOTSTRAP_SOURCE_BASE + 'current_results/ORDERING_SEMANTICS.md',
};
const BOOTSTRAP_RECURRENCE_SUMMARY = {
  label: 'SPR recurrence summary',
  fileName: 'SPR_RECURRENCE_SUMMARY.json',
  filePath: BOOTSTRAP_SOURCE_BASE + 'current_results/SPR_RECURRENCE_SUMMARY.json',
};
const BOOTSTRAP_24_DATASET = 'dataset_24_source-24_taxa24_sites14190';
const BOOTSTRAP_125_DATASET = 'dataset_125_source-125_taxa125_sites29149';
const makeBootstrapSourceTruthFile = ({ taxa, sites }) => ({
  label: 'Source alignment',
  fileName: `aberer_roguenarok_dataset_${taxa}_taxa${taxa}_sites${sites}.phy`,
  filePath:
    BOOTSTRAP_SOURCE_BASE +
    `source_alignments/aberer_roguenarok_dataset_${taxa}_taxa${taxa}_sites${sites}.phy`,
});
const makeBootstrapGeneratedArtifacts = ({ taxa, sites, dataset }) => {
  const rankedPath = `${BOOTSTRAP_SOURCE_BASE}current_results/${dataset}/ranked/`;
  const analysisPath = `${BOOTSTRAP_SOURCE_BASE}current_results/${dataset}/analysis/`;
  const sourceId = `${taxa}_source-${taxa}_taxa${taxa}_sites${sites}`;

  return [
    {
      label: 'Dataset manifest',
      fileName: 'DATASET_MANIFEST.json',
      filePath: `${BOOTSTRAP_SOURCE_BASE}current_results/${dataset}/DATASET_MANIFEST.json`,
    },
    {
      label: 'Ranked replicate table',
      fileName: `composition_ranked_bootstrap_replicates_${sourceId}.tsv`,
      filePath: `${rankedPath}composition_ranked_bootstrap_replicates_${sourceId}.tsv`,
    },
    {
      label: 'Split support table',
      fileName: `split_support_${sourceId}.tsv`,
      filePath: `${rankedPath}split_support_${sourceId}.tsv`,
    },
    {
      label: 'Moved-subtree recurrence table',
      fileName: `moved_subtree_recurrence_${sourceId}.csv`,
      filePath: `${analysisPath}moved_subtree_recurrence_${sourceId}.csv`,
    },
    BOOTSTRAP_RECURRENCE_SUMMARY,
    BOOTSTRAP_ORDERING_SEMANTICS,
  ];
};
const PAPER_FIGURE_SOURCE_TRUTH = {
  label: 'Source tree file',
  fileName: 'paper_example.tree',
  filePath: import.meta.env.BASE_URL + 'examples/figure_example/paper_example.tree',
};

export const EXAMPLE_DATASETS = [
  {
    id: 'norovirus-334',
    name: 'Norovirus Polymerase-Capsid Recombination',
    description:
      'Human norovirus polymerase-capsid recombination panel with SH-aLRT support (334 retained sequences from a 350-sequence Augur target, 8,058 bp full-genome alignment)',
    workflow: 'Sliding-window MSA',
    scale: '334 taxa / 8,058 bp',
    bestFor: 'Recombination breakpoint and support review',
    fileName: 'subsampled_350_gappyout_final.fasta',
    // Path maps to publication_data/ via Vite plugin (see vite.config.mts)
    filePath: NOROVIRUS_SOURCE_BASE + '03_trimmed/subsampled_350_gappyout_final.fasta',
    fileType: 'msa',
    precomputedPayloadPath:
      PRECOMPUTED_EXAMPLE_BASE + 'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.movie.json',
    sourceTruthFile: NOROVIRUS_SOURCE_TRUTH,
    regenerationGuide: NOROVIRUS_REGENERATION_GUIDE,
    generatedArtifactFiles: [
      ...NOROVIRUS_GENERATED_METADATA_FILES,
      NOROVIRUS_STABILITY_WINDOW_TABLE,
      NOROVIRUS_STABILITY_TREE_SERIES,
    ],
    provenance: {
      sourceType: 'Publication example',
      sourceLabel: 'publication_data/recombination_norovirus',
      treeSource:
        'Trees are inferred from sliding windows of the supplied norovirus MSA using IQ-TREE fast search with SH-aLRT support.',
      alignmentSource: 'subsampled_350_gappyout_final.fasta',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE, GTR+G, fast search' },
        { label: 'Stability scores', value: 'SH-aLRT, 1000 replicates' },
        { label: 'Windowing', value: '1000 sites, 500-site step' },
        { label: 'Rooting', value: 'Midpoint rooting' },
      ],
    },
    parameters: {
      windowSize: 1000,
      stepSize: 500,
      midpointRooting: true,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      iqtreeSupportMode: 'sh_alrt',
      iqtreeUfbootReplicates: 1000,
      iqtreeShAlrtReplicates: 1000,
      iqtreeBnni: false,
      useGtr: true,
      useGamma: true,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'Publication',
  },
  {
    id: 'quick-msa-demo',
    name: 'Quick MSA Demo',
    description:
      'Synthetic 30-taxon alignment with 10 supplied input trees for fast alignment-sync testing',
    workflow: 'Trees + MSA',
    scale: '30 taxa / 10 trees',
    bestFor: 'MSA-window synchronization',
    fileName: 'quick_msa_demo_30taxa_10trees.nwk',
    filePath:
      import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk',
    msaFileName: 'quick_msa_demo_30taxa_10windows.fasta',
    msaFilePath:
      import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta',
    precomputedPayloadPath: PRECOMPUTED_EXAMPLE_BASE + 'quick_msa_demo_30taxa_10trees.movie.json',
    fileType: 'tree-msa',
    provenance: {
      sourceType: 'Synthetic demo',
      sourceLabel: 'examples/quick_msa_demo',
      treeSource: 'Precomputed 10-tree Newick sequence bundled with the reviewer demo.',
      alignmentSource: 'quick_msa_demo_30taxa_10windows.fasta',
      settings: [
        { label: 'Tree source', value: 'Precomputed trees plus MSA context' },
        { label: 'Window mapping', value: '200 sites, 100-site step' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: 200,
      stepSize: 100,
      midpointRooting: false,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic reviewer demo included with Phylo-Movies.',
    badge: 'Fast MSA',
  },
  {
    id: 'paper-example',
    name: 'Paper Figure Example',
    description: 'Simple 2-tree example used in publication figures (14 taxa)',
    workflow: 'Precomputed trees',
    scale: '14 taxa / 2 trees',
    bestFor: 'Minimal transformation walkthrough',
    fileName: 'paper_example.tree',
    filePath: import.meta.env.BASE_URL + 'examples/figure_example/paper_example.tree',
    precomputedPayloadPath: PRECOMPUTED_EXAMPLE_BASE + 'paper_example.movie.json',
    fileType: 'newick',
    sourceTruthFile: PAPER_FIGURE_SOURCE_TRUTH,
    provenance: {
      sourceType: 'Publication figure example',
      sourceLabel: 'publication_data/figure_example',
      treeSource: 'Precomputed two-tree Newick example used for the manuscript figure.',
      settings: [
        { label: 'Tree source', value: 'Precomputed trees' },
        { label: 'Windowing', value: 'Not applicable' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'Demo',
  },
  {
    id: 'bootstrap-24',
    name: 'IQ-TREE Bootstrap Trees (24 taxa)',
    description:
      'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode, split-frequency branch labels, SH-aLRT support metadata, and SPR recurrence tables (200 trees, 24 taxa, source alignment 14,190 sites)',
    workflow: 'Bootstrap tree series',
    scale: '24 taxa / 200 trees',
    bestFor: 'Rogue-taxon SPR recurrence and support review',
    fileName: 'all_trees_24_source-24_taxa24_sites14190.nwk',
    filePath:
      BOOTSTRAP_SOURCE_BASE +
      `current_results/${BOOTSTRAP_24_DATASET}/ranked/all_trees_24_source-24_taxa24_sites14190.nwk`,
    precomputedPayloadPath:
      PRECOMPUTED_EXAMPLE_BASE + 'all_trees_24_source-24_taxa24_sites14190.movie.json',
    fileType: 'newick',
    sourceTruthFile: makeBootstrapSourceTruthFile({ taxa: 24, sites: 14190 }),
    regenerationGuide: BOOTSTRAP_REGENERATION_GUIDE,
    generatedArtifactFiles: makeBootstrapGeneratedArtifacts({
      taxa: 24,
      sites: 14190,
      dataset: BOOTSTRAP_24_DATASET,
    }),
    provenance: {
      sourceType: 'Publication bootstrap example',
      sourceLabel: 'publication_data/bootstrap_rogue_taxa',
      treeSource:
        '200 composition-ranked bootstrap-replicate trees inferred with IQ-TREE 3 default search mode after RAxML replicate alignment generation.',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE 3 default search mode' },
        { label: 'Bootstrap inputs', value: 'RAxML replicate alignments, 200 trees' },
        { label: 'Branch labels', value: 'Split-frequency support across the 200 trees' },
        { label: 'IQ-TREE support metadata', value: 'SH-aLRT, 1,000 replicates' },
        { label: 'Rooting', value: 'Midpoint rooting' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: true,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'IQ-TREE',
  },
  {
    id: 'bootstrap-125',
    name: 'IQ-TREE Bootstrap Trees (125 taxa)',
    description:
      'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode, split-frequency branch labels, SH-aLRT support metadata, and SPR recurrence tables (200 trees, 125 taxa, source alignment 29,149 sites)',
    workflow: 'Bootstrap tree series',
    scale: '125 taxa / 200 trees',
    bestFor: 'Larger rogue-taxon recurrence and support review',
    fileName: 'all_trees_125_source-125_taxa125_sites29149.nwk',
    filePath:
      BOOTSTRAP_SOURCE_BASE +
      `current_results/${BOOTSTRAP_125_DATASET}/ranked/all_trees_125_source-125_taxa125_sites29149.nwk`,
    precomputedPayloadPath:
      PRECOMPUTED_EXAMPLE_BASE + 'all_trees_125_source-125_taxa125_sites29149.movie.json',
    fileType: 'newick',
    sourceTruthFile: makeBootstrapSourceTruthFile({ taxa: 125, sites: 29149 }),
    regenerationGuide: BOOTSTRAP_REGENERATION_GUIDE,
    generatedArtifactFiles: makeBootstrapGeneratedArtifacts({
      taxa: 125,
      sites: 29149,
      dataset: BOOTSTRAP_125_DATASET,
    }),
    provenance: {
      sourceType: 'Publication bootstrap example',
      sourceLabel: 'publication_data/bootstrap_rogue_taxa',
      treeSource:
        '200 composition-ranked bootstrap-replicate trees inferred with IQ-TREE 3 default search mode after RAxML replicate alignment generation.',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE 3 default search mode' },
        { label: 'Bootstrap inputs', value: 'RAxML replicate alignments, 200 trees' },
        { label: 'Branch labels', value: 'Split-frequency support across the 200 trees' },
        { label: 'IQ-TREE support metadata', value: 'SH-aLRT, 1,000 replicates' },
        { label: 'Rooting', value: 'Midpoint rooting' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: true,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'IQ-TREE',
  },
  {
    id: 'msprime-performance-250',
    name: 'msprime Performance 250',
    description:
      'Deterministic msprime tree-only performance fixture (250 taxa, 50 independent trees)',
    workflow: 'Synthetic tree series',
    scale: '250 taxa / 50 trees',
    bestFor: 'Baseline large-tree visualization',
    fileName: 'msprime_250taxa_50trees_seed25050.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/scale_fixtures/msprime_performance/msprime_250taxa_50trees_seed25050.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Synthetic performance fixture',
      sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
      treeSource: 'Generated with msprime as 50 deterministic independent single-tree replicates.',
      settings: [
        { label: 'Simulator', value: 'msprime' },
        { label: 'Mode', value: 'Independent single-tree replicates' },
        { label: 'Seed', value: '25050' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
    badge: 'Performance',
  },
  {
    id: 'msprime-performance-500',
    name: 'msprime Performance 500',
    description:
      'Deterministic msprime tree-only performance fixture (500 taxa, 25 independent trees)',
    workflow: 'Synthetic tree series',
    scale: '500 taxa / 25 trees',
    bestFor: 'Large-tree visualization limits',
    fileName: 'msprime_500taxa_25trees_seed50025.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/scale_fixtures/msprime_performance/msprime_500taxa_25trees_seed50025.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Synthetic performance fixture',
      sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
      treeSource: 'Generated with msprime as 25 deterministic independent single-tree replicates.',
      settings: [
        { label: 'Simulator', value: 'msprime' },
        { label: 'Mode', value: 'Independent single-tree replicates' },
        { label: 'Seed', value: '50025' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
    badge: 'Performance',
  },
  {
    id: 'msprime-performance-1000',
    name: 'msprime Performance 1000',
    description:
      'Deterministic msprime tree-only performance fixture (1000 taxa, 10 independent trees)',
    workflow: 'Synthetic tree series',
    scale: '1000 taxa / 10 trees',
    bestFor: 'Stress-testing maximum visible taxa',
    fileName: 'msprime_1000taxa_10trees_seed100010.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/scale_fixtures/msprime_performance/msprime_1000taxa_10trees_seed100010.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Synthetic performance fixture',
      sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
      treeSource: 'Generated with msprime as 10 deterministic independent single-tree replicates.',
      settings: [
        { label: 'Simulator', value: 'msprime' },
        { label: 'Mode', value: 'Independent single-tree replicates' },
        { label: 'Seed', value: '100010' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
    badge: 'Performance',
  },
  {
    id: 'msprime-performance-500-short',
    name: 'msprime Performance 500 Short',
    description:
      'Deterministic msprime tree-only performance fixture (500 taxa, 5 independent trees)',
    workflow: 'Synthetic tree series',
    scale: '500 taxa / 5 trees',
    bestFor: 'Quick high-taxon visualization check',
    fileName: 'msprime_500taxa_5trees_seed50005.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/scale_fixtures/msprime_performance/msprime_500taxa_5trees_seed50005.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Synthetic performance fixture',
      sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
      treeSource: 'Generated with msprime as 5 deterministic independent single-tree replicates.',
      settings: [
        { label: 'Simulator', value: 'msprime' },
        { label: 'Mode', value: 'Independent single-tree replicates' },
        { label: 'Seed', value: '50005' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
    badge: 'Performance',
  },
  {
    id: 'msprime-performance-1000-short',
    name: 'msprime Performance 1000 Short',
    description:
      'Deterministic msprime tree-only performance fixture (1000 taxa, 5 independent trees)',
    workflow: 'Synthetic tree series',
    scale: '1000 taxa / 5 trees',
    bestFor: 'Quick maximum-taxon visualization check',
    fileName: 'msprime_1000taxa_5trees_seed100005.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/scale_fixtures/msprime_performance/msprime_1000taxa_5trees_seed100005.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Synthetic performance fixture',
      sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
      treeSource: 'Generated with msprime as 5 deterministic independent single-tree replicates.',
      settings: [
        { label: 'Simulator', value: 'msprime' },
        { label: 'Mode', value: 'Independent single-tree replicates' },
        { label: 'Seed', value: '100005' },
        { label: 'Rooting', value: 'Input rooting preserved' },
      ],
    },
    parameters: {
      windowSize: null,
      stepSize: null,
      midpointRooting: false,
      useGtr: false,
      useGamma: false,
      usePseudo: false,
    },
    citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
    badge: 'Performance',
  },
];

const MS_PRIME_1000_LIMIT_DEMO = {
  id: 'msprime-1000-two-tree-limit',
  name: 'msprime 1000-Taxa Limit Demo',
  description: 'Generated browser payload with 1000 taxa and two independent trees',
  workflow: 'Generated tree movie',
  scale: '1000 taxa / 2 trees',
  bestFor: 'Maximum-taxon browser visualization check',
  fileName: 'msprime_1000taxa_2trees_seed100005.nwk',
  filePath:
    import.meta.env.BASE_URL +
    'examples/scale_fixtures/msprime_performance/msprime_1000taxa_5trees_seed100005.nwk',
  precomputedPayloadPath:
    PRECOMPUTED_EXAMPLE_BASE + 'msprime_1000taxa_2trees_seed100005.movie.json',
  fileType: 'newick',
  provenance: {
    sourceType: 'Generated browser demo',
    sourceLabel: 'publication_data/scale_fixtures/msprime_performance',
    treeSource: 'First two trees from the deterministic 1000-taxon msprime fixture.',
    settings: [
      { label: 'Simulator', value: 'msprime' },
      { label: 'Mode', value: '1000 taxa, two independent trees' },
      { label: 'Rooting', value: 'Input rooting preserved' },
    ],
  },
  parameters: {
    windowSize: null,
    stepSize: null,
    midpointRooting: false,
    useGtr: false,
    useGamma: false,
    usePseudo: false,
  },
  citation: 'Synthetic msprime performance fixture generated locally for Phylo-Movies.',
  badge: 'Limit',
};

export const DEMO_EXAMPLE_DATASETS = [
  EXAMPLE_DATASETS.find((example) => example.id === 'norovirus-334'),
  EXAMPLE_DATASETS.find((example) => example.id === 'paper-example'),
  EXAMPLE_DATASETS.find((example) => example.id === 'bootstrap-24'),
  EXAMPLE_DATASETS.find((example) => example.id === 'bootstrap-125'),
  EXAMPLE_DATASETS.find((example) => example.id === 'quick-msa-demo'),
  MS_PRIME_1000_LIMIT_DEMO,
].filter(Boolean);

/**
 * Get example dataset by ID
 */
export function getExampleById(id) {
  return (
    EXAMPLE_DATASETS.find((ex) => ex.id === id) || DEMO_EXAMPLE_DATASETS.find((ex) => ex.id === id)
  );
}
