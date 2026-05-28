# Web Interface

[Back to README](../README.md)

This guide describes the UI surfaces that exist in the current React app.

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
| Layout   | Tree structure, layout transform, and view mode controls.      |
| Style    | Geometry dimensions, taxa/highlight controls, and taxa legend. |
| Analysis | SPR analytics and tree statistics.                             |
| Focus    | Focus and change-effect controls.                              |

### Main Canvas

The main canvas renders the active tree or comparison view using deck.gl. Mouse and trackpad interactions are handled by the tree controller.

Top-right canvas controls:

- Fit all visible content
- Zoom out
- Reset tree view
- Zoom in
- Recording controls
- Image export

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

Transport buttons:

- Previous input tree
- Previous generated frame
- Play/Pause sequence
- Next generated frame
- Next input tree
- Show/hide comparison view
- Link/unlink tree views when comparison mode is active

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

### Floating Windows

| Window             | How it opens                              | What it does                                                   |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| Sequence Alignment | MSA controls/sidebar when MSA data exists | Shows sequences, columns, and synchronized MSA window context. |
| Taxa Colors        | Style controls                            | Assigns colors to taxa, name patterns, or CSV groups.          |
| SPR Analytics      | Analysis sidebar                          | Shows movement analytics and event tables.                     |

## What You See / What It Means

| What you see                       | What it means                                                     | What to do next                                                           |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Engine Offline                     | Frontend cannot reach the backend.                                | Run `./start.sh` or start `engine/BranchArchitect/start_movie_server.sh`. |
| Dataset processing failed          | Backend rejected the upload, stalled, or sent a malformed stream event. | Read the alert details, retry a small example, and check `engine/BranchArchitect/logs/backend.log`. |
| PNG export is not ready yet        | Tree rendering has not exposed a deck.gl canvas.                  | Wait for the tree to finish rendering or reload the dataset if the canvas is blank. |
| Processing overlay                 | Upload accepted and backend processing is in progress.            | Wait for progress or inspect backend logs if it stalls.                   |
| Timeline input tree markers        | Observed input trees from the uploaded or inferred series.        | Jump with previous/next input tree controls.                              |
| Generated frame controls enabled   | At least two frames exist in the active sequence.                 | Step or play the movie.                                                   |
| MSA window unavailable             | No MSA data is loaded or mapped for the current dataset.          | Use an MSA example or upload an MSA.                                      |
| Some inspector metrics unavailable | The processed payload lacks that metric for the selected segment. | Check source data and backend output contract.                            |
