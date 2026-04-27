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
    fileName: 'noro_virus_example_350_gappyout_final.fasta',
    // Path maps to publication_data/ via Vite plugin (see vite.config.mts)
    filePath: import.meta.env.BASE_URL + 'examples/norovirus/augur_subsampling/noro_virus_example_350_gappyout_final.fasta',
    fileType: 'msa',
    parameters: {
      windowSize: 750,
      stepSize: 500,
      midpointRooting: true,
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
    description: 'Synthetic 30-taxon alignment with 10 supplied tree windows for fast alignment-sync testing',
    fileName: 'quick_msa_demo_30taxa_10trees.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk',
    msaFileName: 'quick_msa_demo_30taxa_10windows.fasta',
    msaFilePath: import.meta.env.BASE_URL + 'examples/quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta',
    fileType: 'tree-msa',
    parameters: {
      windowSize: 200,
      stepSize: 100,
      midpointRooting: false,
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
    description: 'Simple 2-tree example used in publication figures (12 taxa)',
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
    name: 'Bootstrap Trees (24 taxa)',
    description: 'Palaeognath phylogeny with 100 bootstrap replicates (24 taxa, birds & crocodilians)',
    fileName: 'all_trees_24.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/bootstrap_example/24/all_trees_24.nwk',
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
    badge: 'Publication',
  },
  {
    id: 'bootstrap-125',
    name: 'Bootstrap Trees (125 taxa)',
    description: 'Large-scale phylogeny with 100 bootstrap replicates (125 sequences)',
    fileName: 'all_trees_125.nwk',
    filePath: import.meta.env.BASE_URL + 'examples/bootstrap_example/125/all_trees_125.nwk',
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
    badge: 'Publication',
  },
];

/**
 * Get example dataset by ID
 */
export function getExampleById(id) {
  return EXAMPLE_DATASETS.find((ex) => ex.id === id);
}

/**
 * Get the default example to show
 */
export function getDefaultExample() {
  return EXAMPLE_DATASETS[0];
}
