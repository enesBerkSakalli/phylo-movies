/**
 * Example datasets configuration for the home page.
 * Each example specifies the file path (relative to public/examples/),
 * display metadata, and processing parameters.
 */

const PUBLICATION_CITATION = 'Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. doi:10.64898/2026.04.01.715821';

export const EXAMPLE_DATASETS = [
  {
    id: 'norovirus-350',
    name: 'Norovirus GII.17',
    description: 'Human norovirus GII.17 pandemic variant phylogeny (350 sequences, full genome alignment)',
    workflow: 'Sliding-window MSA',
    scale: '350 taxa',
    bestFor: 'Recombination breakpoint exploration',
    fileName: 'subsampled_350_gappyout_final.fasta',
    // Path maps to publication_data/ via Vite plugin (see vite.config.mts)
    filePath: import.meta.env.BASE_URL + 'examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta',
    fileType: 'msa',
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
    id: 'quick-msa-demo',
    name: 'Quick MSA Demo',
    description: 'Synthetic 30-taxon alignment with 10 supplied input trees for fast alignment-sync testing',
    workflow: 'Trees + MSA',
    scale: '30 taxa / 10 trees',
    bestFor: 'MSA-window synchronization',
    fileName: 'quick_msa_demo_30taxa_10trees.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk',
    msaFileName: 'quick_msa_demo_30taxa_10windows.fasta',
    msaFilePath: import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta',
    fileType: 'tree-msa',
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
    description: 'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode (200 trees, 24 taxa, source alignment 14,190 sites)',
    workflow: 'Bootstrap tree series',
    scale: '24 taxa / 200 trees',
    bestFor: 'Rogue-taxon movement review',
    fileName: 'all_trees_24_source-24_taxa24_sites14190.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk',
    fileType: 'newick',
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
    description: 'Composition-ranked rogue-taxon bootstrap tree sequence inferred with IQ-TREE default mode (200 trees, 125 taxa, source alignment 29,149 sites)',
    workflow: 'Bootstrap tree series',
    scale: '125 taxa / 200 trees',
    bestFor: 'Larger topology-change example',
    fileName: 'all_trees_125_source-125_taxa125_sites29149.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/ranked/all_trees_125_source-125_taxa125_sites29149.nwk',
    fileType: 'newick',
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
];

/**
 * Get example dataset by ID
 */
export function getExampleById(id) {
  return EXAMPLE_DATASETS.find((ex) => ex.id === id);
}
