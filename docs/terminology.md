# Terminology

This project uses the terms below consistently in user-facing text, docs, tests, and new code. Backend field names should match the scientific or UI meaning of the serialized data.

## Tree And Timeline Terms

| Term | Use For | Avoid Using For |
|------|---------|-----------------|
| Input tree | An observed tree in the timeline, usually one inferred from a sliding alignment window or one bootstrap replicate. | Any interpolated state between observed trees. |
| Transition frame | An interpolated tree state generated between a source input tree and a target input tree. | An observed input tree. |
| Timeline segment | A rendered interval in the scrubber. A segment is either an input-tree segment or a transition segment. | A biological grouping or an alignment window. |
| Sliding window | A contiguous region of an MSA used to infer one input tree. | Timeline segment, animation frame, or tree object. |

## Tree Topology Terms

| Term | Use For | Avoid Using For |
|------|---------|-----------------|
| Subtree | A topology-defined set of taxa or descendants that moves, is highlighted, or is matched during an SPR transition. This is the default app term. | A generic alignment region or timeline range. |
| Clade | Biological prose where monophyly is the point. Use sparingly in implementation docs unless contrasting with subtree. | The app's moving/highlighted group abstraction. |
| Split | The internal/backend representation of a bipartition, usually serialized as `split`, `split_indices`, `pivot_edge`, or `split_change_timeline`. | User-facing descriptions of moving groups. |
| Partition | Generic programming/data partitioning only. Do not use it as a synonym for split or subtree. | Phylogenetic topology concepts unless an external algorithm explicitly says partition. |

## Serialized Contract Names

These fields are part of the current serialized API:

- `split_indices`
- `split_change_timeline`
- `pivot_edge`
- `subtree_highlight_tracking`
- `affected_subtrees_by_split`
- `attachment_edges_by_split`
- `tree_pair_solutions`

When wrapping those fields in frontend code, use names that describe the app concept. For example, keep `split_indices` at the parser boundary, but prefer `subtree`, `subtreeHighlightTracking`, `pivotEdge`, `inputTree`, and `transitionFrame` in local variables where that is what the value represents.

## SPR Movement Data

The backend currently exposes two related tree-pair contracts that should not be merged casually:

| Field | Use For | Notes |
|-------|---------|-------|
| `spr_move_events` | Per-SPR movement analytics: moved subtree ownership, visual highlight group, step range, path hops, and branch-length metrics. | New code should use `driver_subtree` for the physically moved subtree and `highlight_group` for visual context. |
| `affected_subtrees_by_split` | Transition topology data used by timeline construction, comparison connectors, and all-mode subtree highlighting. | Maps each active split / pivot edge to the subtrees affected during that transition. |
| `attachment_edges_by_split` | Source and destination attachment context for moved subtrees. | Maps each active split / pivot edge and moved subtree to one `{ source, destination }` attachment-edge object. |

`moving_subtree` and `moving_subtree_group` are no longer accepted inside `spr_move_events`. Regenerate or migrate older saved payloads so each event provides explicit `driver_subtree` and `highlight_group` fields.
