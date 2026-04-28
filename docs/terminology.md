# Terminology

This project uses the terms below consistently in user-facing text, docs, tests, and new code. Existing backend field names are kept when they are part of the serialized API.

## Tree And Timeline Terms

| Term | Use For | Avoid Using For |
|------|---------|-----------------|
| Anchor tree | An observed input tree in the timeline, usually one inferred from a sliding alignment window or one bootstrap replicate. | Any interpolated state between observed trees. |
| Transition frame | An interpolated tree state generated between two anchor trees. | An observed input tree. |
| Timeline segment | A rendered interval in the scrubber. A segment is either an anchor-tree segment or a transition segment. | A biological grouping or an alignment window. |
| Sliding window | A contiguous region of an MSA used to infer one anchor tree. | Timeline segment, animation frame, or tree object. |

## Tree Topology Terms

| Term | Use For | Avoid Using For |
|------|---------|-----------------|
| Subtree | A topology-defined set of taxa or descendants that moves, is highlighted, or is matched during an SPR transition. This is the default app term. | A generic alignment region or timeline range. |
| Clade | Biological prose where monophyly is the point. Use sparingly in implementation docs unless contrasting with subtree. | The app's moving/highlighted group abstraction. |
| Split | The internal/backend representation of a bipartition, usually serialized as `split`, `split_indices`, `pivot_edge`, or `split_change_timeline`. | User-facing descriptions of moving groups. |
| Partition | Generic programming/data partitioning only. Do not use it as a synonym for split or subtree. | Phylogenetic topology concepts unless an external algorithm explicitly says partition. |

## Compatibility Names

Do not rename these fields just to match prose:

- `split_indices`
- `split_change_timeline`
- `pivot_edge`
- `subtree_tracking`
- `jumping_subtree_solutions`
- `tree_pair_solutions`

When wrapping those fields in frontend code, use names that describe the app concept. For example, keep `split_indices` at the parser boundary, but prefer `subtree`, `pivotEdge`, `anchorTree`, and `transitionFrame` in local variables where that is what the value represents.
