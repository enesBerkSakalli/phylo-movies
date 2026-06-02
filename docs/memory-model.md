# Frontend Memory Model

This reviewer-ready version keeps the existing movie-data contract direct: the app still receives one normalized Phylo-Movies payload with `interpolated_trees`, frame metadata, pair metadata, temporal events, metrics, MSA metadata, and provenance. The change is internal to that contract: tree nodes can use compact references, and the frontend hydrates them lazily.

The backend movie contract can now use compact tree transport for repeated branch data:

- `annotation_definitions` stores repeated annotation schema once.
- `tree_name_definitions` stores repeated names once.
- `split_definitions` stores repeated split index arrays once.
- `interpolated_trees` may contain compact tuple nodes.

The frontend keeps this compact payload through validation and browser storage. It does not eagerly hydrate every tree into the full `TreeNode` object graph.

At runtime the store keeps two tree sequences:

- `treePayloadList`: compact transport trees, used as the hydration source.
- `treeList`: sparse hydrated cache, used by renderers.

Renderers still receive the existing hydrated `TreeNode` shape. The store hydrates a tree when a render, layout, or interaction path asks for a specific frame. The render hook also prefetches the current frame plus one neighbor on each side to keep small navigation steps responsive without hydrating the whole dataset.

The sidebar provenance panel includes a small runtime diagnostic:

- hydrated trees / total trees
- compact payload trees / total trees

This is intended for review and debugging, not as a permanent profiling tool.

## Current Limit

This is not backend streaming. The full compact movie payload is still downloaded and stored as one payload. Browser memory can still grow as more frames are visited because hydrated trees remain cached for the session.

Input-tree-only datasets are a special case. The current uniform scaling path treats every observed input tree as a scale anchor, so those datasets may hydrate all input trees during initialization even though the stored payload remains compact. The reviewer-facing norovirus and bootstrap examples now ship real interpolated movie payloads; only the explicit 1000-taxon limit fixture remains input-tree-only.

The corrected interpolated demo payloads are larger than the old input-only shortcuts. Current compact JSON sizes are roughly 142 MB for the reviewer-facing norovirus SH-aLRT movie, 3.2 MB for bootstrap 24, and 51 MB for bootstrap 125.

## Next Larger Step

Chunked tree payloads are the next larger step, not part of this reviewer-ready change. That version would add sidecar tree chunks for both backend runs and static examples, and `ensureTreeHydrated` would become asynchronous. It would reduce initial download and storage pressure further, but it would also expand the backend/static-example contract and touch more rendering call sites. For this release window, the safer change is the direct compact contract plus sparse hydration.
