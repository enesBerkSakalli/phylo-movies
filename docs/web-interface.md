# Web Interface

[Back to README](../README.md)

This guide describes the UI surfaces that exist in the current React app.

## Quick Orientation

- Start on the setup screen. Use **Example Library** for bundled data or **New Project** for your own tree/MSA files.
- Confirm the top status says **Engine Connected** before loading examples or processing uploads.
- After processing, the visualization workspace opens with the tree canvas in the center, analysis/style tools in the left sidebar, and the movie timeline at the bottom.
- Use the bottom transport buttons to move between input trees and generated frames. Select or hover timeline segments to inspect topology changes.
- Use the left sidebar for dataset, layout, style, analysis, and view controls. MSA and taxa-color tools open as floating windows when those data are available.
- Use the top-right canvas buttons, mouse wheel, or two-finger trackpad gesture to fit, zoom, reset, export a PNG, or record a WebM movie.
- Use the floating **Pinned tree** panel to pin one input tree as an overlay reference. Use the bottom-bar comparison button for the true side-by-side two-tree view.

## Setup Screen

### Top Bar

- Shows **Phylo-Movies**.
- Shows backend status: **Engine Connected**, **Engine Unavailable**, or **Engine Checking**.
- When the backend is unavailable, an alert explains that dataset loading, tree processing, interpolation, and MSA workflows need the desktop engine or local full-stack backend.

### New Project Tab

Use this tab for local files.

Zones:

- File upload section: accepts tree and/or MSA files.
- Processing path alert: updates after files are selected.
- Analysis settings: appears after a valid file choice.
- Sliding Windows / MSA Window Mapping: appears when an MSA is present.
- Tree Adjustments: includes midpoint rooting.
- Tree Inference: appears for MSA-only workflows and exposes IQ-TREE/FastTree settings.
- Project actions: process or reset the project.

### Example Library Tab

Use this tab for bundled examples from `publication_data/`.

Columns:

- Dataset
- Workflow
- Scale
- MSA availability
- Demonstrates
- Actions

Actions:

- **Load** processes the example.
- Download buttons save the tree or MSA example files.

## Visualization Workspace

### Sidebar

The left sidebar has five groups, verified from `src/components/sidebar/ToolsSidebar.jsx`:

| Group    | Purpose                                                        |
| -------- | -------------------------------------------------------------- |
| Dataset  | Change dataset and open MSA controls when available.           |
| Layout   | Tree structure and layout transform controls.                  |
| Style    | Geometry dimensions, taxa/highlight controls, and taxa legend. |
| Analysis | SPR analytics and tree statistics.                             |
| View     | Camera mode, focus, dimming, and change-effect controls.       |

### Main Canvas

The main canvas renders the active tree or comparison view using deck.gl. Mouse-wheel and two-finger trackpad gestures zoom the tree, while drag gestures pan the current view.

Top-right canvas controls:

- Fit all visible content
- Zoom out
- Reset tree view
- Zoom in
- Recording controls
- Image export

The tree-size, label-size, branch-width, and label-spacing controls are in **Style -> Geometry & Labels**. These controls are useful when tip labels occupy more space than the tree, especially in circular layouts.

### Pinned Tree Panel

The floating **Pinned tree** panel starts in the lower-left corner of the canvas. It pins a selected input tree as a translucent overlay reference while the active tree remains in the main view. Previous/next controls choose which input tree is pinned. The viewport fits the active tree and pinned tree together so both remain visible after the pinned tree changes. The drag handle moves the panel, the close button hides the pinned overlay, and the eye button restores the panel.

### Bottom Movie Player

The bottom bar contains:

- Sidebar toggle
- Timeline status strip
- Transport controls
- Playback speed control
- Timeline expand/collapse button
- Timeline legend and scroll controls
- Timeline visualization
- Chart section

Hover the timeline status strip to show the current segment, cursor position, and normalized sequence coordinate. When MSA data are available, the same strip also reports the active alignment window and the configured window/step size.

Transport buttons:

- Previous input tree
- Previous generated frame
- Play/Pause sequence
- Next generated frame
- Next input tree
- Show/hide side-by-side comparison view
- Link/unlink the two trees when comparison mode is active

