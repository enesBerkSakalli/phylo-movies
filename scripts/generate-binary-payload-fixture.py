#!/usr/bin/env python3
"""Generate the committed PMB1 cross-language fixture pair.

The frontend reader in src/domain/backend/binaryPayload.ts has to agree with the
Python writer in webapp/services/trees/binary_payload.py on endianness, block
offsets and alignment. A round-trip test inside either language cannot catch a
disagreement between them, so the fixture is written here and read by both:

    test/fixtures/binary/movie_payload.json   compact JSON payload
    test/fixtures/binary/movie_payload.pmb    the same payload, PMB1 encoded

Run with --check in CI to confirm the committed pair still matches this script.

    poetry run python ../../scripts/generate-binary-payload-fixture.py --write
    poetry run python ../../scripts/generate-binary-payload-fixture.py --check
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "engine" / "BranchArchitect"
sys.path.insert(0, str(BACKEND_ROOT))

from webapp.services.trees.binary_payload import (  # noqa: E402
    pack_movie_payload,
)

OUTPUT_DIR = REPO_ROOT / "test" / "fixtures" / "binary"
JSON_PATH = OUTPUT_DIR / "movie_payload.json"
BINARY_PATH = OUTPUT_DIR / "movie_payload.pmb"


def _leaf(length: float, name_ref: int, split_ref: int, annotations=None) -> list:
    return [length, name_ref, split_ref, annotations, []]


def build_payload() -> dict:
    """A payload small enough to read by eye, wide enough to catch encoding bugs.

    Covers every annotation value type the contract allows, a node with no
    annotations, an unbalanced tree so child order matters, and a repeated value
    so the interning table is exercised.
    """
    annotated_root = [
        0.0,
        0,
        0,
        [[0, 88.5], [1, "internal-1"]],
        [
            _leaf(1.5, 1, 1, [[0, 100.0], [2, True]]),
            [
                0.75,
                0,
                4,
                [[1, "internal-2"]],
                [
                    _leaf(0.125, 2, 2, [[3, [1, 2, 3]]]),
                    _leaf(2.25, 3, 3, [[0, 100.0]]),
                ],
            ],
        ],
    ]
    plain_root = [
        0.0,
        0,
        0,
        None,
        [_leaf(1.0, 1, 1), _leaf(2.0, 2, 2), _leaf(3.0, 3, 3)],
    ]

    return {
        "interpolated_trees": [annotated_root, plain_root, annotated_root],
        "annotation_definitions": [
            {
                "key": "support.iqtree.sh_alrt",
                "path": ["support", "iqtree", "sh_alrt"],
                "label": "SH-aLRT",
                "value_type": "number",
                "role": "branch_support",
            },
            {
                "key": "label.raw_internal",
                "path": ["label", "raw_internal"],
                "label": "Raw Internal Label",
                "value_type": "string",
                "role": "source_annotation",
            },
            {
                "key": "metadata.verified",
                "path": ["metadata", "verified"],
                "label": "Verified",
                "value_type": "boolean",
                "role": "source_annotation",
            },
            {
                "key": "metadata.samples",
                "path": ["metadata", "samples"],
                "label": "Samples",
                "value_type": "array",
                "role": "source_annotation",
            },
        ],
        "tree_name_definitions": ["", "A", "B", "C"],
        "split_definitions": [[0, 1, 2], [0], [1], [2], [1, 2]],
        # A contract-valid timeline: two input frames with one generated frame
        # between them, and the pair and metric row that must accompany them.
        # An earlier version listed three bare input frames, which the payload
        # validator rightly rejects.
        "frames": [
            {
                "frame_index": 0,
                "frame_type": "input_tree",
                "state_semantics": "processed_input_tree",
                "is_observed_input": True,
                "input_tree_index": 0,
                "pair_id": None,
                "pair_ordinal": None,
                "local_step_index": None,
                "source_frame_index": None,
                "target_frame_index": None,
            },
            {
                "frame_index": 1,
                "frame_type": "interpolation_frame",
                "state_semantics": "algorithmic_intermediate",
                "is_observed_input": False,
                "input_tree_index": None,
                "pair_id": "pair_0_1",
                "pair_ordinal": 0,
                "local_step_index": 0,
                "source_frame_index": 0,
                "target_frame_index": 2,
            },
            {
                "frame_index": 2,
                "frame_type": "input_tree",
                "state_semantics": "processed_input_tree",
                "is_observed_input": True,
                "input_tree_index": 1,
                "pair_id": None,
                "pair_ordinal": None,
                "local_step_index": None,
                "source_frame_index": None,
                "target_frame_index": None,
            },
        ],
        "pairs": [
            {
                "pair_id": "pair_0_1",
                "pair_ordinal": 0,
                "source_input_tree_index": 0,
                "target_input_tree_index": 1,
                "source_frame_index": 0,
                "target_frame_index": 2,
                "generated_frame_range": [1, 1],
                "solution": {
                    "affected_subtrees_by_split": {},
                    "attachment_edges_by_split": {},
                },
            }
        ],
        "temporal_events": [],
        "subtree_highlight_tracking": [None, None, None],
        "pair_metrics": {
            "rows": [
                {
                    "pair_id": "pair_0_1",
                    "pair_ordinal": 0,
                    "robinson_foulds": 0.0,
                    "weighted_robinson_foulds": 0.0,
                }
            ],
            "semantics": {},
        },
        "msa": {"sequences": None, "window_size": 10, "step_size": 5},
        "file_name": "binary_payload_fixture.trees",
        "dataset_provenance": None,
    }


def render() -> tuple[str, bytes]:
    payload = build_payload()
    return json.dumps(payload, separators=(",", ":")) + "\n", pack_movie_payload(
        payload
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true", help="write the fixture pair")
    group.add_argument("--check", action="store_true", help="verify the committed pair")
    args = parser.parse_args()

    json_text, binary_bytes = render()

    if args.write:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        JSON_PATH.write_text(json_text, encoding="utf-8")
        BINARY_PATH.write_bytes(binary_bytes)
        print(f"wrote {JSON_PATH.relative_to(REPO_ROOT)} ({len(json_text)} bytes)")
        print(f"wrote {BINARY_PATH.relative_to(REPO_ROOT)} ({len(binary_bytes)} bytes)")
        return 0

    if not JSON_PATH.exists() or not BINARY_PATH.exists():
        print("binary payload fixture is missing; run with --write", file=sys.stderr)
        return 1

    stale = (
        JSON_PATH.read_text(encoding="utf-8") != json_text
        or BINARY_PATH.read_bytes() != binary_bytes
    )
    if stale:
        print(
            "binary payload fixture is out of date; run "
            "`npm run fixtures:binary:generate`",
            file=sys.stderr,
        )
        return 1

    print("binary payload fixture is up to date")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
