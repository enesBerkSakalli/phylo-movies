#!/usr/bin/env python3
"""Generate and check frontend JSON fixtures from BranchArchitect output."""

from __future__ import annotations

import argparse
import contextlib
import difflib
import io
import json
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
BRANCHARCHITECT_ROOT = ROOT / "engine" / "BranchArchitect"
WEBAPP_ROOT = BRANCHARCHITECT_ROOT / "webapp"

sys.path.insert(0, str(BRANCHARCHITECT_ROOT))
sys.path.insert(0, str(WEBAPP_ROOT))

from brancharchitect.io import parse_newick, serialize_tree_list_to_json  # noqa: E402
from brancharchitect.movie_pipeline.tree_interpolation_pipeline import (  # noqa: E402
    TreeInterpolationPipeline,
)
from brancharchitect.movie_pipeline.types import PipelineConfig  # noqa: E402
from brancharchitect.movie_pipeline.types import PAIR_METRIC_SEMANTICS  # noqa: E402
from brancharchitect.tree import Node  # noqa: E402
from msa_to_trees.pipeline import IQTreeConfig, run_pipeline  # noqa: E402
from webapp.services.trees.frontend_builder import (  # noqa: E402
    assemble_frontend_metadata,
    build_movie_data_from_result,
    compact_tree_payload,
)
from webapp.services.msa import process_msa_data  # noqa: E402


@dataclass(frozen=True)
class FixtureSpec:
    name: str
    source: Path
    output: Path
    filename: str
    window_size: int = 1
    step_size: int = 1
    msa_source: Path | None = None
    tree_limit: int | None = None
    input_only: bool = False
    midpoint_rooting: bool = False
    inference_source: Path | None = None
    inference_config: IQTreeConfig | None = None


