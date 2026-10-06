# Web Interface

[Back to README](../README.md)

This guide describes the UI surfaces that exist in the current React app.

## Quick Orientation

- Start on the setup screen. Use **Example Library** for bundled data or **New Project** for your own tree/MSA files.
- Confirm the top status says **Engine Connected** before loading examples or processing uploads.
- After processing, the visualization workspace opens with the tree canvas in the center, the **Settings** panel (analysis/style tools) docked on the left, and the movie timeline in a fixed strip at the bottom.
- Use the transport buttons in the player bar to move between input trees and generated frames. Hover a transition on the timeline to read its summary, select it to highlight it, and open the Transition Inspector on demand for the full report.
- Use the **Settings** panel for dataset, layout, style, analysis, and view controls. Alignment, Moved Subtrees, Taxa colouring, and the Transition Inspector open as tabs you can dock, split, or close.
- Use the top-right canvas buttons, mouse wheel, or two-finger trackpad gesture to fit, zoom, reset, export a PNG, or record a WebM movie.
- Open **Settings ▸ View Mode** to pin one input tree as an overlay reference (**Pinned tree**) or to show the true side-by-side two-tree comparison view.

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

### Workspace Layout

The workspace is a docking layout. Every view is a tab in the dock:

| Tab                  | Default placement                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Tree                 | Center. Permanent: it cannot be closed.                                                                   |
| Settings             | Left column on the first visit.                                                                           |
| Transition Inspector | Right column, opened on demand from the **Inspect transition** button or by double-clicking a transition. |
| Moved Subtrees       | Right column, as a tab beside the Inspector.                                                              |
| Alignment            | Below the tree, about 40% of the height.                                                                  |
| Taxa colouring       | Floating window; drag its tab to dock it.                                                                 |

Tabs can be closed, reopened, dragged into splits or tab groups, and resized. The Tree tab can be moved and split like any other tab, but not closed. The arrangement is saved in the browser (`localStorage`) and restored on the next visit. Floating panels are not remembered. If the saved layout cannot be restored, the default layout is used.

The movie player bar and timeline are not tabs. They stay a fixed strip below the dock.

Below 920 px width, all docked panels gather into one tab group. The wide arrangement returns when there is room again.

### Settings Panel

The **Settings** tab holds the dataset, layout, style, analysis, and view controls. Toggle it with the **☰** button in the player bar or **Ctrl/⌘+B**. It has five groups, verified from `src/components/sidebar/ToolsSidebar.jsx`:

| Group    | Purpose                                                                              |
| -------- | ------------------------------------------------------------------------------------ |
| Dataset  | Change dataset and open MSA controls when available.                                 |
| Layout   | Tree structure and layout transform controls.                                        |
| Style    | Geometry dimensions, taxa/highlight controls, and taxa legend.                       |
| Analysis | SPR analytics and tree statistics.                                                   |
| View     | Camera mode, comparison and pinned tree, focus, dimming, and change-effect controls. |

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

### Pinned Tree

The **Pinned tree** control sits in **Settings ▸ View Mode**, below the comparison and link buttons. It pins a selected input tree as a translucent overlay reference while the active tree remains in the main view. Previous/next controls choose which input tree is pinned, the label shows the pinned input tree (or **None**), and the remove button clears the pinned overlay. The viewport fits the active tree and pinned tree together so both remain visible after the pinned tree changes.

### Bottom Movie Player

The player bar has two rows. The top row holds, left to right:

- Settings panel toggle (**☰**)
- Transport controls
- Position text and, during motion, a stage chip
- **Inspect transition** button
- **Alignment** button (when MSA data are available)
- Playback speed control

