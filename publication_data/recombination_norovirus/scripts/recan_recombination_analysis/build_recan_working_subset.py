#!/usr/bin/env python
"""
Find sequence pairs with good overlap for recan analysis.
Checks pairwise overlap in sliding windows across the alignment.
"""

import os
from itertools import combinations
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
    "RECAN_WORKING_SUBSET",
    "publication_data/recombination_norovirus/source_alignments/"
    "recan_working_subset_48taxa_8058bp.fasta",
)
WINDOW_SIZE = int(os.environ.get("RECAN_WINDOW_SIZE", "500"))
STEP_SIZE = int(os.environ.get("RECAN_STEP_SIZE", "250"))
REPS_PER_COMBO = int(os.environ.get("RECAN_REPS_PER_COMBO", "5"))
MAX_GAP_PERCENT = float(os.environ.get("RECAN_MAX_GAP_PERCENT", "7.0"))


def count_overlap(seq1, seq2):
    """Count positions where both sequences have non-gap nucleotides."""
    overlap = 0
    for a, b in zip(seq1, seq2):
        if a != "-" and b != "-":
            overlap += 1
    return overlap


def check_window_overlaps(seq1, seq2, window_size, step_size):
    """Check all windows for minimum overlap."""
    length = len(seq1)
    min_overlap = float("inf")
    zero_windows = 0
    total_windows = 0

    for start in range(0, length - window_size + 1, step_size):
        end = start + window_size
        w1 = seq1[start:end]
        w2 = seq2[start:end]
        overlap = count_overlap(w1, w2)
        total_windows += 1
        if overlap == 0:
            zero_windows += 1
        if overlap < min_overlap:
            min_overlap = overlap

    return min_overlap, zero_windows, total_windows


# Read sequences
records = list(SeqIO.parse(INPUT_FASTA, "fasta"))
print(f"Loaded {len(records)} sequences")
print(f"Window size: {WINDOW_SIZE}, Step: {STEP_SIZE}")
print()

# Filter to GII sequences only (most common, similar structure)
gii_records = [r for r in records if "GII" in r.id]
print(f"GII sequences: {len(gii_records)}")

# Parse genotype info from sequence IDs
# Format: ACCESSION_P<polymerase>_GII-<capsid>
# e.g., PV275065_P4_GII-4, MT729791_P17_GII-17


def parse_genotypes(seq_id):
    """Extract polymerase (P) and capsid (GII) genotypes from ID."""
    parts = seq_id.split("_")
    capsid = None
    polymerase = None
    for p in parts:
        if p.startswith("GII-"):
            capsid = p
        elif p.startswith("P") and p[1:].isdigit():
            polymerase = p
    return capsid, polymerase


# Group by capsid genotype
capsid_groups = {}
polymerase_groups = {}
for r in gii_records:
    capsid, polymerase = parse_genotypes(r.id)

    if capsid:
        if capsid not in capsid_groups:
            capsid_groups[capsid] = []
        capsid_groups[capsid].append(r)

    if polymerase:
        if polymerase not in polymerase_groups:
            polymerase_groups[polymerase] = []
        polymerase_groups[polymerase].append(r)

print("\nCapsid genotype counts:")
for gt, seqs in sorted(capsid_groups.items(), key=lambda x: -len(x[1])):
    print(f"  {gt}: {len(seqs)}")

print("\nPolymerase genotype counts:")
for gt, seqs in sorted(polymerase_groups.items(), key=lambda x: -len(x[1])):
    print(f"  {gt}: {len(seqs)}")

# Pick representatives from key genotypes
# Include: GII-4, GII-16, P4, P16 as requested
selected = []
seen_ids = set()