FIXTURES: tuple[FixtureSpec, ...] = (
    FixtureSpec(
        name="demo-quick-msa",
        source=ROOT
        / "publication_data"
        / "quick_msa_demo"
        / "quick_msa_demo_30taxa_10trees.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "quick_msa_demo_30taxa_10trees.movie.json",
        filename="quick_msa_demo_30taxa_10trees.nwk",
        window_size=200,
        step_size=100,
        msa_source=ROOT
        / "publication_data"
        / "quick_msa_demo"
        / "quick_msa_demo_30taxa_10windows.fasta",
    ),
    FixtureSpec(
        name="demo-paper-example",
        source=ROOT / "publication_data" / "figure_example" / "paper_example.tree",
        output=ROOT / "publication_data" / "precomputed" / "paper_example.movie.json",
        filename="paper_example.tree",
    ),
    FixtureSpec(
        name="demo-norovirus-334",
        source=ROOT
        / "publication_data"
        / "recombination_norovirus"
        / "current_results"
        / "phylo_movies"
        / "norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "norovirus_334_iqtree_fast_sh_alrt_window1000_step500.movie.json",
        filename="norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk",
        window_size=1000,
        step_size=500,
        msa_source=ROOT
        / "publication_data"
        / "recombination_norovirus"
        / "source_preparation"
        / "augur_subsampling"
        / "03_trimmed"
        / "subsampled_350_gappyout_final.fasta",
        inference_source=ROOT
        / "publication_data"
        / "recombination_norovirus"
        / "source_preparation"
        / "augur_subsampling"
        / "03_trimmed"
        / "subsampled_350_gappyout_final.fasta",
        inference_config=IQTreeConfig(
            use_gtr=True,
            use_gamma=True,
            fast_search=True,
            support_mode="sh_alrt",
            sh_alrt_replicates=1000,
        ),
        midpoint_rooting=True,
    ),
    FixtureSpec(
        name="demo-bootstrap-24",
        source=ROOT
        / "publication_data"
        / "bootstrap_rogue_taxa"
        / "current_results"
        / "dataset_24_source-24_taxa24_sites14190"
        / "ranked"
        / "all_trees_24_source-24_taxa24_sites14190.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "all_trees_24_source-24_taxa24_sites14190.movie.json",
        filename="all_trees_24_source-24_taxa24_sites14190.nwk",
        midpoint_rooting=True,
    ),
    FixtureSpec(
        name="demo-bootstrap-125",
        source=ROOT
        / "publication_data"
        / "bootstrap_rogue_taxa"
        / "current_results"
        / "dataset_125_source-125_taxa125_sites29149"
        / "ranked"
        / "all_trees_125_source-125_taxa125_sites29149.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "all_trees_125_source-125_taxa125_sites29149.movie.json",
        filename="all_trees_125_source-125_taxa125_sites29149.nwk",
        midpoint_rooting=True,
    ),
    FixtureSpec(
        name="demo-iqtree-search-500",
        source=ROOT
        / "publication_data"
        / "topology_search_iqtree"
        / "current_results"
        / "iqtree500_fast_search_trajectory.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "iqtree500_fast_search_trajectory.movie.json",
        filename="iqtree500_fast_search_trajectory.nwk",
    ),
    FixtureSpec(
        name="demo-msprime-1000-limit",
        source=ROOT
        / "publication_data"
        / "scale_fixtures"
        / "msprime_performance"
        / "msprime_1000taxa_5trees_seed100005.nwk",
        output=ROOT
        / "publication_data"
        / "precomputed"
        / "msprime_1000taxa_2trees_seed100005.movie.json",
        filename="msprime_1000taxa_2trees_seed100005.nwk",
        tree_limit=2,
        input_only=True,
    ),
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate or check frontend fixtures from backend tree interpolation."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="rewrite fixture files")
    mode.add_argument(
        "--check",
        action="store_true",
        help="fail if committed fixtures differ from generated output",
    )
    mode.add_argument(
        "--list", action="store_true", help="list fixture names and paths"
    )
    parser.add_argument(
        "--fixture",
        action="append",
        choices=[fixture.name for fixture in FIXTURES],
        help="limit to one fixture; can be passed more than once",
    )
    parser.add_argument(
        "--reuse-inferred",
        action="store_true",
        help=(
            "when writing fixtures, reuse checked-in inferred tree sources instead "
            "of rerunning tree inference"
        ),
    )
    args = parser.parse_args()

    selected = list(_select_fixtures(args.fixture))

    if args.list:
        for fixture in selected:
            print(
                f"{fixture.name}: {fixture.source.relative_to(ROOT)} -> "
                f"{fixture.output.relative_to(ROOT)}"
            )
        return 0

    if args.write:
        for fixture in selected:
            _prepare_fixture_source(
                fixture, regenerate_inferred=not args.reuse_inferred
            )
            fixture.output.parent.mkdir(parents=True, exist_ok=True)
            fixture.output.write_text(_render_fixture(fixture), encoding="utf-8")
            print(f"wrote {fixture.output.relative_to(ROOT)}")
        return 0

    stale = []
    for fixture in selected:
        _prepare_fixture_source(fixture, regenerate_inferred=False)
        generated = _render_fixture(fixture)
        current = fixture.output.read_text(encoding="utf-8")
        if generated != current:
            stale.append((fixture, current, generated))

    if not stale:
        print(f"checked {len(selected)} generated frontend fixture(s)")
        return 0

    for fixture, current, generated in stale:
        print(
            f"{fixture.output.relative_to(ROOT)} is stale for fixture "
            f"{fixture.name!r}; run `npm run fixtures:generate -- "
            f"--fixture {fixture.name}`.",
            file=sys.stderr,
        )
        _print_small_diff(current, generated)
    return 1


def _select_fixtures(names: Iterable[str] | None) -> Iterable[FixtureSpec]:
    if not names:
        return FIXTURES
    wanted = set(names)
    return tuple(fixture for fixture in FIXTURES if fixture.name in wanted)


def _render_fixture(fixture: FixtureSpec) -> str:
    payload = _build_payload(fixture)
    _assert_normalized_contract_fields(payload, fixture.name)
    return json.dumps(payload, separators=(",", ":")) + "\n"


def _prepare_fixture_source(fixture: FixtureSpec, *, regenerate_inferred: bool) -> None:
    if fixture.inference_source is None:
        return
    if not regenerate_inferred and fixture.source.exists():
        return
    if fixture.inference_config is None:
        raise RuntimeError(f"fixture {fixture.name!r} is missing inference_config")

    fixture.source.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"{fixture.name}-") as tmpdir:
        result = run_pipeline(
            input_file=str(fixture.inference_source),
            output_directory=tmpdir,
            window_size=fixture.window_size,
            step_size=fixture.step_size,
            output_tree_filename=fixture.source.name,
            fasttree_config=fixture.inference_config,
            progress_callback=lambda message: print(
                f"[{fixture.name}] {message}", file=sys.stderr
            ),
        )
        shutil.copyfile(result.tree_file_path, fixture.source)


