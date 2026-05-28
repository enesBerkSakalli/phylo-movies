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
mkdir -p "$DEST/examples/recombination_norovirus/current_results/phylo_movies"
cp "$SOURCE/recombination_norovirus/current_results/phylo_movies/"*.nwk \
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

# Deterministic msprime performance fixtures
mkdir -p "$DEST/examples/scale_fixtures"
rm -rf "$DEST/examples/scale_fixtures/msprime_performance"
cp -R "$SOURCE/scale_fixtures/msprime_performance" \
   "$DEST/examples/scale_fixtures/"

echo "Done. Copied example datasets and generated precomputed demo payloads."
