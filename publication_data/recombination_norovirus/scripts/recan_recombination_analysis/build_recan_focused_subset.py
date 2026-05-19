#!/usr/bin/env python
"""
Extract a subset of sequences for recombination analysis.
Select representative sequences from key genotypes with good coverage.
"""

import os
from pathlib import Path

from Bio import SeqIO

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[3]


def config_path(env_name, default):
    path = Path(os.environ.get(env_name, default))
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


INPUT_FASTA = config_path(
    "RECAN_CANONICAL_ALIGNMENT",
    "publication_data/recombination_norovirus/source_alignments/"
    "norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta",
)
OUTPUT_FASTA = config_path(
    "RECAN_FOCUSED_SUBSET",
    "publication_data/recombination_norovirus/source_alignments/"
    "recan_focused_subset_6taxa_8058bp.fasta",
)

# Select representative sequences - only GII genotypes with similar gap patterns
# GI-1 outgroup is excluded because it has divergent gap patterns.
SELECTED_IDS = [
    'PV588655_P17_GII-17',   # GII.17 - index 0
    'PV588657_P17_GII-17',   # GII.17 - index 1 (for comparison within genotype)
    'PV746275_P16_GII-4',    # GII.4 - potential recombinant (index 2)
    'MH218629_P31_GII-4',    # GII.4 P31 (different polymerase)
    'OR536471_P21_GII-3',    # GII.3
    'MW305600_P21_GII-2',    # GII.2
]
SELECTED_IDS = [
    seq_id.strip()
    for seq_id in os.environ.get("RECAN_FOCUSED_SELECTED_IDS", ",".join(SELECTED_IDS)).split(",")
    if seq_id.strip()
]

# Read all sequences
records = {r.id: r for r in SeqIO.parse(INPUT_FASTA, 'fasta')}

# Extract selected sequences
selected = []
for seq_id in SELECTED_IDS:
    if seq_id in records:
        selected.append(records[seq_id])
        seq = str(records[seq_id].seq)
        gaps = seq.count('-')
        pct = (gaps / len(seq)) * 100
        print(f"✓ {seq_id}: {len(seq) - gaps} bp ({pct:.1f}% gaps)")
    else:
        print(f"✗ {seq_id}: NOT FOUND")

# Write subset
with OUTPUT_FASTA.open('w') as f:
    SeqIO.write(selected, f, 'fasta')

print(f"\nWrote {len(selected)} sequences to {OUTPUT_FASTA}")