def _build_payload(fixture: FixtureSpec) -> dict:
    parsed = parse_newick(
        fixture.source.read_text(encoding="utf-8").strip("\r"),
        treat_zero_as_epsilon=True,
    )
    trees = [parsed] if isinstance(parsed, Node) else parsed
    if fixture.tree_limit is not None:
        trees = trees[: fixture.tree_limit]
    _annotate_iqtree_single_value_support(trees, fixture.inference_config)
    if fixture.input_only:
        return _build_input_only_payload(fixture, trees)

    config = PipelineConfig(
        enable_rooting=fixture.midpoint_rooting,
        use_anchor_ordering=True,
        anchor_weight_policy="destination",
        circular=True,
        logger_name="webapp_pipeline",
    )
    pipeline = TreeInterpolationPipeline(config=config)
    if fixture.msa_source is not None:
        msa_data = process_msa_data(
            fixture.msa_source.read_text(encoding="utf-8"),
            num_trees=len(trees),
            window_size=fixture.window_size,
            step_size=fixture.step_size,
        )
    else:
        msa_data = process_msa_data(
            None,
            num_trees=len(trees),
            window_size=fixture.window_size,
            step_size=fixture.step_size,
        )

    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(
        io.StringIO()
    ):
        result = pipeline.process_trees(trees)

    movie_data = build_movie_data_from_result(result, fixture.filename, msa_data)
    payload = {
        "interpolated_trees": movie_data.interpolated_trees,
        **assemble_frontend_metadata(movie_data),
    }
    payload["dataset_provenance"] = _build_dataset_provenance(fixture)
    return payload


def _build_input_only_payload(fixture: FixtureSpec, trees: list[Node]) -> dict:
    if len(trees) < 2:
        raise RuntimeError(f"fixture {fixture.name!r} needs at least two input trees")

    frames = [_input_frame_row(index) for index in range(len(trees))]
    pairs = [
        {
            "pair_id": f"pair-{index}",
            "pair_ordinal": index,
            "source_input_tree_index": index,
            "target_input_tree_index": index + 1,
            "source_frame_index": index,
            "target_frame_index": index + 1,
            "generated_frame_range": None,
            "solution": {
                "affected_subtrees_by_split": {},
                "attachment_edges_by_split": {},
            },
        }
        for index in range(len(trees) - 1)
    ]
    if fixture.msa_source is not None:
        raw_msa_data = process_msa_data(
            fixture.msa_source.read_text(encoding="utf-8"),
            num_trees=len(trees),
            window_size=fixture.window_size,
            step_size=fixture.step_size,
        )
        msa_data = {
            "sequences": raw_msa_data["msa_dict"],
            "window_size": raw_msa_data["inferred_window_size"],
            "step_size": raw_msa_data["inferred_step_size"],
        }
    else:
        msa_data = {"sequences": None, "window_size": 1, "step_size": 1}

    (
        serialized_trees,
        annotation_definitions,
        tree_name_definitions,
        split_definitions,
    ) = compact_tree_payload(serialize_tree_list_to_json(trees))

    return {
        "interpolated_trees": serialized_trees,
        "annotation_definitions": annotation_definitions,
        "tree_name_definitions": tree_name_definitions,
        "split_definitions": split_definitions,
        "frames": frames,
        "pairs": pairs,
        "temporal_events": [],
        "subtree_highlight_tracking": [None for _ in trees],
        "pair_metrics": {
            "rows": [
                {
                    "pair_id": pair["pair_id"],
                    "pair_ordinal": pair["pair_ordinal"],
                    "robinson_foulds": 0,
                    "weighted_robinson_foulds": 0,
                }
                for pair in pairs
            ],
            "semantics": PAIR_METRIC_SEMANTICS,
        },
        "msa": msa_data,
        "file_name": fixture.filename,
        "dataset_provenance": _build_dataset_provenance(fixture),
    }


