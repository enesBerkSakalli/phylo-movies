import argparse
import csv
import hashlib
import json
import math
import re
import shutil
from datetime import datetime
from pathlib import Path

from order_schema import ORDERING_SEMANTICS


LEAF_RE = re.compile(r"(?<=[(,])([^():,;]+):")
BRANCH_RE = re.compile(r":([-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?)")
ANNOTATION_RE = re.compile(r"\[[^\]]*\]")


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, payload):
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def copy_file(src, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def find_order_file(source_ds_dir, dataset_id, source_basename, n_taxa, n_sites):
    output_label = f"{dataset_id}_source-{source_basename}_taxa{n_taxa}_sites{n_sites}"
    semantic = source_ds_dir / "ranked" / f"composition_ranked_bootstrap_replicates_{output_label}.tsv"
    if semantic.exists():
        return semantic

    raise FileNotFoundError(f"Semantic ordering table not found in {source_ds_dir / 'ranked'}")


def find_split_support_file(source_ds_dir, dataset_manifest):
    for relative_path in (
        dataset_manifest.get("ranked_outputs", {}).get("split_support"),
        dataset_manifest.get("support", {}).get("split_support_table"),
    ):
        if relative_path:
            candidate = source_ds_dir / relative_path
            if candidate.exists():
                return candidate
    return None


def publication_output_label(dataset_id, n_taxa, n_sites):
    return f"{dataset_id}_source-{dataset_id}_taxa{n_taxa}_sites{n_sites}"


def publication_dataset_label(dataset_id, n_taxa, n_sites):
    return f"dataset_{publication_output_label(dataset_id, n_taxa, n_sites)}"


def validate_dataset(dest_ds_dir, order_path, trees_path, expected_taxa):
    order_rows = list(csv.DictReader(order_path.open(), delimiter="\t"))
    tree_lines = [line.strip() for line in trees_path.read_text().splitlines() if line.strip()]

    bad_taxa = []
    bad_branch_lengths = []
    bad_line_refs = []
    bad_sort_order = []
    distances = []

    for index, tree in enumerate(tree_lines, start=1):
        annotation_free_tree = ANNOTATION_RE.sub("", tree)
        leaves = set(LEAF_RE.findall(annotation_free_tree))
        branches = [float(value) for value in BRANCH_RE.findall(annotation_free_tree)]
        if len(leaves) != expected_taxa:
            bad_taxa.append({"ranked_newick_line": index, "taxa": len(leaves)})
        if not branches or any(not math.isfinite(value) for value in branches):
            bad_branch_lengths.append(index)

    for row in order_rows:
        display_order = int(row["display_order"])
        ranked_line = int(row["ranked_newick_line"])
        if display_order != ranked_line or ranked_line < 1 or ranked_line > len(tree_lines):
            bad_line_refs.append(
                {"display_order": display_order, "ranked_newick_line": ranked_line}
            )
        distances.append(float(row["composition_distance_to_source_alignment"]))

    for index in range(1, len(distances)):
        if distances[index] < distances[index - 1]:
            bad_sort_order.append(
                {
                    "display_order": index + 1,
                    "previous": distances[index - 1],
                    "current": distances[index],
                }
            )

    return {
        "order_rows": len(order_rows),
        "all_trees_lines": len(tree_lines),
        "support_annotated": "support_kind=bootstrap_replicate_" in "\n".join(tree_lines),
        "bad_taxa": bad_taxa,
        "bad_branch_length_trees": bad_branch_lengths,
        "bad_ranked_newick_line_refs": bad_line_refs,
        "bad_sort_order": bad_sort_order,
        "ranked_order_sha256": sha256_file(order_path),
        "ranked_trees_sha256": sha256_file(trees_path),
    }


def promote_dataset(source_run, dest_root, run_manifest, dataset_manifest):
    dataset_id = str(dataset_manifest["dataset"])
    source_basename = dataset_manifest["source_file_basename"]
    n_taxa = int(dataset_manifest["n_taxa"])
    n_sites = int(dataset_manifest["n_sites"])
    source_dataset_label = dataset_manifest["dataset_label"]
    source_output_label = f"{dataset_id}_source-{source_basename}_taxa{n_taxa}_sites{n_sites}"
    dataset_label = publication_dataset_label(dataset_id, n_taxa, n_sites)
    output_label = publication_output_label(dataset_id, n_taxa, n_sites)

    source_ds_dir = source_run / source_dataset_label
    dest_ds_dir = dest_root / dataset_label
    ranked_dest = dest_ds_dir / "ranked"
    ranked_dest.mkdir(parents=True, exist_ok=True)

    source_trees = source_ds_dir / "ranked" / f"all_trees_{source_output_label}.nwk"
    dest_trees = ranked_dest / f"all_trees_{output_label}.nwk"
    copy_file(source_trees, dest_trees)

    source_order = find_order_file(source_ds_dir, dataset_id, source_basename, n_taxa, n_sites)
    dest_order = ranked_dest / f"composition_ranked_bootstrap_replicates_{output_label}.tsv"
    copy_file(source_order, dest_order)

    source_split_support = find_split_support_file(source_ds_dir, dataset_manifest)
    dest_split_support = None
    if source_split_support is not None:
        dest_split_support = ranked_dest / f"split_support_{output_label}.tsv"
        copy_file(source_split_support, dest_split_support)

    validation = validate_dataset(dest_ds_dir, dest_order, dest_trees, n_taxa)
    support = dict(dataset_manifest.get("support") or {})
    if dest_split_support is not None:
        support.update(
            {
                "annotated_trees": validation["support_annotated"],
                "split_support_table": str(dest_split_support.relative_to(dest_ds_dir)),
            }
        )

    promoted_outputs = {
        "ranked_order": str(dest_order.relative_to(dest_ds_dir)),
        "ranked_order_sha256": validation["ranked_order_sha256"],
        "ranked_trees": str(dest_trees.relative_to(dest_ds_dir)),
        "ranked_trees_sha256": validation["ranked_trees_sha256"],
    }
    if dest_split_support is not None:
        promoted_outputs.update(
            {
                "split_support": str(dest_split_support.relative_to(dest_ds_dir)),
                "split_support_sha256": sha256_file(dest_split_support),
            }
        )

    source_alignment_relative = dataset_manifest.get(
        "source_alignment_relative_to_source_root", source_basename
    )

    promoted_manifest = {
        "schema_version": "1.0",
        "publication_status": "current_promoted_result",
        "dataset": dataset_id,
        "dataset_label": dataset_label,
        "source_run_id": run_manifest["run_id"],
        "source_run_directory": None,
        "source_run_retention": "generated staging removed after promotion",
        "source_alignment": source_alignment_relative,
        "source_alignment_relative_to_source_root": source_alignment_relative,
        "source_alignment_sha256": dataset_manifest["source_alignment_sha256"],
        "source_file_basename": source_basename,
        "n_taxa": n_taxa,
        "n_sites": n_sites,
        "tree_program": run_manifest["tree_program"],
        "iqtree_mode": run_manifest.get("iqtree_mode"),
        "bootstrap_generator": "RAxML raxmlHPC -f j",
        "n_replicates": run_manifest["n_replicates"],
        "seed": run_manifest["seed"],
        "promoted_outputs": promoted_outputs,
        "ordering_semantics": ORDERING_SEMANTICS,
        "not_promoted": {
            "bootstrap_replicate_alignments": "Not retained in publication data; regenerated by the workflow when needed.",
            "per_replicate_iqtree_artifacts": "Not retained in publication data; inference details are log/provenance, not publication-facing result files.",
        },
    }
    if support:
        promoted_manifest["support"] = support
    write_json(dest_ds_dir / "DATASET_MANIFEST.json", promoted_manifest)

    validation.update(
        {
            "dataset": dataset_id,
            "dataset_directory": dataset_label,
            "expected_taxa": n_taxa,
            "expected_sites": n_sites,
            "ranked_order_file": str(dest_order.relative_to(dest_root)),
            "ranked_trees_file": str(dest_trees.relative_to(dest_root)),
        }
    )
    if dest_split_support is not None:
        validation.update(
            {
                "split_support_file": str(dest_split_support.relative_to(dest_root)),
                "split_support_sha256": sha256_file(dest_split_support),
            }
        )
    return validation


def write_docs(dest_root, source_run, run_manifest, validations, status):
    verified_at = datetime.now().astimezone().isoformat(timespec="seconds")
    verification = {
        "schema_version": "1.0",
        "verified_at": verified_at,
        "status": status,
        "current_results_directory": "publication_data/bootstrap_rogue_taxa/current_results",
        "source_run_directory": None,
        "source_run_retention": "generated staging removed after promotion",
        "source_run_id": run_manifest["run_id"],
        "checks": validations,
    }

    verification_dir = dest_root / "verification"
    verification_dir.mkdir(parents=True, exist_ok=True)
    write_json(verification_dir / "verification.json", verification)

    lines = [
        "# Current Result Verification",
        "",
        f"Status: **{status}**",
        "",
        f"Verified at: `{verified_at}`",
        "",
        f"Source run: `{run_manifest['run_id']}`",
        "",
        "## Checks",
        "",
        "| Dataset | Taxa | Sites | Order rows | Ranked trees | Support | Taxa check | Branch lengths | Line refs | Sort order |",
        "| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |",
    ]
    for item in validations:
        lines.append(
            f"| {item['dataset']} | {item['expected_taxa']} | {item['expected_sites']} | "
            f"{item['order_rows']} | {item['all_trees_lines']} | "
            f"{'YES' if item['support_annotated'] else 'NO'} | "
            f"{'PASS' if not item['bad_taxa'] else 'FAIL'} | "
            f"{'PASS' if not item['bad_branch_length_trees'] else 'FAIL'} | "
            f"{'PASS' if not item['bad_ranked_newick_line_refs'] else 'FAIL'} | "
            f"{'PASS' if not item['bad_sort_order'] else 'FAIL'} |"
        )

    lines.extend(
        [
            "",
            "## Ordering Semantics",
            "",
            "- `display_order`: 1-based visual/order position in the promoted Phylo-Movies tree sequence.",
            "- `ranked_newick_line`: 1-based line number in `all_trees_*.nwk`; this should equal `display_order`.",
            "- `bootstrap_replicate_id`: original RAxML replicate alignment ID, such as `BS183`.",
            "- `bootstrap_replicate_index_zero_based`: numeric replicate index from `bootstrap.BS<N>`.",
            "- `composition_distance_to_source_alignment`: Euclidean distance from the source alignment composition vector over `(A, C, G, T, AmbiguousOrGap)`.",
            "- `sort_direction`: `ascending`; smaller composition distance appears earlier.",
            "",
            "This order is a deterministic visualization/order heuristic for the bootstrap replicate tree sequence. It is not a biological time axis, likelihood rank, support value, or rogue-taxon severity score.",
            "",
            "## Promoted Outputs",
            "",
        ]
    )
    for item in validations:
        lines.extend(
            [
                f"### Dataset {item['dataset']}",
                "",
                f"- Ranked trees: `{item['ranked_trees_file']}`",
                f"- Ordering table: `{item['ranked_order_file']}`",
                f"- Ranked trees SHA256: `{item['ranked_trees_sha256']}`",
                f"- Ordering table SHA256: `{item['ranked_order_sha256']}`",
                "",
            ]
        )
        if item.get("split_support_file"):
            lines.extend(
                [
                    f"- Split-support table: `{item['split_support_file']}`",
                    f"- Split-support table SHA256: `{item['split_support_sha256']}`",
                    "",
                ]
            )
    lines.extend(
        [
            "## Notes",
            "",
            "- Publication-facing results are the ranked Newick files, semantic ordering tables, and split-support tables when support annotations are present.",
            "- IQ-TREE inference artifacts are log/provenance only and are not retained as publication data.",
            "- Bootstrap replicate alignments are bulky derived MSA intermediates regenerated by the workflow when needed.",
        ]
    )
    (verification_dir / "VERIFICATION.md").write_text("\n".join(lines) + "\n")

    (dest_root / "ORDERING_SEMANTICS.md").write_text(
        """# Ordering Semantics

The promoted rogue-taxon bootstrap examples are ordered by a deterministic
composition-distance heuristic. The ordering table is intentionally named
`composition_ranked_bootstrap_replicates_*.tsv` because the order is not a
biological time axis, likelihood rank, support value, or rogue-taxon severity
score.

Columns:

| Column | Meaning |
| --- | --- |
| `display_order` | 1-based order of the tree in the promoted Phylo-Movies sequence. |
| `ranked_newick_line` | 1-based line number in the matching `all_trees_*.nwk` file. |
| `bootstrap_replicate_id` | RAxML replicate alignment ID, e.g. `BS183` means source replicate `bootstrap.BS183`. |
| `bootstrap_replicate_index_zero_based` | Numeric zero-based replicate index from the generated RAxML bootstrap alignment filename. |
| `source_replicate_alignment_file` | Generated bootstrap alignment filename used during the run. |
| `composition_distance_to_source_alignment` | Euclidean distance from the source alignment composition vector over `(A, C, G, T, AmbiguousOrGap)`. |
| `sort_key` | The field used for sorting. |
| `sort_direction` | `ascending`; smaller distance appears earlier. |

Reviewer-facing interpretation:

- The order makes the visualization deterministic and reproducible.
- The order places bootstrap replicate alignments with nucleotide composition
  closest to the source alignment first.
- The order should not be interpreted as chronological, biological, likelihood,
  confidence, support, or rogue-taxon severity ranking.
- IQ-TREE inference details are method/provenance logs, not the meaning of the
  ordering itself.
"""
    )

    support = None
    if any(item.get("support_annotated") for item in validations):
        support = {
            "annotated_trees": True,
            "mode": "bootstrap_replicate_clade_frequency",
            "n_replicates": run_manifest["n_replicates"],
            "primary": "bootstrap_frequency",
        }

    current_manifest = {
        "schema_version": "1.0",
        "publication_status": "current_results",
        "promoted_at": verified_at,
        "status": status,
        "source_run_id": run_manifest["run_id"],
        "source_run_directory": None,
        "source_run_retention": "generated staging removed after promotion",
        "tree_program": run_manifest["tree_program"],
        "iqtree_mode": run_manifest.get("iqtree_mode"),
        "n_replicates": run_manifest["n_replicates"],
        "seed": run_manifest["seed"],
        "publication_outputs": "ranked Newick tree files, semantic composition-ranked bootstrap replicate tables, and split-support tables when available",
        "inference_artifacts": "not retained in publication data; documented as log/provenance only",
        "ordering_semantics": "ORDERING_SEMANTICS.md",
        "datasets": validations,
        "verification": {
            "report": "verification/VERIFICATION.md",
            "json": "verification/verification.json",
        },
    }
    if support is not None:
        current_manifest["support"] = support
    write_json(dest_root / "CURRENT_RESULTS_MANIFEST.json", current_manifest)

    (dest_root / "README.md").write_text(
        f"""# Current Rogue-Taxon Bootstrap Results

This folder contains the promoted current publication-facing result set for the
two rogue-taxon bootstrap examples.

Source run:

```text
{run_manifest['run_id']}
```

Publication-facing files:

- ranked Phylo-Movies Newick tree files
- semantic composition-ranked bootstrap replicate tables
- split-support tables when the source run includes embedded support annotations
- dataset manifests
- ordering semantics note
- verification report

The ordering is documented in `ORDERING_SEMANTICS.md`. In short, trees are
ordered by ascending nucleotide-composition distance between each bootstrap
replicate alignment and the source alignment, using `(A, C, G, T,
AmbiguousOrGap)`. This is a deterministic visualization/order heuristic, not a
biological time axis, likelihood ranking, support value, or rogue-taxon severity
score.

Method summary:

- bootstrap replicate alignments: RAxML `raxmlHPC -f j`
- tree inference: IQ-TREE 2 default search mode, not `-fast`
- replicates: {run_manifest['n_replicates']} per dataset
- support annotations: bootstrap replicate split frequencies when present in the source run
- seed: {run_manifest['seed']}

Source alignment provenance:

- dataset manifests keep both the source alignment SHA256 and the path relative
  to `ROGUE_TAXA_SOURCE_ROOT`;
- promoted manifests use portable source-alignment paths plus SHA256 checksums;
- source-run snapshots may include staging labels from the original run, but
  generated publication manifests must stay repository-relative.

IQ-TREE per-replicate inference artifacts are not publication-facing results in
this folder. They are documented through `SOURCE_RUN_LOG.txt` and
`SOURCE_RUN_MANIFEST.json`.

Bulky bootstrap replicate alignments are also not promoted here; they are
regenerated by the workflow when needed.
"""
    )


def promote(source_run, dest_root):
    if dest_root.exists():
        shutil.rmtree(dest_root)
    dest_root.mkdir(parents=True)

    run_manifest = read_json(source_run / "RUN_MANIFEST.json")
    copy_file(source_run / "RUN_MANIFEST.json", dest_root / "SOURCE_RUN_MANIFEST.json")
    copy_file(source_run / "run_log.txt", dest_root / "SOURCE_RUN_LOG.txt")

    validations = []
    for dataset_manifest in run_manifest["datasets"]:
        validations.append(promote_dataset(source_run, dest_root, run_manifest, dataset_manifest))

    status = "PASS"
    for item in validations:
        if (
            item["order_rows"] != run_manifest["n_replicates"]
            or item["all_trees_lines"] != run_manifest["n_replicates"]
            or item["bad_taxa"]
            or item["bad_branch_length_trees"]
            or item["bad_ranked_newick_line_refs"]
            or item["bad_sort_order"]
        ):
            status = "FAIL"
            break

    write_docs(dest_root, source_run, run_manifest, validations, status)
    if status != "PASS":
        raise SystemExit("Promotion verification failed.")


def main():
    parser = argparse.ArgumentParser(
        description="Promote a reviewed bootstrap-ordering run into current publication results."
    )
    parser.add_argument("--source-run", required=True, help="Completed bootstrap_rogue_taxa/runs directory.")
    parser.add_argument(
        "--dest",
        default="publication_data/bootstrap_rogue_taxa/current_results",
        help="Destination current-results directory.",
    )
    args = parser.parse_args()

    promote(Path(args.source_run).resolve(), Path(args.dest).resolve())


if __name__ == "__main__":
    main()
