#!/usr/bin/env python3
"""Generate secondary RF-distance orderings for bootstrap example trees."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


ROOT = Path(__file__).resolve().parents[1]
BRANCHARCHITECT_ROOT = ROOT / "engine" / "BranchArchitect"
if str(BRANCHARCHITECT_ROOT) not in sys.path:
    sys.path.insert(0, str(BRANCHARCHITECT_ROOT))

from brancharchitect.distances.distances import _unrooted_internal_bipartitions  # noqa: E402
from brancharchitect.movie_pipeline.tree_rooting import root_trees  # noqa: E402
from brancharchitect.movie_pipeline.types import PAIR_METRIC_SEMANTICS  # noqa: E402
from brancharchitect.parser import parse_newick  # noqa: E402


CURRENT_ROOT = ROOT / "publication_data" / "bootstrap_rogue_taxa" / "current_results"
SUMMARY_PATH = CURRENT_ROOT / "TREE_DISTANCE_ORDERING_SUMMARY.json"


@dataclass(frozen=True)
class DatasetSpec:
    dataset: str
    label: str
    directory: Path
    tree_path: Path
    order_path: Path


@dataclass(frozen=True)
class TreeRecord:
    matrix_index: int
    composition_order: int
    ranked_newick_line: int
    bootstrap_replicate_id: str
    bootstrap_replicate_index_zero_based: int
    source_replicate_alignment_file: str
    composition_distance_to_source_alignment: float
    newick: str


@dataclass(frozen=True)
class PathMethod:
    key: str
    label: str
    primary_metric: str
    secondary_metric: str
    order_filename_template: str
    tree_filename_template: str


PATH_METHODS = [
    PathMethod(
        key="rf_nearest_neighbor_2opt",
        label="RF nearest-neighbor plus 2-opt",
        primary_metric="robinson_foulds",
        secondary_metric="weighted_robinson_foulds",
        order_filename_template="rf_nearest_neighbor_order_{label}.tsv",
        tree_filename_template="rf_nearest_neighbor_all_trees_{label}.nwk",
    ),
    PathMethod(
        key="weighted_rf_nearest_neighbor_2opt",
        label="Weighted RF nearest-neighbor plus 2-opt",
        primary_metric="weighted_robinson_foulds",
        secondary_metric="robinson_foulds",
        order_filename_template="weighted_rf_nearest_neighbor_order_{label}.tsv",
        tree_filename_template="weighted_rf_nearest_neighbor_all_trees_{label}.nwk",
    ),
]


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_non_empty_lines(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_order_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def write_or_check(path: Path, content: str, check: bool) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    digest = sha256_text(content)
    if check:
        if not path.exists():
            raise RuntimeError(f"missing generated file: {path.relative_to(ROOT)}")
        current = path.read_text(encoding="utf-8")
        if current != content:
            raise RuntimeError(f"stale generated file: {path.relative_to(ROOT)}")
    else:
        path.write_text(content, encoding="utf-8")
    return digest


def dataset_specs() -> list[DatasetSpec]:
    specs: list[DatasetSpec] = []
    for dataset in ("24", "125"):
        matching = sorted(CURRENT_ROOT.glob(f"dataset_{dataset}_source-*_taxa*_sites*"))
        if len(matching) != 1:
            raise RuntimeError(f"expected one current-results directory for dataset {dataset}, found {len(matching)}")
        directory = matching[0]
        label = directory.name.removeprefix("dataset_")
        tree_path = directory / "ranked" / f"all_trees_{label}.nwk"
        order_path = directory / "ranked" / f"composition_ranked_bootstrap_replicates_{label}.tsv"
        specs.append(
            DatasetSpec(
                dataset=dataset,
                label=label,
                directory=directory,
                tree_path=tree_path,
                order_path=order_path,
            )
        )
    return specs


def load_records(spec: DatasetSpec) -> list[TreeRecord]:
    tree_lines = read_non_empty_lines(spec.tree_path)
    order_rows = read_order_rows(spec.order_path)
    if len(tree_lines) != len(order_rows):
        raise RuntimeError(
            f"{spec.label} has {len(tree_lines)} trees but {len(order_rows)} order rows"
        )

    records: list[TreeRecord] = []
    for matrix_index, (newick, row) in enumerate(zip(tree_lines, order_rows)):
        records.append(
            TreeRecord(
                matrix_index=matrix_index,
                composition_order=int(row["display_order"]),
                ranked_newick_line=int(row["ranked_newick_line"]),
                bootstrap_replicate_id=row["bootstrap_replicate_id"],
                bootstrap_replicate_index_zero_based=int(row["bootstrap_replicate_index_zero_based"]),
                source_replicate_alignment_file=row["source_replicate_alignment_file"],
                composition_distance_to_source_alignment=float(
                    row["composition_distance_to_source_alignment"]
                ),
                newick=newick,
            )
        )
    return records


def parse_trees(records: Sequence[TreeRecord]):
    newick_text = "\n".join(record.newick for record in records) + "\n"
    trees = parse_newick(newick_text, force_list=True)
    if len(trees) != len(records):
        raise RuntimeError(f"parsed {len(trees)} trees from {len(records)} records")
    return trees


def prepare_trees_for_distance_metrics(trees):
    """Match Phylo-Movies bootstrap fixture preprocessing before RF/WRF metrics."""
    for tree in trees:
        tree.collapse_unary_internal_nodes(preserve_lengths=True)
    rooted_trees = root_trees(trees)
    for tree in rooted_trees:
        tree.collapse_unary_internal_nodes(preserve_lengths=True)
    return rooted_trees


def precompute_split_data(trees) -> tuple[list[set], list[dict]]:
    rf_splits = [_unrooted_internal_bipartitions(tree) for tree in trees]
    weighted_splits = [tree.to_weighted_splits() for tree in trees]
    return rf_splits, weighted_splits


def compute_distance_matrices(trees) -> dict[str, list[list[float]]]:
    rf_splits, weighted_splits = precompute_split_data(trees)
    n_trees = len(trees)
    rf_matrix = [[0.0 for _ in range(n_trees)] for _ in range(n_trees)]
    weighted_matrix = [[0.0 for _ in range(n_trees)] for _ in range(n_trees)]

    for left in range(n_trees):
        left_rf = rf_splits[left]
        left_weighted = weighted_splits[left]
        for right in range(left + 1, n_trees):
            right_rf = rf_splits[right]
            rf_denominator = len(left_rf) + len(right_rf)
            rf_distance = (
                len(left_rf ^ right_rf) / rf_denominator if rf_denominator else 0.0
            )

            right_weighted = weighted_splits[right]
            all_weighted_splits = set(left_weighted) | set(right_weighted)
            weighted_distance = sum(
                abs(left_weighted.get(split, 0.0) - right_weighted.get(split, 0.0))
                for split in all_weighted_splits
            )

            rf_matrix[left][right] = rf_matrix[right][left] = rf_distance
            weighted_matrix[left][right] = weighted_matrix[right][left] = weighted_distance

    return {
        "robinson_foulds": rf_matrix,
        "weighted_robinson_foulds": weighted_matrix,
    }


def pair_distance(matrices: dict[str, list[list[float]]], metric: str, left: int, right: int) -> float:
    return matrices[metric][left][right]


def medoid_start(
    records: Sequence[TreeRecord],
    matrices: dict[str, list[list[float]]],
    primary_metric: str,
    secondary_metric: str,
) -> int:
    candidates = []
    for record in records:
        index = record.matrix_index
        candidates.append(
            (
                sum(matrices[primary_metric][index]),
                sum(matrices[secondary_metric][index]),
                record.composition_order,
                record.bootstrap_replicate_index_zero_based,
                index,
            )
        )
    return min(candidates)[-1]


def greedy_nearest_neighbor_path(
    records: Sequence[TreeRecord],
    matrices: dict[str, list[list[float]]],
    primary_metric: str,
    secondary_metric: str,
) -> list[int]:
    record_by_index = {record.matrix_index: record for record in records}
    start = medoid_start(records, matrices, primary_metric, secondary_metric)
    unvisited = set(record_by_index)
    unvisited.remove(start)
    path = [start]

    while unvisited:
        current = path[-1]
        next_index = min(
            unvisited,
            key=lambda candidate: (
                pair_distance(matrices, primary_metric, current, candidate),
                pair_distance(matrices, secondary_metric, current, candidate),
                record_by_index[candidate].composition_order,
                record_by_index[candidate].bootstrap_replicate_index_zero_based,
            ),
        )
        unvisited.remove(next_index)
        path.append(next_index)

    return path


def path_cost(
    path: Sequence[int],
    matrices: dict[str, list[list[float]]],
    primary_metric: str,
    secondary_metric: str,
) -> tuple[float, float]:
    primary = 0.0
    secondary = 0.0
    for left, right in zip(path, path[1:]):
        primary += pair_distance(matrices, primary_metric, left, right)
        secondary += pair_distance(matrices, secondary_metric, left, right)
    return primary, secondary


def better_cost(candidate: tuple[float, float], current: tuple[float, float]) -> bool:
    epsilon = 1e-12
    if candidate[0] < current[0] - epsilon:
        return True
    if abs(candidate[0] - current[0]) <= epsilon and candidate[1] < current[1] - epsilon:
        return True
    return False


def two_opt_path(
    initial_path: Sequence[int],
    matrices: dict[str, list[list[float]]],
    primary_metric: str,
    secondary_metric: str,
) -> tuple[list[int], int]:
    """Deterministic 2-opt improvement while keeping the medoid start fixed."""
    path = list(initial_path)
    if len(path) < 4:
        return path, 0

    iterations = 0
    improved = True
    while improved:
        improved = False
        current_cost = path_cost(path, matrices, primary_metric, secondary_metric)
        for start in range(1, len(path) - 2):
            for end in range(start + 1, len(path) - 1):
                candidate = path[:start] + list(reversed(path[start : end + 1])) + path[end + 1 :]
                candidate_cost = path_cost(candidate, matrices, primary_metric, secondary_metric)
                if better_cost(candidate_cost, current_cost):
                    path = candidate
                    current_cost = candidate_cost
                    improved = True
                    iterations += 1
        # Run full deterministic passes until no improving reversal remains.
    return path, iterations


def build_path(
    records: Sequence[TreeRecord],
    matrices: dict[str, list[list[float]]],
    method: PathMethod,
) -> tuple[list[int], int]:
    initial = greedy_nearest_neighbor_path(
        records,
        matrices,
        method.primary_metric,
        method.secondary_metric,
    )
    return two_opt_path(initial, matrices, method.primary_metric, method.secondary_metric)


def adjacent_metric_values(
    path: Sequence[int],
    matrices: dict[str, list[list[float]]],
    metric: str,
) -> list[float]:
    return [pair_distance(matrices, metric, left, right) for left, right in zip(path, path[1:])]


def summarize_values(values: Sequence[float]) -> dict[str, float | int]:
    if not values:
        return {
            "total": 0.0,
            "mean": 0.0,
            "median": 0.0,
            "min": 0.0,
            "max": 0.0,
            "zero_count": 0,
            "nonzero_count": 0,
        }
    sorted_values = sorted(values)
    middle = len(sorted_values) // 2
    median = (
        sorted_values[middle]
        if len(sorted_values) % 2
        else (sorted_values[middle - 1] + sorted_values[middle]) / 2
    )
    return {
        "total": sum(values),
        "mean": sum(values) / len(values),
        "median": median,
        "min": sorted_values[0],
        "max": sorted_values[-1],
        "zero_count": sum(1 for value in values if value == 0),
        "nonzero_count": sum(1 for value in values if value != 0),
    }


def summarize_path(
    path: Sequence[int],
    matrices: dict[str, list[list[float]]],
    method_key: str,
    method_label: str,
    two_opt_improvements: int = 0,
) -> dict:
    rf_values = adjacent_metric_values(path, matrices, "robinson_foulds")
    weighted_values = adjacent_metric_values(path, matrices, "weighted_robinson_foulds")
    return {
        "method": method_key,
        "method_label": method_label,
        "tree_count": len(path),
        "adjacent_pair_count": max(0, len(path) - 1),
        "start_matrix_index": path[0] if path else None,
        "two_opt_improvements": two_opt_improvements,
        "robinson_foulds": summarize_values(rf_values),
        "weighted_robinson_foulds": summarize_values(weighted_values),
    }


def format_float(value: float) -> str:
    if not math.isfinite(value):
        return ""
    return f"{value:.9f}".rstrip("0").rstrip(".")


def order_tsv(
    path: Sequence[int],
    records: Sequence[TreeRecord],
    matrices: dict[str, list[list[float]]],
    method: PathMethod,
) -> str:
    record_by_index = {record.matrix_index: record for record in records}
    header = [
        "distance_order",
        "source_ranked_newick_line",
        "source_composition_order",
        "bootstrap_replicate_id",
        "bootstrap_replicate_index_zero_based",
        "source_replicate_alignment_file",
        "composition_distance_to_source_alignment",
        "previous_robinson_foulds",
        "previous_weighted_robinson_foulds",
        "cumulative_robinson_foulds",
        "cumulative_weighted_robinson_foulds",
        "primary_metric",
        "secondary_metric",
        "path_method",
    ]
    rows = ["\t".join(header)]
    cumulative_rf = 0.0
    cumulative_weighted = 0.0
    previous_index: int | None = None
    for order_index, matrix_index in enumerate(path, start=1):
        record = record_by_index[matrix_index]
        previous_rf = 0.0
        previous_weighted = 0.0
        if previous_index is not None:
            previous_rf = pair_distance(matrices, "robinson_foulds", previous_index, matrix_index)
            previous_weighted = pair_distance(
                matrices,
                "weighted_robinson_foulds",
                previous_index,
                matrix_index,
            )
            cumulative_rf += previous_rf
            cumulative_weighted += previous_weighted
        rows.append(
            "\t".join(
                [
                    str(order_index),
                    str(record.ranked_newick_line),
                    str(record.composition_order),
                    record.bootstrap_replicate_id,
                    str(record.bootstrap_replicate_index_zero_based),
                    record.source_replicate_alignment_file,
                    format_float(record.composition_distance_to_source_alignment),
                    format_float(previous_rf),
                    format_float(previous_weighted),
                    format_float(cumulative_rf),
                    format_float(cumulative_weighted),
                    method.primary_metric,
                    method.secondary_metric,
                    method.key,
                ]
            )
        )
        previous_index = matrix_index
    return "\n".join(rows) + "\n"


def reordered_newick(path: Sequence[int], records: Sequence[TreeRecord]) -> str:
    record_by_index = {record.matrix_index: record for record in records}
    return "\n".join(record_by_index[index].newick for index in path) + "\n"


def comparison_tsv(path_summaries: Sequence[dict]) -> str:
    header = [
        "method",
        "tree_count",
        "adjacent_pair_count",
        "total_robinson_foulds",
        "mean_robinson_foulds",
        "max_robinson_foulds",
        "zero_robinson_foulds_pairs",
        "total_weighted_robinson_foulds",
        "mean_weighted_robinson_foulds",
        "max_weighted_robinson_foulds",
        "two_opt_improvements",
    ]
    rows = ["\t".join(header)]
    for summary in path_summaries:
        rows.append(
            "\t".join(
                [
                    summary["method"],
                    str(summary["tree_count"]),
                    str(summary["adjacent_pair_count"]),
                    format_float(summary["robinson_foulds"]["total"]),
                    format_float(summary["robinson_foulds"]["mean"]),
                    format_float(summary["robinson_foulds"]["max"]),
                    str(summary["robinson_foulds"]["zero_count"]),
                    format_float(summary["weighted_robinson_foulds"]["total"]),
                    format_float(summary["weighted_robinson_foulds"]["mean"]),
                    format_float(summary["weighted_robinson_foulds"]["max"]),
                    str(summary["two_opt_improvements"]),
                ]
            )
        )
    return "\n".join(rows) + "\n"


def relative_to_root(path: Path) -> str:
    return str(path.relative_to(ROOT))


def render_json(payload: object) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def update_current_manifest(secondary_summary: dict, check: bool) -> None:
    manifest_path = CURRENT_ROOT / "CURRENT_RESULTS_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["secondary_analysis"] = {
        "tree_distance_ordering": {
            "summary": relative_to_root(SUMMARY_PATH),
            "summary_sha256": secondary_summary["summary_sha256"],
            "description": (
                "Secondary additive analysis comparing the current composition-ranked "
                "bootstrap order with RF and weighted-RF nearest-neighbor-plus-2-opt "
                "tree-distance orderings."
            ),
        }
    }
    write_or_check(manifest_path, render_json(manifest), check)


def dataset_analysis(spec: DatasetSpec, check: bool) -> dict:
    records = load_records(spec)
    trees = prepare_trees_for_distance_metrics(parse_trees(records))
    matrices = compute_distance_matrices(trees)
    analysis_dir = spec.directory / "analysis"

    composition_path = [record.matrix_index for record in records]
    path_summaries = [
        summarize_path(
            composition_path,
            matrices,
            "composition_ranked",
            "Current composition-ranked promoted order",
        )
    ]
    outputs = []

    for method in PATH_METHODS:
        path, improvements = build_path(records, matrices, method)
        order_path = analysis_dir / method.order_filename_template.format(label=spec.label)
        tree_path = analysis_dir / method.tree_filename_template.format(label=spec.label)
        order_digest = write_or_check(order_path, order_tsv(path, records, matrices, method), check)
        tree_digest = write_or_check(tree_path, reordered_newick(path, records), check)
        path_summary = summarize_path(path, matrices, method.key, method.label, improvements)
        path_summaries.append(path_summary)
        outputs.append(
            {
                "method": method.key,
                "primary_metric": method.primary_metric,
                "secondary_metric": method.secondary_metric,
                "order_table": relative_to_root(order_path),
                "order_table_sha256": order_digest,
                "reordered_trees": relative_to_root(tree_path),
                "reordered_trees_sha256": tree_digest,
                "summary": path_summary,
            }
        )

    comparison_path = analysis_dir / f"tree_distance_ordering_comparison_{spec.label}.tsv"
    comparison_digest = write_or_check(comparison_path, comparison_tsv(path_summaries), check)

    return {
        "dataset": spec.dataset,
        "dataset_directory": relative_to_root(spec.directory),
        "source_ranked_trees": relative_to_root(spec.tree_path),
        "source_order_table": relative_to_root(spec.order_path),
        "tree_count": len(records),
        "metrics": {
            "robinson_foulds": PAIR_METRIC_SEMANTICS["robinson_foulds"],
            "weighted_robinson_foulds": PAIR_METRIC_SEMANTICS["weighted_robinson_foulds"],
        },
        "path_construction": {
            "start": "distance medoid under the primary metric; ties use the secondary metric and composition order",
            "route": "deterministic greedy nearest neighbor followed by deterministic 2-opt improvement",
            "purpose": "secondary visualization/order analysis for unordered bootstrap replicate trees",
        },
        "comparison_table": relative_to_root(comparison_path),
        "comparison_table_sha256": comparison_digest,
        "path_summaries": path_summaries,
        "outputs": outputs,
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate secondary tree-distance orderings for current bootstrap examples."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify generated files are current instead of writing them.",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    dataset_results = [dataset_analysis(spec, args.check) for spec in dataset_specs()]
    summary = {
        "schema_version": "1.0",
        "analysis": "bootstrap_tree_distance_ordering",
        "description": (
            "Secondary additive analysis for the bootstrap examples. The promoted "
            "application example remains composition-ranked; these files provide "
            "alternate RF and weighted-RF tree-distance orderings for comparison."
        ),
        "generation_command": "npm run publication:bootstrap-tree-distance",
        "check_command": "npm run publication:bootstrap-tree-distance:check",
        "datasets": dataset_results,
    }
    summary_without_hash = render_json(summary)
    summary_digest = sha256_text(summary_without_hash)

    summary["summary_sha256"] = summary_digest
    summary_with_hash = render_json(summary)
    # The embedded hash is the digest of the stable summary payload without the
    # hash field, avoiding a self-referential checksum.
    write_or_check(SUMMARY_PATH, summary_with_hash, args.check)

    update_current_manifest(summary, args.check)

    verb = "checked" if args.check else "wrote"
    print(f"{verb} bootstrap tree-distance secondary analysis for {len(dataset_results)} datasets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
