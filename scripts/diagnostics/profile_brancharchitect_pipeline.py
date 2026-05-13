#!/usr/bin/env python3
"""Profile BranchArchitect MSA-to-movie pipeline stages."""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENGINE_ROOT = PROJECT_ROOT / "engine" / "BranchArchitect"
sys.path.insert(0, str(ENGINE_ROOT))

from brancharchitect.io import read_newick  # noqa: E402
from brancharchitect.movie_pipeline.tree_interpolation_pipeline import (  # noqa: E402
    TreeInterpolationPipeline,
)
from brancharchitect.movie_pipeline.types import PipelineConfig  # noqa: E402
from brancharchitect.tree import Node  # noqa: E402
from msa_to_trees import pipeline as msa_pipeline  # noqa: E402
from msa_to_trees.pipeline import FastTreeConfig, IQTreeConfig  # noqa: E402


@contextmanager
def timer(name: str, rows: list[dict[str, Any]]):
    start = time.perf_counter()
    try:
        yield
    finally:
        rows.append({"stage": name, "seconds": time.perf_counter() - start})


def _wrap_module_function(
    module: Any,
    name: str,
    rows: list[dict[str, Any]],
) -> None:
    original: Callable[..., Any] = getattr(module, name)

    def wrapped(*args: Any, **kwargs: Any) -> Any:
        with timer(f"msa.{name}", rows):
            return original(*args, **kwargs)

    setattr(module, name, wrapped)


def _wrap_instance_method(
    instance: Any,
    name: str,
    rows: list[dict[str, Any]],
) -> None:
    original: Callable[..., Any] = getattr(instance, name)

    def wrapped(*args: Any, **kwargs: Any) -> Any:
        with timer(f"interpolation.{name}", rows):
            return original(*args, **kwargs)

    setattr(instance, name, wrapped)


def _tree_config(args: argparse.Namespace) -> FastTreeConfig | IQTreeConfig:
    if args.engine == "fasttree":
        return FastTreeConfig(
            use_gtr=args.gtr,
            use_gamma=args.gamma,
            use_pseudo=args.pseudo,
            no_ml=args.no_ml,
        )
    return IQTreeConfig(
        use_gtr=args.gtr,
        use_gamma=args.gamma,
        fast_search=args.fast,
        threads=args.threads,
    )


def profile(args: argparse.Namespace) -> dict[str, Any]:
    logging.basicConfig(level=logging.WARNING)
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve() if args.output_dir else None
    temp_output = output_dir is None
    if output_dir is None:
        output_dir = Path(tempfile.mkdtemp(prefix="ba-profile-"))
    else:
        output_dir.mkdir(parents=True, exist_ok=True)

    stage_rows: list[dict[str, Any]] = []
    for name in (
        "load_alignment",
        "scan_invalid_taxa",
        "generate_filtered_window_alignments",
        "infer_trees_parallel",
    ):
        _wrap_module_function(msa_pipeline, name, stage_rows)

    try:
        tree_config = _tree_config(args)
        overall_start = time.perf_counter()
        with timer("msa.run_pipeline_total", stage_rows):
            msa_result = msa_pipeline.run_pipeline(
                input_file=str(input_path),
                output_directory=str(output_dir),
                window_size=args.window_size,
                step_size=args.step_size,
                fasttree_config=tree_config,
            )

        with timer("interpolation.read_newick", stage_rows):
            parsed = read_newick(
                str(msa_result.tree_file_path),
                treat_zero_as_epsilon=True,
            )
            trees = [parsed] if isinstance(parsed, Node) else parsed

        pipeline = TreeInterpolationPipeline(
            PipelineConfig(
                enable_rooting=args.rooting,
                use_anchor_ordering=True,
                circular=True,
            )
        )
        for name in (
            "_ensure_shared_taxa_encoding",
            "_check_for_identical_trees",
            "_apply_rooting_if_enabled",
            "_precompute_pair_solutions",
            "_extract_current_pivot_split_sets",
            "_optimize_tree_order",
            "_interpolate_tree_sequence",
            "_calculate_distances",
        ):
            _wrap_instance_method(pipeline, name, stage_rows)

        with timer("interpolation.process_trees_total", stage_rows):
            interpolation_result = pipeline.process_trees(trees=trees)

        interpolated_trees = (
            interpolation_result.get("interpolated_trees")
            if isinstance(interpolation_result, dict)
            else interpolation_result.interpolated_trees
        )

        return {
            "input": str(input_path),
            "engine": tree_config.description,
            "window_size": args.window_size,
            "step_size": args.step_size,
            "rooting": args.rooting,
            "output_dir": str(output_dir),
            "temp_output": temp_output,
            "alignment": {
                "taxa_total": msa_result.total_taxa,
                "taxa_kept": msa_result.kept_taxa,
                "taxa_dropped": len(msa_result.dropped_taxa),
                "windows": msa_result.num_windows,
            },
            "trees": len(trees),
            "interpolated_frames": len(interpolated_trees),
            "overall_seconds": time.perf_counter() - overall_start,
            "stages": stage_rows,
        }
    finally:
        if temp_output:
            shutil.rmtree(output_dir, ignore_errors=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--window-size", type=int, default=200)
    parser.add_argument("--step-size", type=int, default=100)
    parser.add_argument("--engine", choices=("iqtree", "fasttree"), default="iqtree")
    parser.add_argument("--gtr", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--gamma", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--fast", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--pseudo", action="store_true")
    parser.add_argument("--no-ml", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--threads", type=int, default=1)
    parser.add_argument("--rooting", action="store_true")
    parser.add_argument("--output-dir")
    args = parser.parse_args()
    print(json.dumps(profile(args), indent=2))


if __name__ == "__main__":
    main()
