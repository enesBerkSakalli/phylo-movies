ORDERING_FIELDNAMES = [
    "display_order",
    "ranked_newick_line",
    "bootstrap_replicate_id",
    "bootstrap_replicate_index_zero_based",
    "source_replicate_alignment_file",
    "composition_distance_to_source_alignment",
    "sort_key",
    "sort_direction",
]

ORDERING_SEMANTICS = {
    "display_order": "1-based visual/order position in the promoted Phylo-Movies tree sequence.",
    "ranked_newick_line": "1-based line number in the matching all_trees Newick file.",
    "bootstrap_replicate_id": "RAxML replicate alignment ID, e.g. BS183 means bootstrap.BS183.",
    "bootstrap_replicate_index_zero_based": "Zero-based replicate index from the generated RAxML bootstrap alignment filename.",
    "source_replicate_alignment_file": "Original generated bootstrap alignment filename in the staging run.",
    "composition_distance_to_source_alignment": "Euclidean distance between source-alignment and replicate-alignment composition vectors over A,C,G,T,AmbiguousOrGap.",
    "sort_key": "Field used to sort bootstrap replicates into the promoted order.",
    "sort_direction": "ascending; smaller distance appears earlier.",
}

missing_semantics = set(ORDERING_FIELDNAMES) - set(ORDERING_SEMANTICS)
if missing_semantics:
    raise RuntimeError(
        "ORDERING_SEMANTICS missing definitions for: "
        + ", ".join(sorted(missing_semantics))
    )
