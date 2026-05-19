#!/usr/bin/env python3
"""
Analyze the norovirus dataset for paper text generation.
Parses the FASTA headers and metadata to summarize:
- Number of sequences
- Genotype distribution (P-types and G-types)
- Geographic distribution
- Temporal range
- Recombinant patterns
"""

import csv
import re
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
AUGUR_DIR = SCRIPT_DIR.parent

# File paths - use the canonical publication alignment and matching metadata.
FASTA_FILE = AUGUR_DIR / "03_trimmed" / "subsampled_350_gappyout_final.fasta"
METADATA_FILE = AUGUR_DIR / "metadata" / "subsampled_350_metadata.csv"
OUTPUT_FILE = AUGUR_DIR / "paper_text_draft.tex"


def parse_metadata_csv(metadata_path):
    """
    Parse metadata CSV to extract genotype and geographic information.
    Uses ORF1_type (polymerase/P-type) and ORF2_type (capsid/G-type) columns.
    """
    sequences = []

    with open(metadata_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Extract genotypes from Nextclade columns
            # VP1_nextclade contains capsid type (e.g., GII.17)
            # RdRp_type contains polymerase type (e.g., GII.P17)
            g_type = row.get("VP1_nextclade", "") or row.get("ORF2_type", "")
            p_type_full = row.get("RdRp_type", "") or row.get("ORF1_type", "")

            # Extract P-number from RdRp_type (e.g., GII.P17 -> P17)
            p_type = None
            if p_type_full:
                match = re.search(r"P(\d+)", p_type_full)
                if match:
                    p_type = f"P{match.group(1)}"

            # Parse date for year
            date = row.get("date", "")
            year = None
            if date:
                # Handle formats like 2025-01-14 or 2025-XX-XX
                year_match = re.match(r"(\d{4})", date)
                if year_match:
                    year = year_match.group(1)

            sequences.append(
                {
                    "taxon": row.get("taxon", ""),
                    "accession": row.get("accession", ""),
                    "strain": row.get("strain", ""),
                    "g_type": g_type,
                    "p_type": p_type,
                    "p_type_full": p_type_full,
                    "country": row.get("country", ""),
                    "year": year,
                    "date": date,
                }
            )

    return sequences


def analyze_sequences(sequences):
    """Generate summary statistics from parsed sequences."""

    # Basic counts
    total = len(sequences)

    # Genotype distributions
    g_types = Counter(s["g_type"] for s in sequences if s["g_type"])
    p_types = Counter(s["p_type"] for s in sequences if s["p_type"])

    # Full genotype combinations (recombinants)
    genotype_combos = Counter(
        f"{s['p_type']}~{s['g_type']}" for s in sequences if s["p_type"] and s["g_type"]
    )

    # Geographic distribution
    countries = Counter(s["country"] for s in sequences if s["country"])

    # Temporal distribution
    years = Counter(s["year"] for s in sequences if s["year"])

    # Identify recombinants (where P-number != G-number)
    recombinants = []
    non_recombinants = []
    for s in sequences:
        if s["p_type"] and s["g_type"]:
            p_num = re.search(r"\d+", s["p_type"])
            g_num = re.search(r"\d+", s["g_type"])
            if p_num and g_num:
                if p_num.group() != g_num.group():
                    recombinants.append(s)
                else:
                    non_recombinants.append(s)

    return {
        "total": total,
        "g_types": g_types,
        "p_types": p_types,
        "genotype_combos": genotype_combos,
        "countries": countries,
        "years": years,
        "recombinants": recombinants,
        "non_recombinants": non_recombinants,
    }


def get_alignment_length(fasta_path):
    """Get the alignment length from the first sequence."""
    seq_lines = []
    with open(fasta_path, "r") as f:
        in_seq = False
        for line in f:
            if line.startswith(">"):
                if in_seq:
                    break
                in_seq = True
            elif in_seq:
                seq_lines.append(line.strip())

    return len("".join(seq_lines))


def generate_report(stats, alignment_length):
    """Generate a formatted report for paper text."""

    print("=" * 70)
    print("NOROVIRUS DATASET ANALYSIS FOR PAPER")
    print("=" * 70)

    # Basic stats
    print(f"\n📊 DATASET OVERVIEW")
    print(f"   Total sequences: {stats['total']}")
    print(
        f"   Alignment length: {alignment_length:,} bp (~{alignment_length / 1000:.1f} kb)"
    )

    # Temporal range
    years_sorted = sorted([y for y in stats["years"].keys() if y.isdigit() or "-" in y])
    if years_sorted:
        print(f"   Temporal range: {years_sorted[0]} to {years_sorted[-1]}")

    # Geographic
    print(f"\n🌍 GEOGRAPHIC DISTRIBUTION ({len(stats['countries'])} countries)")
    for country, count in stats["countries"].most_common(10):
        print(f"   {country}: {count} sequences ({100 * count / stats['total']:.1f}%)")
    if len(stats["countries"]) > 10:
        print(f"   ... and {len(stats['countries']) - 10} more countries")

    # Capsid genotypes (G-types)
    print(f"\n🧬 CAPSID GENOTYPES (VP1/ORF2) - {len(stats['g_types'])} types")
    for g_type, count in stats["g_types"].most_common():
        print(f"   {g_type}: {count} sequences ({100 * count / stats['total']:.1f}%)")

    # Polymerase genotypes (P-types)
    print(f"\n🔬 POLYMERASE GENOTYPES (RdRp/ORF1) - {len(stats['p_types'])} types")
    for p_type, count in stats["p_types"].most_common():
        print(f"   {p_type}: {count} sequences ({100 * count / stats['total']:.1f}%)")

    # Recombination analysis
    print(f"\n🔀 RECOMBINATION ANALYSIS")
    print(
        f"   Recombinant genotypes (P≠G number): {len(stats['recombinants'])} ({100 * len(stats['recombinants']) / stats['total']:.1f}%)"
    )
    print(
        f"   Non-recombinant genotypes (P=G number): {len(stats['non_recombinants'])} ({100 * len(stats['non_recombinants']) / stats['total']:.1f}%)"
    )

    # Top genotype combinations
    print(f"\n📋 GENOTYPE COMBINATIONS (P~G format) - Top 15")
    for combo, count in stats["genotype_combos"].most_common(15):
        # Mark recombinants
        parts = combo.split("~")
        if len(parts) == 2:
            p_num = re.search(r"\d+", parts[0])
            g_num = re.search(r"\d+", parts[1])
            is_recomb = (
                "🔀" if (p_num and g_num and p_num.group() != g_num.group()) else "  "
            )
        else:
            is_recomb = "  "
        print(f"   {is_recomb} {combo}: {count} sequences")

    # Year distribution
    print(f"\n📅 TEMPORAL DISTRIBUTION")
    for year, count in sorted(stats["years"].items()):
        bar = "█" * (count // 5) + "▌" * ((count % 5) >= 3)
        print(f"   {year}: {bar} {count}")

    print("\n" + "=" * 70)
    print("SUGGESTED PAPER TEXT")
    print("=" * 70)

    # Generate LaTeX-ready text
    generate_paper_text(stats, alignment_length)


def generate_paper_text(stats, alignment_length):
    """Generate LaTeX-formatted text for the paper."""

    # Get key statistics
    total = stats["total"]
    n_countries = len(stats["countries"])
    n_g_types = len(stats["g_types"])
    n_p_types = len(stats["p_types"])
    n_recombinants = len(stats["recombinants"])
    recomb_pct = 100 * n_recombinants / total

    # Top genotypes
    top_g = stats["g_types"].most_common(3)
    top_p = stats["p_types"].most_common(3)
    top_combos = stats["genotype_combos"].most_common(5)

    # Year range
    years = [
        y
        for y in stats["years"].keys()
        if y.replace("-", "").replace("X", "").isdigit()
    ]
    year_min = min(years) if years else "unknown"
    year_max = max(years) if years else "unknown"

    # Top countries
    top_countries = stats["countries"].most_common(5)

    text = f"""
\\subsection{{Norovirus Sliding-Window Analysis}}

Recombination is a key driver of Norovirus evolution, enabling rapid adaptation
and immune evasion. To capture this complexity, noroviruses are classified by
assigning two genotypes---one based on the polymerase gene and one based on the
capsid gene.

Open reading frame 1 (ORF1) encodes the RNA-dependent RNA polymerase (RdRp)
required for replication, while ORF2 encodes the major capsid protein (VP1),
the primary target of the host antibody response~\\citep{{Chhabra2019,Lindesmith2008}}.
Because ORF1 and ORF2 frequently recombine at their junction~\\citep{{Bull2005}},
a single classification based on capsid alone is insufficient.

The resulting notation takes the form GII.P\\textit{{x}}\\textasciitilde{{}}GII.\\textit{{y}},
where ``GII'' denotes genogroup II, ``P\\textit{{x}}'' is the polymerase genotype
(derived from the RdRp region in ORF1), and ``GII.\\textit{{y}}'' is the capsid
genotype (derived from VP1 in ORF2)~\\citep{{Chhabra2019}}.

To investigate how tree topology shifts across the recombination breakpoint---where
sequences transition from clustering by polymerase type to clustering by capsid
type---we performed a sliding-window phylogenetic analysis on a comprehensive
global dataset. We assembled {total} full-genome Norovirus sequences
({alignment_length:,}~bp alignment) from {n_countries} countries, spanning
{year_min} to {year_max}. The dataset encompasses {n_g_types} capsid genotypes
and {n_p_types} polymerase genotypes, with {n_recombinants} sequences
({recomb_pct:.1f}\\%) representing inter-genotype recombinants.

The dominant genotypes include {top_g[0][0]} (n={top_g[0][1]}), {top_g[1][0]}
(n={top_g[1][1]}), and {top_g[2][0]} (n={top_g[2][1]}) for capsid, and
{top_p[0][0]} (n={top_p[0][1]}), {top_p[1][0]} (n={top_p[1][1]}), and
{top_p[2][0]} (n={top_p[2][1]}) for polymerase. The most frequent genotype
combinations were {top_combos[0][0]} (n={top_combos[0][1]}),
{top_combos[1][0]} (n={top_combos[1][1]}), and {top_combos[2][0]}
(n={top_combos[2][1]}).

Geographic sampling included {top_countries[0][0]} (n={top_countries[0][1]}),
{top_countries[1][0]} (n={top_countries[1][1]}), {top_countries[2][0]}
(n={top_countries[2][1]}), {top_countries[3][0]} (n={top_countries[3][1]}),
and {top_countries[4][0]} (n={top_countries[4][1]}), among others.

Sequences were aligned using MAFFT v7.526~\\citep{{mafft2013}} and trimmed using
trimAl with the gappyout algorithm~\\citep{{trimal2009}}. For the sliding-window
analysis, we used a window size of 300~bp with a step size of 100~bp, generating
overlapping windows across the full genome alignment. For each window, a
phylogenetic tree was inferred using FastTree~\\citep{{Price2010}} with the
GTR model for nucleotide data.

All trees were midpoint-rooted for consistency, and pairwise Robinson--Foulds
distances were computed to quantify topological differences between adjacent
windows (Fig.~\\ref{{fig:phylo_movies_norovirus}}, distance chart). Sharp increases
in Robinson--Foulds distance indicate positions where tree topology changes
substantially---the expected signature of a recombination breakpoint.

At the ORF1/ORF2 junction (approximately position 5,100~bp), a pronounced shift
in tree topology is observed. In windows spanning the ORF1 region, sequences
cluster by polymerase genotype ({top_p[0][0]}, {top_p[1][0]}, etc.). As the
window crosses the junction into ORF2, the same sequences regroup by capsid
genotype ({top_g[0][0]}, {top_g[1][0]}, etc.). This transition is clearly
visible in the animated phylogeny, where clades reorganize as the window
traverses the recombination breakpoint.

For example, {top_combos[0][0]} genomes cluster with other {top_p[0][0]}
sequences in the polymerase region, but shift to cluster with {top_g[0][0]}
sequences in the capsid region. The animation captures these cluster
transitions in real time, providing an intuitive visualization of recombination
dynamics across the Norovirus genome.

Demonstrations are available in the supplementary video
(\\url{{https://www.youtube.com/watch?v=lqur97hfok0}}) and the live site
(\\url{{https://enesberksakalli.github.io/phylo-movies/}}).
"""

    print(text)

    # Also save to file
    with open(OUTPUT_FILE, "w") as f:
        f.write(text)
    print(f"\n✅ Text saved to: {OUTPUT_FILE}")


def main():
    print(f"Reading FASTA: {FASTA_FILE}")
    print(f"Reading Metadata: {METADATA_FILE}")

    if not FASTA_FILE.exists():
        print(f"❌ Error: FASTA file not found: {FASTA_FILE}")
        return

    if not METADATA_FILE.exists():
        print(f"❌ Error: Metadata file not found: {METADATA_FILE}")
        return

    # Parse sequences from metadata CSV (more complete info)
    sequences = parse_metadata_csv(METADATA_FILE)
    print(f"Parsed {len(sequences)} sequences from metadata")

    # Get alignment length from FASTA
    alignment_length = get_alignment_length(FASTA_FILE)
    print(f"Alignment length: {alignment_length:,} bp")

    # Analyze
    stats = analyze_sequences(sequences)

    # Generate report
    generate_report(stats, alignment_length)


if __name__ == "__main__":
    main()
