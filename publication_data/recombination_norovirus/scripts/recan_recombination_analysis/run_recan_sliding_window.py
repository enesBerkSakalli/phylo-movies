#!/usr/bin/env python
"""
Run the norovirus ReCAN-style sliding-window recombination analysis.

The publication query must be selected by stable FASTA ID, not by row index:
MK753032_P16_GII-4. Numeric indices changed when the working subset changed.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[3]


def config_path(env_name: str, default: str | Path) -> Path:
    path = Path(os.environ.get(env_name, str(default)))
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


DEFAULT_FASTA = config_path(
    "RECAN_WORKING_SUBSET",
    "publication_data/recombination_norovirus/source_alignments/"
    "recan_working_subset_48taxa_8058bp.fasta",
)
DEFAULT_QUERY_ID = os.environ.get("RECAN_QUERY_ID", "MK753032_P16_GII-4")
DEFAULT_WINDOW_SIZE = int(os.environ.get("RECAN_WINDOW_SIZE", "500"))
DEFAULT_STEP_SIZE = int(os.environ.get("RECAN_STEP_SIZE", "250"))
DEFAULT_DISTANCE_METHOD = os.environ.get("RECAN_DISTANCE_METHOD", "pdist")
DEFAULT_ORF_JUNCTION = int(os.environ.get("RECAN_ORF_JUNCTION", "5000"))
DEFAULT_OUTPUT_BASE = config_path(
    "RECAN_OUTPUT_BASE",
    "publication_data/recombination_norovirus/runs",
)

GROUP_RULES = [
    ("GII.P16-GII.16 non-recombinant (P16 polymerase donor)", "P16_GII-16"),
    ("GII.P4-GII.4 non-recombinant", "P4_GII-4"),
    ("GII.P2-GII.2 non-recombinant", "P2_GII-2"),
    ("GII.P17-GII.17 non-recombinant", "P17_GII-17"),
    ("GII.P3-GII.3 non-recombinant", "P3_GII-3"),
    ("GII.P7-GII.6 non-recombinant", "P7_GII-6"),
    ("GII.P7-GII.7 non-recombinant", "P7_GII-7"),
    ("GII.P16-GII.4 same recombinant genotype controls", "P16_GII-4"),
    ("GII.P31-GII.4 recombinant controls", "P31_GII-4"),
    ("GII.P16-GII.2 recombinant controls", "P16_GII-2"),
    ("GII.P21-GII.2 recombinant controls", "P21_GII-2"),
    ("GII.P21-GII.3 recombinant controls", "P21_GII-3"),
    ("GII.P12-GII.3 recombinant controls", "P12_GII-3"),
]

GROUP_COLORS = {
    "GII.P16-GII.16 non-recombinant (P16 polymerase donor)": "#E63946",
    "GII.P4-GII.4 non-recombinant": "#2A9D8F",
    "GII.P2-GII.2 non-recombinant": "#457B9D",
    "GII.P17-GII.17 non-recombinant": "#6A4C93",
    "GII.P3-GII.3 non-recombinant": "#1D3557",
    "GII.P7-GII.6 non-recombinant": "#606C38",
    "GII.P7-GII.7 non-recombinant": "#283618",
    "GII.P16-GII.4 same recombinant genotype controls": "#F4A261",
    "GII.P31-GII.4 recombinant controls": "#E9C46A",
    "GII.P16-GII.2 recombinant controls": "#A8DADC",
    "GII.P21-GII.2 recombinant controls": "#B5838D",
    "GII.P21-GII.3 recombinant controls": "#BC6C25",
    "GII.P12-GII.3 recombinant controls": "#DDA15E",
}

CAPSID_ORDER = ["GII-2", "GII-3", "GII-4", "GII-6", "GII-7", "GII-16", "GII-17"]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def timestamped_output_dir(query_id: str, window_size: int, step_size: int) -> Path:
    stamp = datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
    safe_query = query_id.replace("|", "_").replace("/", "_")
    return DEFAULT_OUTPUT_BASE / f"run_{stamp}_query-{safe_query}_win{window_size}_step{step_size}"


def classify_group(seq_id: str) -> str:
    for label, token in GROUP_RULES:
        if token in seq_id:
            return label
    return "Other"


def capsid_for_group(group_name: str) -> str:
    for capsid in CAPSID_ORDER:
        dotted = capsid.replace("-", ".")
        if capsid in group_name or dotted in group_name:
            return capsid
    return "Other"


def ordered_groups_present(columns: list[str]) -> OrderedDict[str, list[str]]:
    groups: OrderedDict[str, list[str]] = OrderedDict()
    for label, _ in GROUP_RULES:
        groups[label] = []
    groups["Other"] = []

    for seq_id in columns:
        groups[classify_group(seq_id)].append(seq_id)

    return OrderedDict((group, ids) for group, ids in groups.items() if ids)


def write_order_tables(output_dir: Path, sequence_rows: list[dict], groups: OrderedDict[str, list[str]]) -> None:
    sequence_order_path = output_dir / "sequence_order.tsv"
    with sequence_order_path.open("w", encoding="utf-8") as handle:
        handle.write("alignment_index\tsequence_id\trole\treference_group\n")
        for row in sequence_rows:
            handle.write(
                f"{row['alignment_index']}\t{row['sequence_id']}\t"
                f"{row['role']}\t{row['reference_group']}\n"
            )

    group_order_path = output_dir / "reference_group_order.tsv"
    with group_order_path.open("w", encoding="utf-8") as handle:
        handle.write("plot_order\treference_group\tsequence_count\tsequence_ids\n")
        for idx, (group, ids) in enumerate(groups.items(), start=1):
            handle.write(f"{idx}\t{group}\t{len(ids)}\t{';'.join(ids)}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the norovirus sliding-window recombination analysis with auditable outputs."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_FASTA, help="Aligned FASTA subset.")
    parser.add_argument("--query-id", default=DEFAULT_QUERY_ID, help="Stable FASTA ID of the suspected recombinant.")
    parser.add_argument("--window-size", type=int, default=DEFAULT_WINDOW_SIZE, help="Sliding-window size in bp.")
    parser.add_argument("--step-size", type=int, default=DEFAULT_STEP_SIZE, help="Sliding-window step in bp.")
    parser.add_argument(
        "--distance-method",
        default=DEFAULT_DISTANCE_METHOD,
        choices=["pdist", "jcd", "k2p", "td"],
        help="Distance/similarity method passed to recan.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory. Defaults to a timestamped directory under recan_recombination_analysis/runs/.",
    )
    return parser.parse_args()


def run_analysis(args: argparse.Namespace) -> Path:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import pandas as pd
        from recan.calc_pairwise_distance import calc_pairwise_distance
        from recan.rolling_window import RollingWindowOnAlignment
    except ImportError as exc:
        print(
            "ERROR: missing Python dependency. Install with:\n"
            "  python -m pip install recan biopython pandas matplotlib\n"
            f"Original error: {exc}",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    input_fasta = args.input.resolve()
    if not input_fasta.exists():
        raise SystemExit(f"ERROR: input FASTA not found: {input_fasta}")

    output_dir = args.output_dir or timestamped_output_dir(
        args.query_id, args.window_size, args.step_size
    )
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=False)

    print("=" * 60)
    print("Norovirus Recombination Analysis")
    print("=" * 60)
    print(f"Input FASTA: {input_fasta}")
    print(f"Output directory: {output_dir}")

    rw = RollingWindowOnAlignment(str(input_fasta))
    sequence_ids = [seq.id for seq in rw.align]
    if args.query_id not in sequence_ids:
        raise SystemExit(f"ERROR: query ID not found in FASTA: {args.query_id}")

    query_index = sequence_ids.index(args.query_id)
    query_id = rw.align[query_index].id
    alignment_length = rw.align.get_alignment_length()

    print("\n--- Alignment Information ---")
    print("index:\tsequence id:")
    for idx, seq_id in enumerate(sequence_ids):
        marker = " [QUERY]" if seq_id == query_id else ""
        print(f"{idx}\t{seq_id}{marker}")
    print(f"alignment length: {alignment_length}")

    print("\n--- Analysis Parameters ---")
    print(f"Window size: {args.window_size} bp")
    print(f"Step size: {args.step_size} bp")
    print(f"Potential recombinant: {query_id} (index {query_index})")
    print(f"Distance method: {args.distance_method}")
    print(f"ORF1/ORF2 junction annotation: {DEFAULT_ORF_JUNCTION} bp")

    print("\n--- Running Sliding Window Analysis ---")
    align_sliced = rw.roll_window_along_alignment(
        window_len=args.window_size, window_step=args.step_size
    )

    distance_data = {seq.id: [] for seq in rw.align if seq.id != query_id}
    x_positions = []

    for window_borders, alignment_slice in align_sliced.items():
        middle = (window_borders[1] - window_borders[0]) / 2 + window_borders[0]
        x_positions.append(middle)
        query_seq = alignment_slice[query_index].seq

        for seq in alignment_slice:
            if seq.id == query_id:
                continue
            similarity = calc_pairwise_distance(
                seq1=query_seq, seq2=seq.seq, dist_method=args.distance_method
            )
            distance_data[seq.id].append(similarity if similarity is not None else None)

    print(f"Analyzed {len(x_positions)} windows")

    df = pd.DataFrame(distance_data, index=x_positions)
    df.index.name = "Position"
    if query_id in df.columns:
        raise SystemExit("ERROR: query sequence leaked into reference output columns")

    similarity_csv = output_dir / "recan_similarity_data.csv"
    df.to_csv(similarity_csv)
    print(f"\nRaw data saved to: {similarity_csv}")

    print("\n--- Grouping by Parental Lineage ---")
    groups = ordered_groups_present(list(df.columns))
    df_grouped = pd.DataFrame(index=df.index)
    for group, columns in groups.items():
        df_grouped[group] = df[columns].mean(axis=1)
        print(f"  {group}: {len(columns)} sequences")

    grouped_csv = output_dir / "recan_grouped_similarity.csv"
    df_grouped.to_csv(grouped_csv)
    print(f"\nGrouped data saved to: {grouped_csv}")

    sequence_rows = []
    for idx, seq_id in enumerate(sequence_ids):
        role = "query" if seq_id == query_id else "reference"
        sequence_rows.append(
            {
                "alignment_index": idx,
                "sequence_id": seq_id,
                "role": role,
                "reference_group": "query" if role == "query" else classify_group(seq_id),
            }
        )
    write_order_tables(output_dir, sequence_rows, groups)

    plot_order = [group for group in groups.keys() if group != "Other"]

    print("\n--- Generating Grouped Plot ---")
    fig, ax = plt.subplots(figsize=(16, 8))
    for group in plot_order:
        color = GROUP_COLORS.get(group, "#888888")
        is_nonrecomb = "non-recombinant" in group
        linewidth = 2.5 if is_nonrecomb else 1.8
        linestyle = "-" if is_nonrecomb else "--"
        ax.plot(
            df_grouped.index,
            df_grouped[group],
            label=group,
            color=color,
            linewidth=linewidth,
            linestyle=linestyle,
        )

    ax.axvline(x=DEFAULT_ORF_JUNCTION, color="gray", linestyle=":", linewidth=2, alpha=0.7)
    ax.text(DEFAULT_ORF_JUNCTION + 100, ax.get_ylim()[1] * 0.95, "ORF1/ORF2\njunction", fontsize=10, color="gray")
    ax.text(2500, ax.get_ylim()[0] + 0.02, "ORF1 (Polymerase)", fontsize=11, ha="center", color="#666", style="italic")
    ax.text(6500, ax.get_ylim()[0] + 0.02, "ORF2 (Capsid)", fontsize=11, ha="center", color="#666", style="italic")
    ax.set_xlabel("Genomic Position (bp)", fontsize=12)
    ax.set_ylabel("Sequence Similarity to Query", fontsize=12)
    ax.set_title(f"Recombination Analysis: {query_id}\n(GII.P16-GII.4 recombinant)", fontsize=14)
    ax.legend(loc="upper left", fontsize=9, framealpha=0.9)
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, alignment_length)
    plt.tight_layout()

    grouped_png = output_dir / "recan_recombination_plot.png"
    plt.savefig(grouped_png, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Recombination plot saved to: {grouped_png}")

    all_png = output_dir / "recan_all_sequences_plot.png"
    plt.figure(figsize=(14, 6))
    for col in df.columns:
        plt.plot(df.index, df[col], label=col, linewidth=0.8, alpha=0.7)
    plt.xlabel("Nucleotide Position", fontsize=12)
    plt.ylabel("Sequence Similarity", fontsize=12)
    plt.title(f"All Sequences Similarity Plot\nQuery: {query_id}", fontsize=14)
    plt.legend(loc="upper right", fontsize=6, ncol=2)
    plt.grid(True, alpha=0.3)
    plt.savefig(all_png, dpi=150, bbox_inches="tight")
    plt.close()

    print("\n--- Generating Plots Grouped by Capsid (G) ---")
    capsid_groups: dict[str, list[str]] = {}
    for group in plot_order:
        capsid = capsid_for_group(group)
        capsid_groups.setdefault(capsid, []).append(group)
    capsid_groups = {capsid: labels for capsid, labels in capsid_groups.items() if len(labels) > 1}
    capsids = [capsid for capsid in CAPSID_ORDER if capsid in capsid_groups]
    print(f"  Found {len(capsids)} capsid groups (with >1 group): {capsids}")

    capsid_png = None
    if capsids:
        n_cols = 3
        n_rows = max(1, (len(capsids) + n_cols - 1) // n_cols)
        fig_combined, axes = plt.subplots(n_rows, n_cols, figsize=(18, 4 * n_rows))
        if len(capsids) == 1:
            axes = [axes]
        else:
            axes = axes.flatten()

        for idx, capsid in enumerate(capsids):
            ax = axes[idx]
            highlighted = capsid_groups[capsid]
            for group in plot_order:
                is_nonrecomb = "non-recombinant" in group
                linestyle = "-" if is_nonrecomb else "--"
                if group in highlighted:
                    ax.plot(
                        df_grouped.index,
                        df_grouped[group],
                        color=GROUP_COLORS.get(group, "#888888"),
                        linewidth=2.5,
                        linestyle=linestyle,
                        alpha=1.0,
                        zorder=10,
                        label=group,
                    )
                else:
                    ax.plot(
                        df_grouped.index,
                        df_grouped[group],
                        color="#CCCCCC",
                        linewidth=1.0,
                        linestyle=linestyle,
                        alpha=0.4,
                        zorder=1,
                    )
            ax.axvline(x=DEFAULT_ORF_JUNCTION, color="gray", linestyle=":", linewidth=1.5, alpha=0.5)
            ax.set_xlim(0, alignment_length)
            ax.set_ylim(0.0, 1.0)
            ax.grid(True, alpha=0.2)
            ax.set_title(f"Capsid: {capsid}", fontsize=12, fontweight="bold")
            ax.legend(loc="lower left", fontsize=7, framealpha=0.9)
            if idx >= (n_rows - 1) * n_cols:
                ax.set_xlabel("Position (bp)", fontsize=9)
            if idx % n_cols == 0:
                ax.set_ylabel("Similarity", fontsize=9)
            ax.tick_params(labelsize=8)

        for idx in range(len(capsids), len(axes)):
            axes[idx].set_visible(False)

        date_str = datetime.now().astimezone().strftime("%Y-%m-%d")
        fig_combined.suptitle(
            f"Norovirus Sliding Window Recombination Analysis\nQuery: {query_id} | {date_str}",
            fontsize=14,
            fontweight="bold",
            y=1.02,
        )
        plt.tight_layout()
        capsid_png = output_dir / "norovirus_recombination_by_capsid.png"
        plt.savefig(capsid_png, dpi=150, bbox_inches="tight")
        plt.close(fig_combined)
        print(f"  Capsid-highlight plot saved to: {capsid_png}")

    manifest = {
        "created_at": datetime.now().astimezone().isoformat(),
        "script": str(Path(__file__).resolve()),
        "input_fasta": str(input_fasta),
        "input_fasta_sha256": sha256_file(input_fasta),
        "input_sequence_count": len(sequence_ids),
        "alignment_length": alignment_length,
        "query_id": query_id,
        "query_alignment_index": query_index,
        "window_size": args.window_size,
        "step_size": args.step_size,
        "distance_method": args.distance_method,
        "orf_junction_annotation": DEFAULT_ORF_JUNCTION,
        "window_count": len(x_positions),
        "reference_count": len(df.columns),
        "outputs": {
            "similarity_csv": similarity_csv.name,
            "grouped_similarity_csv": grouped_csv.name,
            "sequence_order": "sequence_order.tsv",
            "reference_group_order": "reference_group_order.tsv",
            "grouped_plot": grouped_png.name,
            "all_sequences_plot": all_png.name,
            "capsid_plot": capsid_png.name if capsid_png else None,
        },
        "software": {
            "python": platform.python_version(),
            "recan": package_version("recan"),
            "biopython": package_version("biopython"),
            "pandas": package_version("pandas"),
            "matplotlib": package_version("matplotlib"),
        },
    }
    manifest_path = output_dir / "run_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print("\n" + "=" * 60)
    print("Analysis Complete")
    print("=" * 60)
    print(f"Run directory: {output_dir}")
    print(f"Manifest: {manifest_path}")
    print("\nInterpretation checks:")
    print("  - P16 donor controls should be comparatively high in ORF1.")
    print("  - GII.4 capsid controls should be comparatively high in ORF2.")
    print("  - A crossover near the ORF1/ORF2 junction supports recombination.")

    return output_dir


if __name__ == "__main__":
    run_analysis(parse_args())
