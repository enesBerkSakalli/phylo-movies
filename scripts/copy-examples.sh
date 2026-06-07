#!/bin/bash
# copy-examples.sh - Copy example datasets to build output
# Usage: ./scripts/copy-examples.sh <destination_dir>
#
# This script creates generated app-demo artifacts from publication_data/.
# publication_data/ is the only source of truth; do not edit generated
# dist/examples or electron-app/frontend-dist/examples copies.
# Required because Vite's servePublicationData plugin only works in dev mode.

set -e

DEST="${1:-dist}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$PROJECT_ROOT/publication_data"

echo "Copying example datasets to $DEST..."

# Norovirus MSA example (334 retained sequences from a 350-sequence Augur target)
mkdir -p "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed"
cp "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta" \
   "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/"
mkdir -p "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/01_raw"
cp "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/01_raw/full_genome_accession_versions.txt" \
   "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/01_raw/"
mkdir -p "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/metadata"
cp "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/metadata/full_genome_metadata.tsv" \
   "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/metadata/subsampled_350_metadata.csv" \
   "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/metadata/rename_map.tsv" \
   "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/metadata/"
cp "$SOURCE/recombination_norovirus/REGENERATE.md" \
   "$DEST/examples/recombination_norovirus/"
rm -rf "$DEST/examples/recombination_norovirus/current_results/phylo_movies"
mkdir -p "$DEST/examples/recombination_norovirus/current_results/phylo_movies"
cp "$SOURCE/recombination_norovirus/current_results/phylo_movies/norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk" \
   "$DEST/examples/recombination_norovirus/current_results/phylo_movies/"
mkdir -p "$DEST/examples/recombination_norovirus/current_results/window_tables"
cp "$SOURCE/recombination_norovirus/current_results/window_tables/"*.tsv \
   "$DEST/examples/recombination_norovirus/current_results/window_tables/"

# Quick MSA demo (30 taxa, 10 supplied tree windows)
mkdir -p "$DEST/examples/quick_msa_demo"
cp "$SOURCE/quick_msa_demo/quick_msa_demo_30taxa_10trees.nwk" \
   "$DEST/examples/quick_msa_demo/"
cp "$SOURCE/quick_msa_demo/quick_msa_demo_30taxa_10windows.fasta" \
   "$DEST/examples/quick_msa_demo/"

# Paper figure example (14 taxa, 2 trees)
mkdir -p "$DEST/examples/figure_example"
cp "$SOURCE/figure_example/paper_example.tree" \
   "$DEST/examples/figure_example/"

# Generated JSON payloads for the static browser demo
mkdir -p "$DEST/examples/precomputed"
cp "$SOURCE/precomputed/"*.movie.json "$DEST/examples/precomputed/"

# Current IQ-TREE rogue-taxon bootstrap examples
mkdir -p "$DEST/examples/bootstrap_rogue_taxa"
rm -rf "$DEST/examples/bootstrap_rogue_taxa/current_results"
cp -R "$SOURCE/bootstrap_rogue_taxa/current_results" \
   "$DEST/examples/bootstrap_rogue_taxa/"
mkdir -p "$DEST/examples/bootstrap_rogue_taxa/source_alignments"
cp "$SOURCE/bootstrap_rogue_taxa/source_alignments/MANIFEST.tsv" \
   "$SOURCE/bootstrap_rogue_taxa/source_alignments/aberer_roguenarok_dataset_24_taxa24_sites14190.phy" \
   "$SOURCE/bootstrap_rogue_taxa/source_alignments/aberer_roguenarok_dataset_125_taxa125_sites29149.phy" \
   "$DEST/examples/bootstrap_rogue_taxa/source_alignments/"
cp "$SOURCE/bootstrap_rogue_taxa/REGENERATE.md" \
   "$DEST/examples/bootstrap_rogue_taxa/"

# Current IQ-TREE topology-search example
mkdir -p "$DEST/examples/topology_search_iqtree/current_results"
cp "$SOURCE/topology_search_iqtree/current_results/"*.nwk \
   "$SOURCE/topology_search_iqtree/current_results/"*.tsv \
   "$DEST/examples/topology_search_iqtree/current_results/"
mkdir -p "$DEST/examples/topology_search_iqtree/source_alignments"
cp "$SOURCE/topology_search_iqtree/source_alignments/aberer_roguenarok_dataset_500_taxa500_sites1398.phy" \
   "$DEST/examples/topology_search_iqtree/source_alignments/"
cp "$SOURCE/topology_search_iqtree/README.md" \
   "$DEST/examples/topology_search_iqtree/"

echo "Done. Copied example datasets and generated precomputed demo payloads."