The bottom row holds the timeline strip (see [Reading the timeline](#reading-the-timeline)), the zoom out (−), fit (⛶), and zoom in (+) buttons, and a **(?)** button that opens the timeline legend. On a phone (under 640 px wide) the first row keeps only the menu, the transport buttons, and a **⋯** button, with the position on its own line below, and the strip takes the full width of the second row; speed, zoom, **Inspect transition**, the alignment button, and the legend are in the **⋯** popover.

The position text reads "Tree a → b · step i of N" (or "Input tree n" on an input tree), and its tooltip shows the current movie time. The **Inspect transition** button next to it opens the Transition Inspector for the selected transition, or with nothing selected for the transition under the playhead. On an input tree with nothing selected it is dimmed but still reachable by keyboard, and its tooltip says why. When MSA data are available, the status area also reports the active alignment window and the configured window/step size.

Transport buttons:

- Previous input tree
- Previous generated frame
- Play/Pause sequence
- Next generated frame
- Next input tree

The side-by-side comparison view, the link/unlink toggle (comparison mode only), and the pinned tree live in **Settings ▸ View Mode**, not in the player bar.

#### Reading the timeline

The timeline strip draws one gray bar per transition, that is, between each pair of consecutive input trees:

- Bar height is the normalized Robinson-Foulds (RF) distance of that transition, scaled to the largest RF in the dataset. The legend (the **(?)** button at the end of the strip) shows **RF change (max …)** with that maximum. RF and weighted RF per transition are also in the hover tooltip and the Transition Inspector.
- Below the baseline, one dot marks each SPR move. Dot size is the number of taxa moved. Where a transition is too narrow for its moves, they merge into one dot whose size is the move count; zoom in to see each move.
- A dashed segment marks a transition where only branch lengths changed (RF 0, weighted RF above 0): **Branch lengths only**.
- Short ticks mark input trees (circles at high zoom).
- The selected transition turns dark, with a bracket under the exact selected part, so it reads by its shape as well as its colour. The cyan line is the playhead: drag its knob at the top of the strip, or the line itself, to scrub. A click anywhere else selects the transition under it, even right beside the playhead (a press on the playhead that does not move counts as a click); clicking the selected transition again clears the selection.

Zoomed in, **Shift + wheel**, a sideways swipe, or a drag on empty strip pans the strip; the wheel zooms about the pointer, and the zoom buttons about the playhead. During playback the view pages to keep the playhead in sight. Numbering is 1-based and per transition. The hover tooltip appears above the player bar, so it never covers the controls. Its header reads "Transition k of P · Tree a → b", followed by "RF x · weighted RF y" and either "n SPR moves · m taxa moved" or "Branch lengths only".

#### Timeline keyboard

Click the strip, or Tab to it, to use the keyboard on it. The focus ring (an ink outline inside the strip, so cyan stays the playhead's) shows for keyboard focus, not after a click.

| Key                   | Result                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Space**             | Plays or pauses.                                                                                                                                                                            |
| **← / →**             | Previous or next generated frame, from the playhead.                                                                                                                                        |
| **Shift + ← / →**     | Previous or next input tree, from the playhead.                                                                                                                                             |
| **PageUp / PageDown** | Selects and jumps to the previous or next transition, skipping input trees, from the segment under the playhead.                                                                            |
| **Home / End**        | Selects and jumps to the first or last segment.                                                                                                                                             |
| **Enter**             | Opens the Transition Inspector for the selected transition, or with nothing selected for the one under the playhead (selecting it). On an input tree with nothing selected it does nothing. |
| **Esc**               | Clears the selection, so the Inspector follows the playhead again. With nothing selected it does nothing, and the key goes to whatever else is open.                                        |
| **+ / −**             | Zooms the strip in or out about the playhead.                                                                                                                                               |
| **0**                 | Fits the whole sequence.                                                                                                                                                                    |

The playhead and the selection are separate: the arrow keys move the playhead and leave the selection on the transition you chose. Clicking, PageUp / PageDown, Home / End, and Enter change the selection; Esc, or clicking the selected transition again, clears it.

The same Space and arrow keys work anywhere except in text fields, sliders (such as Playback Speed), and menus. With the tree canvas focused, Space still plays and pauses, but the arrow keys pan the tree.

### Transition Inspector

The **Transition Inspector** opens on demand, as a tab in the right column. Selecting a transition on the timeline does not open it. Click **Inspect transition** next to the position text (available when a transition is selected or playing), double-click a transition on the strip, or press **Enter** on the focused strip. With nothing selected it follows the transition under the playhead and says so; selecting a transition pins it until you press **Esc** or click it again. Closing the Inspector tab keeps the selection. It reports:

- Header "Transition k of P", name "Tree a → Tree b", and the direction
- Steps "s–e of N" (global frame range and local steps), plus "Event j of m" when a transition has several split events
- Moving taxa count
- Animation steps
- Pivot edge
- Affected subtree groups
- RF distance and weighted RF when available
- Source input tree scale when available
- MSA window when available

### SPR Analytics

Open **Analysis -> Moved Subtrees** to inspect the movement tables behind the
animation. It opens as a **Moved Subtrees** tab beside the Transition Inspector and has three internal tabs:

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

### Other Panels

| Panel          | How it opens                               | What it does                                                                                                                                                                |
| -------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alignment      | MSA controls/Settings when MSA data exists | Shows sequences, columns, and synchronized MSA window context. With **Follow Current Window** enabled, stepping between input trees updates the displayed alignment window. |
| Taxa colouring | Style controls                             | Assigns colors to taxa, name patterns, or CSV groups. Opens as a floating window.                                                                                           |
| Moved Subtrees | Analysis group in Settings                 | Shows movement analytics and event tables (see SPR Analytics above).                                                                                                        |

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
| Some inspector metrics unavailable | The processed payload lacks that metric for the selected transition.    | Check source data and backend output contract.                                                      |
