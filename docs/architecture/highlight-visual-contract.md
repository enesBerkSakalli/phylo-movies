# Highlight Visual Contract

This document defines which backend movement fields are visual by default and
which fields are contextual. Keep this contract in sync with
`docs/architecture/terminology.md`, `src/domain/backend/phyloMovieTypes.ts`, and
`src/domain/backend/solutionValidators.ts`.

## Principle

The main tree view should explain the current topology change with the fewest
simultaneous visual channels possible. Backend fields are not automatically
visual categories. A field becomes a default highlight only when it represents
the current on-screen movement state.

## Visual By Default

| Backend or runtime field                                                       | Meaning                                                               | Default visual role                                                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `subtree_highlight_tracking`                                                   | Per-frame active mover highlight groups emitted by the backend.       | Primary active-mover highlight. This should be the clearest signal for what is moving now.                                    |
| `temporal_events[].highlight_group`                                            | Per-SPR visual context for the active mover event.                    | Feeds active-mover interpretation and analytics. Do not split it into unrelated colors.                                       |
| `pivot_edge` / active pivot edge tracking                                      | The active changed split for a generated frame or split-change event. | Secondary changed-edge highlight. It may be colored, dashed, pulsed, or thickened, but should not overpower the active mover. |
| Derived lifecycle state such as entering, reviving, exiting, and zeroing links | Frontend-derived branch lifecycle during interpolation.               | May use collapse/expand lifecycle styling because it explains disappearing or appearing topology.                             |

## Contextual By Default

| Backend field                      | Meaning                                                                              | Default visual role                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attachment_edges_by_split`        | Source and destination attachment context for each moved subtree under a pivot edge. | Context only. Store it for inspectors, hover details, analytics, dimming exemptions, explain/debug modes, and tests. Do not promote it to primary link/node color, outline, width, dash, or radius in the default tree view. |
| `affected_subtrees_by_split`       | Pair-level affected subtrees grouped by active split.                                | Context by default. It can drive timeline construction, comparison connectors, all-mode subtree highlighting, and selected-segment explanations. It should not replace the per-frame active mover in default playback.       |
| `temporal_events[].driver_subtree` | The planner-selected physically moved subtree for one SPR event.                     | Analytics and ownership context. The default tree view should normally consume the frame-level active mover/highlight group instead of independently styling `driver_subtree`.                                               |
| `collapse_path` and `expand_path`  | Path and branch-length metrics for SPR movement.                                     | Inspector or analytics context. Use for explanation panels, not always-on tree highlights.                                                                                                                                   |
| `pair_metrics`                     | Pair-level RF and weighted RF metrics.                                               | Timeline/chart/statistics context, not tree-element highlighting.                                                                                                                                                            |

## Precedence

Default render precedence should stay small and predictable:

1. Lifecycle state for entering or exiting topology.
2. Active mover from `subtree_highlight_tracking`.
3. Active pivot edge.
4. Optional history/upcoming previews when the user enables that mode.
5. Explicit selected/all-scope subtree highlights when the user enables those
   contextual modes.
6. Base/taxa/monophyletic coloring.

Contextual backend fields can appear in selected, hover, explain, or debug
modes, but those modes should be visibly separate from default playback.

## Implementation Contract

`src/treeVisualisation/deckgl/layers/styles/highlightResolver.js` is the central
semantic resolver for tree element highlight roles. Render accessors may map
those roles to color, width, outline, dash, radius, label, and extension styles,
but they should not reclassify backend fields independently.

The resolver intentionally separates `activeMover` from `subtreeHighlight`.
`activeMover` comes from the frame-level active mover channel; `subtreeHighlight`
is broader selected or all-scope context. Source/destination attachment fields
are exposed as resolver context, not as visual roles.

## Development Rules

- Do not add a new persistent hue for every backend field.
- Do not style `attachment_edges_by_split` as a primary default highlight.
- Keep source/destination attachment context available in state if it helps
  inspectors or avoids dimming important context, but do not let it outrank the
  active mover or pivot edge.
- Route default tree-render styling decisions through
  `resolveTreeElementHighlight` before changing link, node, label, or extension
  accessors.
- Add tests when changing highlight semantics. At minimum, assert that:
  - `subtree_highlight_tracking` maps to active mover styling.
  - `pivot_edge` maps to changed-edge styling.
  - `attachment_edges_by_split` remains contextual in default playback.
