---
title: Web Interface
---

# Web Interface

The application has two main surfaces: the setup screen and the visualization workspace.

## Setup Screen

Use **New Project** for local files and **Example Library** for bundled data. The backend status badge explains whether upload processing and tree inference are available.

In GitHub Pages demo mode, generated examples can open without a backend. Uploads and backend-driven example processing still require the local source checkout, Docker full stack, or optional desktop backend.

## Visualization Workspace

The workspace is a docking layout: the tree canvas, the Settings panel, and optional analysis panels are tabs in a dock, with the movie timeline in a fixed strip below.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-overview.png" alt="Phylo-Movies visualization workspace with settings panel, tree canvas, and movie timeline" />
  <figcaption>The workspace combines the Settings panel, central tree canvas, and bottom movie timeline with playback, comparison, and pinned-tree controls.</figcaption>
</figure>

| Area                 | Purpose                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Settings panel       | Dataset, layout, style, analysis, and view controls.                                                                    |
| Tree canvas          | Main deck.gl visualization for the current tree or comparison view.                                                     |
| Canvas controls      | Fit, zoom, reset, PNG export, and WebM recording.                                                                       |
| Movie timeline       | Input tree markers, generated frames, transport controls, speed, and charts. Fixed strip below the dock, never a tab.   |
| Transition Inspector | Detailed report for the selected topology-change segment. Opens in the right column when you select a timeline segment. |
| Other panels         | Alignment (MSA viewer), Moved Subtrees (SPR analytics), and Taxa colouring.                                             |

Every view is a tab in the dock: **Tree** (permanent, cannot be closed), **Settings**, **Transition Inspector**, **Moved Subtrees**, **Alignment**, and **Taxa colouring**. Tabs can be closed, reopened, dragged into splits or tab groups, and resized. The arrangement is saved in the browser and restored on the next visit; floating panels are not remembered, and if the saved layout cannot be restored the default layout is used. Toggle **Settings** with the **☰** button in the player bar or **Ctrl/⌘+B**. Below 920 px width, all docked panels gather into one tab group.

For detailed settings and methods, see the [Feature Reference](feature-reference/index.md).

## Manual Workspace Tour

After a visualization is loaded, use the **Help** button in the workspace to start the guided tour. The tour highlights the main workspace areas without changing data, starting playback, recording, or downloading files.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-tour.png" alt="Workspace tour overlay highlighting the Phylo-Movies sidebar" />
  <figcaption>The workspace tour explains the main UI regions in place and can be closed at any time.</figcaption>
</figure>
