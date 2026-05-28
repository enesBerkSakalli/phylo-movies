#!/usr/bin/env python3
"""Generate synthetic scale fixtures with msprime.

The default output directory is intentionally git-ignored for ad hoc stress
tests. A small curated subset can be generated into publication_data and
committed as deterministic app-facing performance examples.
"""

from __future__ import annotations

import argparse
import random
import shutil
import subprocess
import sys
from pathlib import Path

import msprime


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT / "publication_data" / "scale_fixtures" / "generated"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate msprime-backed Newick tree fixtures for taxa scale testing."
    )
    parser.add_argument("--taxa", type=int, default=500, help="number of sampled taxa")
    parser.add_argument("--trees", type=int, default=25, help="number of marginal trees to emit")
    parser.add_argument("--sequence-length", type=float, default=1_000_000)
    parser.add_argument("--recombination-rate", type=float, default=1e-7)
    parser.add_argument("--population-size", type=float, default=10_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="directory for generated .nwk and metadata files",
    )
    parser.add_argument(
        "--run-brancharchitect",
        action="store_true",
        help="also run the BranchArchitect backend CLI when it is available",
    )
    parser.add_argument(
        "--independent-trees",
        action="store_true",
        help="simulate the requested number of independent single-tree replicates instead of marginal trees along one recombining sequence",
    )
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    dataset_stem = f"msprime_{args.taxa}taxa_{args.trees}trees_seed{args.seed}"
    tree_path = args.output_dir / f"{dataset_stem}.nwk"
    metadata_path = args.output_dir / f"{dataset_stem}.metadata.tsv"

    trees = simulate_trees(args)
    tree_path.write_text("".join(f"{tree}\n" for tree in trees), encoding="utf-8")
    metadata_path.write_text(render_metadata(args, tree_path), encoding="utf-8")

    print(f"wrote {display_path(tree_path)}")
    print(f"wrote {display_path(metadata_path)}")

    if args.run_brancharchitect:
        return run_brancharchitect(tree_path, args.output_dir)

    return 0


def simulate_trees(args: argparse.Namespace) -> list[str]:
    if args.independent_trees:
        return simulate_independent_trees(args)

    ts = msprime.sim_ancestry(
        samples=args.taxa,
        ploidy=1,
        sequence_length=args.sequence_length,
        recombination_rate=args.recombination_rate,
        population_size=args.population_size,
        random_seed=args.seed,
    )
    tree_strings = [
        normalize_taxa_labels(tree.as_newick(root=tree.root))
        for tree in ts.trees()
        if tree.has_single_root
    ]

    if not tree_strings:
        raise RuntimeError("msprime produced no single-root marginal trees")

    rng = random.Random(args.seed)
    if len(tree_strings) >= args.trees:
        indexes = sorted(rng.sample(range(len(tree_strings)), args.trees))
        return [tree_strings[index] for index in indexes]

    return [tree_strings[index % len(tree_strings)] for index in range(args.trees)]


def simulate_independent_trees(args: argparse.Namespace) -> list[str]:
    trees = []
    for tree_index in range(args.trees):
        ts = msprime.sim_ancestry(
            samples=args.taxa,
            ploidy=1,
            sequence_length=1,
            recombination_rate=0,
            population_size=args.population_size,
            random_seed=args.seed + tree_index,
        )
        tree = next((tree for tree in ts.trees() if tree.has_single_root), None)
        if tree is None:
            raise RuntimeError(f"msprime produced no single-root tree for replicate {tree_index}")
        trees.append(normalize_taxa_labels(tree.as_newick(root=tree.root)))
    return trees


def normalize_taxa_labels(newick: str) -> str:
    for node_id in range(10_000, -1, -1):
        newick = newick.replace(f"n{node_id}:", f"Taxon_{node_id + 1}:")
    return newick


def display_path(file_path: Path) -> str:
    try:
        return str(file_path.relative_to(ROOT))
    except ValueError:
        return str(file_path)


def render_metadata(args: argparse.Namespace, tree_path: Path) -> str:
    mode = (
        "independent_single_tree_replicates"
        if args.independent_trees
        else "recombining_sequence_marginal_trees"
    )
    sequence_length = 1 if args.independent_trees else args.sequence_length
    recombination_rate = 0 if args.independent_trees else args.recombination_rate

    return "\n".join(
        [
            "key\tvalue",
            f"generator\tmsprime",
            f"mode\t{mode}",
            f"taxa\t{args.taxa}",
            f"trees\t{args.trees}",
            f"sequence_length\t{sequence_length:g}",
            f"recombination_rate\t{recombination_rate:g}",
            f"population_size\t{args.population_size:g}",
            f"seed\t{args.seed}",
            f"independent_trees\t{args.independent_trees}",
            f"tree_file\t{tree_path.name}",
            "",
        ]
    )


def run_brancharchitect(tree_path: Path, output_dir: Path) -> int:
    runner = ROOT / "engine" / "BranchArchitect" / "run_pipeline.py"
    if not runner.exists():
        print(f"BranchArchitect runner not found at {runner}", file=sys.stderr)
        return 1

    python = shutil.which("python3") or sys.executable
    command = [
        python,
        str(runner),
        str(tree_path),
        "--output",
        str(output_dir / f"{tree_path.stem}.response.json"),
    ]
    print("running " + " ".join(command))
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
