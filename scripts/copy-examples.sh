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

# Norovirus MSA example (350 sequences)
mkdir -p "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed"
cp "$SOURCE/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta" \
   "$DEST/examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/"

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

# Current IQ-TREE rogue-taxon bootstrap examples
mkdir -p "$DEST/examples/bootstrap_rogue_taxa"
rm -rf "$DEST/examples/bootstrap_rogue_taxa/current_results"
cp -R "$SOURCE/bootstrap_rogue_taxa/current_results" \
   "$DEST/examples/bootstrap_rogue_taxa/"

echo "Done. Copied 5 example datasets."
