#!/usr/bin/env python
"""Check gap percentages in FASTA alignment."""

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


fasta_file = config_path(
    "RECAN_CANONICAL_ALIGNMENT",
    "publication_data/recombination_norovirus/source_alignments/"
    "norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta",
)
results = []

for record in SeqIO.parse(fasta_file, 'fasta'):
    seq = str(record.seq).upper()
    total = len(seq)
    gaps = seq.count('-')
    non_gap = total - gaps
    gap_pct = (gaps / total) * 100
    results.append((record.id, total, non_gap, gap_pct))

# Sort by gap percentage descending
results.sort(key=lambda x: x[3], reverse=True)

print('Sequences with highest gap percentage:')
print('=' * 70)
print(f'{"Sequence ID":<40} {"Length":>8} {"Non-gap":>8} {"Gap%":>8}')
print('=' * 70)
for seq_id, total, non_gap, gap_pct in results[:30]:
    print(f'{seq_id:<40} {total:>8} {non_gap:>8} {gap_pct:>7.1f}%')

print()
print(f'Total sequences: {len(results)}')
print(f'Alignment length: {results[0][1]}')

# Check for sequences with >90% gaps
high_gap = [r for r in results if r[3] > 90]
print(f'Sequences with >90% gaps: {len(high_gap)}')

# Show sequences with <50% gaps (good candidates)
print()
print('Sequences with <50% gaps (good for analysis):')
good = [r for r in results if r[3] < 50]
print(f'Count: {len(good)}')
for seq_id, total, non_gap, gap_pct in sorted(good, key=lambda x: x[3])[:10]:
    print(f'  {seq_id}: {gap_pct:.1f}% gaps')
