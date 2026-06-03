---
title: Usage Workflows
---

# Usage Workflows

Phylo-Movies supports four common workflows.

| Workflow                     | Required input                     | Result                                                                   |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Generated browser example    | Precomputed demo data              | Opens immediately in the browser demo.                                   |
| Uploaded tree series         | Newick tree file                   | Builds transition frames between ordered input trees.                    |
| Trees with MSA context       | Newick tree file and MSA alignment | Shows tree transitions with synchronized alignment windows.              |
| MSA sliding-window inference | MSA alignment                      | Runs tree inference in windows, then animates the resulting tree series. |

## Inspect a Transition

1. Load a dataset.
2. Use the movie timeline to find a segment between input trees.
3. Hover for a compact tooltip or select the segment for the Transition Inspector.
4. Review moving taxa, generated frame count, pivot edge, RF metrics, and MSA window data when available.

See [Timeline and inspection](feature-reference/timeline-and-inspection.md) for the full control reference.

## Inspect Recurrent Moved Subtrees

1. Load a dataset that contains SPR move events.
2. Open **Analysis -> Moved Subtrees**.
3. Use **Recurrent Subtrees** to find taxa or clades that move repeatedly.
4. Select a recurrent subtree row to mark it in the tree view.
5. Switch to **SPR Moves** to inspect the source attachment, target attachment, pivot edge, movement metrics, and branch-support or annotation values for each movement event.

See [SPR analytics](feature-reference/spr-analytics.md) for the table definitions and branch-value filters.

## Adjust the View

Use the sidebar to control layout, labels, dimensions, taxa coloring, and focus effects. Use the top-right canvas controls to fit, zoom, reset, save a PNG, or record a WebM.

See [Workspace controls](feature-reference/workspace-controls.md), [Taxa coloring](feature-reference/taxa-coloring.md), and [Export and recording](feature-reference/export-and-recording.md) for detailed settings.

## Export Output

Once a dataset is loaded and the canvas is rendered, the export controls can save:

- a PNG snapshot of the current tree view,
- a WebM screen recording of playback.

Disabled export controls usually mean that no tree canvas is ready yet.