def _input_frame_row(index: int) -> dict:
    return {
        "frame_index": index,
        "frame_type": "input_tree",
        "state_semantics": "processed_input_tree",
        "is_observed_input": True,
        "input_tree_index": index,
        "pair_id": None,
        "pair_ordinal": None,
        "local_step_index": None,
        "source_frame_index": None,
        "target_frame_index": None,
    }


def _build_dataset_provenance(fixture: FixtureSpec) -> dict | None:
    if fixture.name == "demo-quick-msa":
        return {
            "source_type": "Generated browser demo",
            "source_label": "publication_data/quick_msa_demo",
            "tree_source": "Precomputed 10-tree Newick sequence bundled with the reviewer demo.",
            "alignment_source": "quick_msa_demo_30taxa_10windows.fasta",
            "settings": [
                {"label": "Tree source", "value": "Precomputed trees plus MSA context"},
                {"label": "Window mapping", "value": "200 sites, 100-site step"},
                {"label": "Rooting", "value": "Input rooting preserved"},
            ],
            "citation": "Synthetic reviewer demo included with Phylo-Movies.",
        }

    if fixture.name == "demo-paper-example":
        return {
            "source_type": "GitHub Pages precomputed demo",
            "source_label": "publication_data/figure_example",
            "tree_source": "Precomputed two-tree Newick example used for the manuscript figure.",
            "settings": [
                {"label": "Tree source", "value": "Precomputed trees"},
                {"label": "Windowing", "value": "Not applicable"},
                {"label": "Rooting", "value": "Input rooting preserved"},
            ],
            "citation": (
                "Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, "
                "H. A. (2026). Animating Phylogenetic Trees from Sliding-Window "
                "Analyses. bioRxiv. doi:10.64898/2026.04.01.715821"
            ),
        }

    if fixture.name == "demo-norovirus-334":
        return _build_norovirus_provenance(
            tree_source=(
                "IQ-TREE GTR+G fast-search trees inferred from the 334-taxon "
                "trimmed publication MSA across 1000 bp windows with SH-aLRT support."
            ),
            windowing="1000 sites, 500-site step",
            support="SH-aLRT, 1000 replicates",
        )

    if fixture.name == "demo-bootstrap-24":
        return _build_bootstrap_provenance(
            source_label="publication_data/bootstrap_rogue_taxa/current_results/dataset_24",
            taxa="24",
        )

    if fixture.name == "demo-bootstrap-125":
        return _build_bootstrap_provenance(
            source_label="publication_data/bootstrap_rogue_taxa/current_results/dataset_125",
            taxa="125",
        )

    if fixture.name == "demo-iqtree-search-500":
        return {
            "source_type": "Generated browser demo",
            "source_label": "publication_data/topology_search_iqtree/current_results",
            "tree_source": (
                "Complete IQ-TREE 3 fast-search topology trajectory for "
                "Aberer/RogueNaRok Dataset 500."
            ),
            "settings": [
                {"label": "Tree inference", "value": "IQ-TREE 3.1.1"},
                {"label": "Search mode", "value": "Fast search"},
                {"label": "Search trajectory", "value": "21 trees from the full fast run"},
                {"label": "Model", "value": "GTR+F+G4"},
                {"label": "Seed", "value": "42"},
                {"label": "Rooting", "value": "Input rooting preserved"},
            ],
            "citation": (
                "Aberer, A. J., Krompass, D., and Stamatakis, A. (2013). "
                "Pruning rogue taxa improves phylogenetic accuracy."
            ),
        }

    if fixture.name == "demo-msprime-1000-limit":
        return {
            "source_type": "Generated browser demo",
            "source_label": "publication_data/scale_fixtures/msprime_performance",
            "tree_source": "First two trees from the deterministic 1000-taxon msprime fixture.",
            "settings": [
                {"label": "Simulator", "value": "msprime"},
                {"label": "Mode", "value": "1000 taxa, two independent trees"},
                {"label": "Rooting", "value": "Input rooting preserved"},
            ],
            "citation": "Synthetic msprime performance fixture generated locally for Phylo-Movies.",
        }

    return None


