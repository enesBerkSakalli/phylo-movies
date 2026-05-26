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
| Split | The internal/backend representation of a bipartition, usually serialized as `split`, `split_indices`, or `pivot_edge`. | User-facing descriptions of moving groups. |
| Partition | Generic programming/data partitioning only. Do not use it as a synonym for split or subtree. | Phylogenetic topology concepts unless an external algorithm explicitly says partition. |

## Branch Length Terms

| Term | Use For | Avoid Using For |
|------|---------|-----------------|
| Metric branch length | The backend/scientific branch length from the tree payload. In serialized tree nodes this is `length`, and frontend transforms must preserve it. | Any readability warp, normalized radius, or screen-space distance. |
| Visual branch length | The frontend display length derived from the metric branch length for geometry. In transformed tree nodes this is `visualBranchLength`, and layout scale/radius code may use it instead of `length`. | Backend correctness, biological branch weights, or persisted source data. |
| Metric radius | A conceptual accumulated path length in backend units. Use only when discussing scientific branch-length sums. | Deck.gl coordinates or rendered radial distance. |
| Visual radius | The accumulated display distance used to place nodes on screen after visual branch-length transforms. | Backend tree-state semantics. |

Branch-length transforms must keep metric data and display geometry separate:

```text
metric branch length: l
visual branch length: d(l)
```

The backend decides the valid tree states: which splits exist, which branches
collapse or expand, and what metric branch weights each frame has. The frontend
decides how those metric branch lengths become radial distance and screen
position. Very small valid metric lengths, such as `0.0001`, can make a tree
look collapsed around the root; the frontend may therefore render a warped
`visualBranchLength` while preserving the original `length`.

## Serialized Contract Names

These fields are part of the current serialized API:

- `split_indices`
- `frames`
- `pairs`
- `temporal_events`
- `pivot_edge`
- `subtree_highlight_tracking`
- `affected_subtrees_by_split`
- `attachment_edges_by_split`
- `pair_metrics`

When wrapping those fields in frontend code, use names that describe the app concept. For example, keep `split_indices` at the parser boundary, but prefer `subtree`, `subtreeHighlightTracking`, `pivotEdge`, `inputTree`, and `transitionFrame` in local variables where that is what the value represents.

## SPR Movement Data

The backend currently exposes two related tree-pair contracts that should not be merged casually:

| Field | Use For | Notes |
|-------|---------|-------|
| `temporal_events` with `event_type: "spr_move"` | Per-SPR movement analytics: moved subtree ownership, visual highlight group, step range, path hops, and branch-length metrics. | New code should use `driver_subtree` for the physically moved subtree and `highlight_group` for visual context. |
| `affected_subtrees_by_split` | Transition topology data used by timeline construction, comparison connectors, and all-mode subtree highlighting. | Maps each active split / pivot edge to the subtrees affected during that transition. |
| `attachment_edges_by_split` | Source and destination attachment context for moved subtrees. | Maps each active split / pivot edge and moved subtree to one `{ source, destination }` attachment-edge object. |

`moving_subtree` and `moving_subtree_group` are no longer accepted inside SPR movement events. Regenerate or migrate older saved payloads so each event provides explicit `driver_subtree` and `highlight_group` fields.

For the default tree-view visual contract, see
[Highlight Visual Contract](highlight-visual-contract.md). In short,
`subtree_highlight_tracking` and the active `pivot_edge` are visual by default,
while `attachment_edges_by_split` is contextual unless a selected, explain, or
debug mode explicitly opts into showing it.
