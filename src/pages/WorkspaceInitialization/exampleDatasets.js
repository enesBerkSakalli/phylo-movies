/**
 * Example datasets configuration for the home page.
 * Each example specifies the file path (relative to public/examples/),
 * display metadata, and processing parameters.
 */

const PUBLICATION_CITATION =
  'Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. doi:10.64898/2026.04.01.715821';

export const EXAMPLE_DATASETS = [
  {
    id: 'norovirus-334',
    name: 'Norovirus Polymerase-Capsid Recombination',
    description:
      'Human norovirus polymerase-capsid recombination panel (334 retained sequences from a 350-sequence Augur target, 8,058 bp full-genome alignment)',
    workflow: 'Sliding-window MSA',
    scale: '334 taxa / 8,058 bp',
    bestFor: 'Recombination breakpoint exploration',
    fileName: 'subsampled_350_gappyout_final.fasta',
    // Path maps to publication_data/ via Vite plugin (see vite.config.mts)
    filePath:
      import.meta.env.BASE_URL +
      'examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta',
    fileType: 'msa',
    provenance: {
      sourceType: 'Publication example',
      sourceLabel: 'publication_data/recombination_norovirus',
      treeSource:
        'Trees are inferred from sliding windows of the supplied norovirus MSA during processing.',
      alignmentSource: 'subsampled_350_gappyout_final.fasta',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE, GTR+G, fast search' },
        { label: 'Windowing', value: '750 sites, 500-site step' },
        { label: 'Rooting', value: 'Midpoint rooting' },
      ],
    },
    parameters: {
      windowSize: 750,
      stepSize: 500,
      midpointRooting: true,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      useGtr: true,
      useGamma: true,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'Publication',
  },
  {
    id: 'norovirus-334-bootstrap',
    name: 'Norovirus Bootstrap Tree Search',
    description:
      'Same 334-sequence norovirus recombination panel, processed with IQ-TREE thorough search and UFBoot branch support',
    workflow: 'Sliding-window MSA',
    scale: '334 taxa / 8,058 bp',
    bestFor: 'Genome-window topology changes with branch-support labels',
    fileName: 'subsampled_350_gappyout_final.fasta',
    filePath:
      import.meta.env.BASE_URL +
      'examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta',
    fileType: 'msa',
    provenance: {
      sourceType: 'Publication example',
      sourceLabel: 'publication_data/recombination_norovirus',
      treeSource:
        'Trees are inferred from sliding windows of the supplied norovirus MSA using IQ-TREE thorough search with UFBoot support.',
      alignmentSource: 'subsampled_350_gappyout_final.fasta',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE, GTR+G, thorough search' },
        { label: 'Branch support', value: 'UFBoot, 1000 replicates, BNNI optimization' },
        { label: 'Windowing', value: '750 sites, 500-site step' },
        { label: 'Rooting', value: 'Midpoint rooting' },
      ],
    },
    parameters: {
      windowSize: 750,
      stepSize: 500,
      midpointRooting: true,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: false,
      iqtreeSupportMode: 'ufboot',
      iqtreeUfbootReplicates: 1000,
      iqtreeShAlrtReplicates: 1000,
      iqtreeBnni: true,
      useGtr: true,
      useGamma: true,
      usePseudo: false,
    },
    citation: PUBLICATION_CITATION,
    badge: 'Bootstrap',
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
    fileType: 'newick',
    provenance: {
      sourceType: 'Publication figure example',
      sourceLabel: 'examples/figure_example',
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
      'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode (200 trees, 24 taxa, source alignment 14,190 sites)',
    workflow: 'Bootstrap tree series',
    scale: '24 taxa / 200 trees',
    bestFor: 'Rogue-taxon SPR move review',
    fileName: 'all_trees_24_source-24_taxa24_sites14190.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Publication bootstrap example',
      sourceLabel: 'publication_data/bootstrap_rogue_taxa/current_results/dataset_24',
      treeSource:
        '200 composition-ranked bootstrap-replicate trees inferred with IQ-TREE 2 default search mode after RAxML replicate alignment generation.',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE 2 default search mode' },
        { label: 'Bootstrap inputs', value: 'RAxML replicate alignments, 200 trees' },
        { label: 'Support labels', value: 'Split-frequency support across the 200 trees' },
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
      'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode (200 trees, 125 taxa, source alignment 29,149 sites)',
    workflow: 'Bootstrap tree series',
    scale: '125 taxa / 200 trees',
    bestFor: 'Larger topology-change example',
    fileName: 'all_trees_125_source-125_taxa125_sites29149.nwk',
    filePath:
      import.meta.env.BASE_URL +
      'examples/bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/ranked/all_trees_125_source-125_taxa125_sites29149.nwk',
    fileType: 'newick',
    provenance: {
      sourceType: 'Publication bootstrap example',
      sourceLabel: 'publication_data/bootstrap_rogue_taxa/current_results/dataset_125',
      treeSource:
        '200 composition-ranked bootstrap-replicate trees inferred with IQ-TREE 2 default search mode after RAxML replicate alignment generation.',
      settings: [
        { label: 'Tree inference', value: 'IQ-TREE 2 default search mode' },
        { label: 'Bootstrap inputs', value: 'RAxML replicate alignments, 200 trees' },
        { label: 'Support labels', value: 'Split-frequency support across the 200 trees' },
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
      treeSource:
        'Generated with msprime as 50 deterministic independent single-tree replicates.',
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
      treeSource:
        'Generated with msprime as 25 deterministic independent single-tree replicates.',
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
      treeSource:
        'Generated with msprime as 10 deterministic independent single-tree replicates.',
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
];

/**
 * Get example dataset by ID
 */
export function getExampleById(id) {
  return EXAMPLE_DATASETS.find((ex) => ex.id === id);
}
