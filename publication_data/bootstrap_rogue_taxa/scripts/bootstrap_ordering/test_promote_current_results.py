import json

from promote_current_results import promote


def write_json(path, payload):
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def make_star_tree(taxa, annotation=""):
    leaves = [f"{name}{annotation if index == 0 else ''}:0.1" for index, name in enumerate(taxa)]
    return f"({','.join(leaves)});"


def test_promote_uses_stable_publication_paths(tmp_path):
    source_run = tmp_path / "source_run"
    dataset_id = "24"
    source_basename = "aberer_roguenarok_dataset_24_taxa24_sites14190.phy"
    source_dataset_label = "dataset_24_source-aberer_roguenarok_dataset_24_taxa24_sites14190.phy_taxa24_sites14190"
    source_output_label = "24_source-aberer_roguenarok_dataset_24_taxa24_sites14190.phy_taxa24_sites14190"
    ranked_dir = source_run / source_dataset_label / "ranked"
    ranked_dir.mkdir(parents=True)

    taxa = [f"T{index}" for index in range(24)]
    annotation = "[&support_kind=bootstrap_replicate_subtree_frequency,bootstrap_frequency=100]"
    (ranked_dir / f"all_trees_{source_output_label}.nwk").write_text(
        "\n".join([make_star_tree(taxa, annotation), make_star_tree(taxa, annotation)]) + "\n"
    )
    (ranked_dir / f"composition_ranked_bootstrap_replicates_{source_output_label}.tsv").write_text(
        "\n".join(
            [
                "display_order\tranked_newick_line\tcomposition_distance_to_source_alignment",
                "1\t1\t0.1",
                "2\t2\t0.2",
            ]
        )
        + "\n"
    )
    (ranked_dir / f"split_support_{source_output_label}.tsv").write_text(
        "split_key\tsupport_percent\nT0,T1\t100\n"
    )
    (source_run / "run_log.txt").write_text("test run\n")

    dataset_manifest = {
        "dataset": dataset_id,
        "dataset_label": source_dataset_label,
        "source_file_basename": source_basename,
        "n_taxa": 24,
        "n_sites": 14190,
        "source_alignment": "/tmp/source.phy",
        "source_alignment_sha256": "sha256",
        "ranked_outputs": {
            "split_support": f"ranked/split_support_{source_output_label}.tsv",
        },
        "support": {
            "annotated_trees": True,
            "split_support_table": f"ranked/split_support_{source_output_label}.tsv",
        },
    }
    run_manifest = {
        "run_id": "run_test",
        "tree_program": "iqtree",
        "iqtree_mode": "default",
        "n_replicates": 2,
        "seed": 42,
        "datasets": [dataset_manifest],
    }
    write_json(source_run / "RUN_MANIFEST.json", run_manifest)

    dest_root = tmp_path / "current_results"
    promote(source_run, dest_root)

    stable_dataset_dir = dest_root / "dataset_24_source-24_taxa24_sites14190"
    assert stable_dataset_dir.exists()
    assert not (dest_root / source_dataset_label).exists()
    assert (stable_dataset_dir / "ranked" / "all_trees_24_source-24_taxa24_sites14190.nwk").exists()
    assert (
        stable_dataset_dir
        / "ranked"
        / "composition_ranked_bootstrap_replicates_24_source-24_taxa24_sites14190.tsv"
    ).exists()
    assert (stable_dataset_dir / "ranked" / "split_support_24_source-24_taxa24_sites14190.tsv").exists()

    current_manifest = json.loads((dest_root / "CURRENT_RESULTS_MANIFEST.json").read_text())
    assert current_manifest["datasets"][0]["dataset_directory"] == "dataset_24_source-24_taxa24_sites14190"
    assert (
        current_manifest["datasets"][0]["ranked_trees_file"]
        == "dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk"
    )