### Transition Inspector

Selecting a timeline segment opens the **Transition Inspector**. It reports:

- Segment name and direction
- Global frame range and local steps
- Moving taxa count
- Generated frame count
- Animation steps
- Pivot edge
- Affected subtree groups
- RF distance and weighted RF when available
- Source input tree scale when available
- MSA window when available

### SPR Analytics

Open **Analysis -> Moved Subtrees** to inspect the movement tables behind the
animation. The analytics window has three tabs:

| Tab                | What it shows                                                                                                                                                                                          | How to use it                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview           | Dataset-level counts for moved subtrees, SPR moves, and active tree pairs.                                                                                                                             | Use this first to see whether the current tree sequence contains a small or large number of movement events.                                                                                                                                  |
| SPR Moves          | One row per SPR move between neighboring input trees. Each row reports the moved subtree, pivot edge, source attachment, target attachment, movement steps, RF/weighted RF metrics, and branch values. | Use this table to inspect the placement context for an individual movement: where a subtree was attached in the source tree, where it attaches in the target tree, and which support or annotation values are associated with those branches. |
| Recurrent Subtrees | Moved subtrees aggregated across all SPR moves, ranked by repeat count. Columns include SPR move count, tree-pair count, percentage of moves, total/average path hops, and total/average path length.  | Use this table to identify taxa or subtrees that move repeatedly. Click a row to mark that subtree in the tree view, then switch to **SPR Moves** to inspect its source/target attachment contexts.                                           |

The **SPR Moves** table is the detailed event ledger. Its **Source attachment**
and **Target attachment** columns describe the neighboring tree context before
and after the move. Its **Branch Value** column shows source-to-target values for
both the moved subtree and the nearest parent branch. When the loaded trees carry
branch-support, SH-aLRT, or bootstrap split-frequency labels, these values
provide the support context for the placement being left or entered. The value
filters classify rows against the selected threshold, which helps separate
movements involving strongly supported placements from movements in weaker or
missing-support contexts.

The **Recurrent Subtrees** table is a summary, not a detector by itself. A high
recurrence count means that the same taxon or subtree participates in many SPR
moves, but interpretation should use the detailed **SPR Moves** rows, branch
values, and the tree animation together. This is useful for exploratory questions
such as whether a candidate rogue taxon jumps broadly across the tree or
repeatedly switches between a small number of source and target attachment
contexts.

### Floating Windows

| Window             | How it opens                              | What it does                                                                                                                                                                |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequence Alignment | MSA controls/sidebar when MSA data exists | Shows sequences, columns, and synchronized MSA window context. With **Follow Current Window** enabled, stepping between input trees updates the displayed alignment window. |
| Taxa Colors        | Style controls                            | Assigns colors to taxa, name patterns, or CSV groups.                                                                                                                       |
| SPR Analytics      | Analysis sidebar                          | Shows movement analytics and event tables.                                                                                                                                  |

## What You See / What It Means

| What you see                       | What it means                                                           | What to do next                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Engine Offline                     | Frontend cannot reach the backend.                                      | Run `./start.sh` or start `engine/BranchArchitect/start_movie_server.sh`.                           |
| Dataset processing failed          | Backend rejected the upload, stalled, or sent a malformed stream event. | Read the alert details, retry a small example, and check `engine/BranchArchitect/logs/backend.log`. |
| PNG export is not ready yet        | Tree rendering has not exposed a deck.gl canvas.                        | Wait for the tree to finish rendering or reload the dataset if the canvas is blank.                 |
| Processing overlay                 | Upload accepted and backend processing is in progress.                  | Wait for progress or inspect backend logs if it stalls.                                             |
| Timeline input tree markers        | Observed input trees from the uploaded or inferred series.              | Jump with previous/next input tree controls.                                                        |
| Generated frame controls enabled   | At least two frames exist in the active sequence.                       | Step or play the movie.                                                                             |
| MSA window unavailable             | No MSA data is loaded or mapped for the current dataset.                | Use an MSA example or upload an MSA.                                                                |
| Some inspector metrics unavailable | The processed payload lacks that metric for the selected segment.       | Check source data and backend output contract.                                                      |