# Target combinations for recombination analysis
# Include classic strains, recombinants, and multiple representatives
target_combos = [
    # Non-recombinant (matching polymerase/capsid) - ORIGINAL strains
    ("GII-4", "P4"),  # Classic GII.P4-GII.4 (non-recombinant)
    ("GII-2", "P2"),  # Classic GII.P2-GII.2 (non-recombinant)
    ("GII-16", "P16"),  # GII.P16-GII.16 (non-recombinant, P16 polymerase donor)
    ("GII-17", "P17"),  # GII.P17-GII.17 (non-recombinant)
    ("GII-3", "P3"),  # GII.P3-GII.3 (non-recombinant)
    ("GII-6", "P7"),  # GII.P7-GII.6 (non-recombinant)
    ("GII-7", "P7"),  # GII.P7-GII.7 (non-recombinant)
    # Recombinant GII-4 variants (different polymerases)
    ("GII-4", "P16"),  # Recombinant GII.P16-GII.4 (pandemic 2015+) - QUERY
    ("GII-4", "P31"),  # Recombinant GII.P31-GII.4 (Sydney 2012)
    # Recombinant GII-2 variants
    ("GII-2", "P16"),  # Recombinant GII.P16-GII.2
    ("GII-2", "P21"),  # Recombinant GII.P21-GII.2
    # Recombinant GII-3 variants
    ("GII-3", "P21"),  # Recombinant GII.P21-GII.3
    ("GII-3", "P12"),  # Recombinant GII.P12-GII.3
]

print("\n--- Selecting representatives for key combinations ---")
for capsid_target, poly_target in target_combos:
    # Find sequences with this exact combination
    matches = []
    for r in gii_records:
        capsid, polymerase = parse_genotypes(r.id)
        if capsid == capsid_target and polymerase == poly_target:
            # Check gap percentage
            gaps = str(r.seq).count("-")
            gap_pct = gaps / len(r.seq) * 100
            if gap_pct <= MAX_GAP_PERCENT:
                matches.append(r)

    if matches:
        # Sort by fewest gaps and take top N
        matches_sorted = sorted(matches, key=lambda r: str(r.seq).count("-"))
        n_to_take = min(REPS_PER_COMBO, len(matches_sorted))

        for best in matches_sorted[:n_to_take]:
            if best.id not in seen_ids:
                selected.append(best)
                seen_ids.add(best.id)
                gaps = str(best.seq).count("-")
                pct = gaps / len(best.seq) * 100
                print(f"  {capsid_target}/{poly_target}: {best.id} ({pct:.1f}% gaps)")

        if len(matches) < REPS_PER_COMBO:
            print(f"    (only {len(matches)} available)")
    else:
        print(f"  {capsid_target}/{poly_target}: No matches found")

print(f"\n{'=' * 60}")
print("Checking pairwise window overlaps...")
print(f"{'=' * 60}")

# Check all pairs
good_pairs = []
for r1, r2 in combinations(selected, 2):
    seq1 = str(r1.seq).upper()
    seq2 = str(r2.seq).upper()
    min_overlap, zero_windows, total_windows = check_window_overlaps(
        seq1, seq2, WINDOW_SIZE, STEP_SIZE
    )

    status = (
        "✓ OK" if zero_windows == 0 else f"✗ FAIL ({zero_windows} zero-overlap windows)"
    )
    print(f"\n{r1.id[:30]} vs {r2.id[:30]}")
    print(
        f"  Min overlap: {min_overlap}, Zero windows: {zero_windows}/{total_windows} {status}"
    )

    if zero_windows == 0:
        good_pairs.append((r1, r2))

print(f"\n{'=' * 60}")
print(f"Good pairs (zero zero-overlap windows): {len(good_pairs)}")

# Write a working subset if we found good pairs
if good_pairs:
    # Get unique sequences from good pairs
    good_seqs = set()
    for r1, r2 in good_pairs:
        good_seqs.add(r1.id)
        good_seqs.add(r2.id)

    print(f"\nSequences that work together: {good_seqs}")

    # Write them out
    output = [r for r in selected if r.id in good_seqs]
    with OUTPUT_FASTA.open("w") as f:
        SeqIO.write(output, f, "fasta")
    print(f"\nWrote {len(output)} sequences to {OUTPUT_FASTA}")