def _build_norovirus_provenance(
    *, tree_source: str, windowing: str, support: str | None
) -> dict:
    settings = [
        {"label": "Tree inference", "value": "IQ-TREE 3, GTR+G, fast search"},
        {"label": "Windowing", "value": windowing},
        {"label": "Rooting", "value": "Midpoint rooting"},
    ]
    if support:
        settings.insert(2, {"label": "Branch support", "value": support})

    return {
        "source_type": "Generated browser demo",
        "source_label": "publication_data/recombination_norovirus",
        "tree_source": tree_source,
        "alignment_source": "subsampled_350_gappyout_final.fasta",
        "settings": settings,
        "citation": (
            "Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, "
            "H. A. (2026). Animating Phylogenetic Trees from Sliding-Window "
            "Analyses. bioRxiv. doi:10.64898/2026.04.01.715821"
        ),
    }


def _build_bootstrap_provenance(source_label: str, taxa: str) -> dict:
    return {
        "source_type": "Generated browser demo",
        "source_label": source_label,
        "tree_source": (
            f"Interpolated static payload generated from the {taxa}-taxon "
            "composition-ranked IQ-TREE 3 bootstrap tree series with split-frequency "
            "branch labels and SH-aLRT support metadata."
        ),
        "settings": [
            {"label": "Tree source", "value": "Precomputed bootstrap tree series"},
            {
                "label": "Branch labels",
                "value": "Split-frequency support across 200 inferred bootstrap-replicate trees",
            },
            {"label": "Support metadata", "value": "IQ-TREE 3 SH-aLRT, 1,000 replicates"},
            {
                "label": "Browser payload",
                "value": "Input trees plus generated interpolation frames",
            },
            {"label": "Rooting", "value": "Midpoint rooting"},
        ],
        "citation": (
            "Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, "
            "H. A. (2026). Animating Phylogenetic Trees from Sliding-Window "
            "Analyses. bioRxiv. doi:10.64898/2026.04.01.715821"
        ),
    }


def _assert_normalized_contract_fields(payload: dict, fixture_name: str) -> None:
    expected_keys = {
        "interpolated_trees",
        "annotation_definitions",
        "tree_name_definitions",
        "split_definitions",
        "frames",
        "pairs",
        "temporal_events",
        "subtree_highlight_tracking",
        "pair_metrics",
        "msa",
        "file_name",
        "dataset_provenance",
    }
    legacy_fields = {
        "tree_metadata",
        "tree_pair_solutions",
        "split_change_timeline",
        "pair_interpolation_ranges",
        "distances",
        "split_change_events",
        "sorted" + "_leaves",
        "pivot_edge_tracking",
    }

    actual_keys = set(payload)
    if actual_keys != expected_keys:
        missing = sorted(expected_keys - actual_keys)
        extra = sorted(actual_keys - expected_keys)
        raise RuntimeError(
            f"fixture {fixture_name!r} generated invalid normalized keys: "
            f"missing={missing}, extra={extra}"
        )

    leaked_legacy_fields = sorted(legacy_fields & actual_keys)
    if leaked_legacy_fields:
        raise RuntimeError(
            f"fixture {fixture_name!r} generated legacy fields: "
            f"{leaked_legacy_fields}"
        )


def _annotate_iqtree_single_value_support(
    trees: list[Node],
    inference_config: IQTreeConfig | None,
) -> None:
    if inference_config is None or inference_config.support_mode not in {
        "ufboot",
        "sh_alrt",
    }:
        return

    for tree in trees:
        for node in tree.traverse():
            if node.is_leaf():
                continue
            internal_label = (node.name or "").strip()
            if not internal_label or "/" in internal_label:
                continue
            try:
                float(internal_label)
            except ValueError:
                continue
            node.values["support_kind"] = inference_config.support_mode


def _print_small_diff(current: str, generated: str) -> None:
    if len(current) > 200_000 or len(generated) > 200_000:
        return
    diff = difflib.unified_diff(
        current.splitlines(),
        generated.splitlines(),
        fromfile="current",
        tofile="generated",
        lineterm="",
    )
    for line in diff:
        print(line, file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
