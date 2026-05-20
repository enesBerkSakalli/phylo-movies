#!/usr/bin/env python3
"""Generate and check frontend JSON fixtures from BranchArchitect output."""

from __future__ import annotations

import argparse
import contextlib
import difflib
import io
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
BRANCHARCHITECT_ROOT = ROOT / "engine" / "BranchArchitect"
WEBAPP_ROOT = BRANCHARCHITECT_ROOT / "webapp"

sys.path.insert(0, str(BRANCHARCHITECT_ROOT))
sys.path.insert(0, str(WEBAPP_ROOT))

from brancharchitect.io import parse_newick  # noqa: E402
from brancharchitect.movie_pipeline.tree_interpolation_pipeline import (  # noqa: E402
    TreeInterpolationPipeline,
)
from brancharchitect.movie_pipeline.types import PipelineConfig  # noqa: E402
from brancharchitect.tree import Node  # noqa: E402
from webapp.services.trees.frontend_builder import (  # noqa: E402
    assemble_frontend_metadata,
    build_movie_data_from_result,
)


@dataclass(frozen=True)
class FixtureSpec:
    name: str
    source: Path
    output: Path
    filename: str
    pretty: bool = False


FIXTURES: tuple[FixtureSpec, ...] = (
    FixtureSpec(
        name="small-example",
        source=ROOT / "test" / "data" / "small_example" / "sss.newick",
        output=ROOT
        / "test"
        / "data"
        / "small_example"
        / "small_example.response.json",
        filename="sss.newick",
    ),
    FixtureSpec(
        name="ostrich-bug",
        source=ROOT / "test" / "data" / "small_example" / "ostrich_bug_example.tree",
        output=ROOT / "test" / "data" / "ostrich_bug_response.json",
        filename="ostrich_bug_example.tree",
        pretty=True,
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
    mode.add_argument("--list", action="store_true", help="list fixture names and paths")
    parser.add_argument(
        "--fixture",
        action="append",
        choices=[fixture.name for fixture in FIXTURES],
        help="limit to one fixture; can be passed more than once",
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
            fixture.output.parent.mkdir(parents=True, exist_ok=True)
            fixture.output.write_text(_render_fixture(fixture), encoding="utf-8")
            print(f"wrote {fixture.output.relative_to(ROOT)}")
        return 0

    stale = []
    for fixture in selected:
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
    if fixture.pretty:
        return json.dumps(payload, indent=2) + "\n"
    return json.dumps(payload, separators=(",", ":")) + "\n"


def _build_payload(fixture: FixtureSpec) -> dict:
    parsed = parse_newick(
        fixture.source.read_text(encoding="utf-8").strip("\r"),
        treat_zero_as_epsilon=True,
    )
    trees = [parsed] if isinstance(parsed, Node) else parsed

    config = PipelineConfig(
        enable_rooting=False,
        use_anchor_ordering=True,
        anchor_weight_policy="destination",
        circular=True,
        logger_name="webapp_pipeline",
    )
    pipeline = TreeInterpolationPipeline(config=config)
    msa_data = {
        "inferred_window_size": 1,
        "inferred_step_size": 1,
        "msa_dict": None,
    }

    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(
        io.StringIO()
    ):
        result = pipeline.process_trees(trees)

    movie_data = build_movie_data_from_result(result, fixture.filename, msa_data)
    return {
        "interpolated_trees": movie_data.interpolated_trees,
        **assemble_frontend_metadata(movie_data),
    }


def _assert_normalized_contract_fields(payload: dict, fixture_name: str) -> None:
    expected_keys = {
        "interpolated_trees",
        "frames",
        "pairs",
        "temporal_events",
        "pivot_edge_tracking",
        "subtree_highlight_tracking",
        "pair_metrics",
        "msa",
        "file_name",
    }
    legacy_fields = {
        "tree_metadata",
        "tree_pair_solutions",
        "split_change_timeline",
        "pair_interpolation_ranges",
        "distances",
        "split_change_events",
        "sorted" + "_leaves",
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
