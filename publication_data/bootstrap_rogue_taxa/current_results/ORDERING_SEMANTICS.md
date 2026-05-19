# Ordering Semantics

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
