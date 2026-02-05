#!/bin/bash
# copy-examples.sh - Copy example datasets to build output
# Usage: ./scripts/copy-examples.sh <destination_dir>
#
# This script copies all example datasets from publication_data/ to the
# specified destination directory. Required because Vite's servePublicationData
# plugin only works in dev mode.

set -e

DEST="${1:-dist}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$PROJECT_ROOT/publication_data"

echo "Copying example datasets to $DEST..."

# Norovirus MSA example (350 sequences)
mkdir -p "$DEST/examples/norovirus/augur_subsampling"
cp "$SOURCE/norovirus/augur_subsampling/noro_virus_example_350_gappyout_final.fasta" \
   "$DEST/examples/norovirus/augur_subsampling/"

# Paper figure example (12 taxa, 2 trees)
mkdir -p "$DEST/examples/figure_example"
cp "$SOURCE/figure_example/paper_example.tree" \
   "$DEST/examples/figure_example/"

# Bootstrap example - 24 taxa
mkdir -p "$DEST/examples/bootstrap_example/24"
cp "$SOURCE/bootstrap_example/24/all_trees_24.nwk" \
   "$DEST/examples/bootstrap_example/24/"

# Bootstrap example - 125 taxa
mkdir -p "$DEST/examples/bootstrap_example/125"
cp "$SOURCE/bootstrap_example/125/all_trees_125.nwk" \
   "$DEST/examples/bootstrap_example/125/"

echo "Done. Copied 4 example datasets."
