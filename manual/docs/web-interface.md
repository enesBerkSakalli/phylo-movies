---
title: Web Interface
---

# Web Interface

The application has two main surfaces: the setup screen and the visualization workspace.

## Setup Screen

Use **New Project** for local files and **Example Library** for bundled data. The backend status badge explains whether upload processing and tree inference are available.

In GitHub Pages demo mode, generated examples can open without a backend. Uploads and backend-driven example processing still require a local or desktop backend.

## Visualization Workspace

The workspace is organized around the tree canvas, sidebar, and movie timeline.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-overview.png" alt="Phylo-Movies visualization workspace with sidebar, tree canvas, and movie timeline" />
  <figcaption>The workspace combines the tool sidebar, central tree canvas, comparison panel, and bottom movie timeline.</figcaption>
</figure>

| Area | Purpose |
| --- | --- |
| Sidebar | Dataset, layout, style, analysis, and focus controls. |
| Tree canvas | Main deck.gl visualization for the current tree or comparison view. |
| Canvas controls | Fit, zoom, reset, PNG export, and WebM recording. |
| Movie timeline | Input tree markers, generated frames, transport controls, speed, and charts. |
| Transition Inspector | Detailed report for the selected topology-change segment. |
| Floating windows | MSA viewer, taxa coloring, and SPR analytics when available. |

For detailed settings and methods, see the [Feature Reference](feature-reference/index.md).

## Manual Workspace Tour

After a visualization is loaded, use the **Help** button in the workspace to start the guided tour. The tour highlights the main workspace areas without changing data, starting playback, recording, or downloading files.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-tour.png" alt="Workspace tour overlay highlighting the Phylo-Movies sidebar" />
  <figcaption>The workspace tour explains the main UI regions in place and can be closed at any time.</figcaption>
</figure>
