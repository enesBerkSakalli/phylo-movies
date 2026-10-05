---
title: Workspace Controls
---

# Workspace Controls

The visualization workspace is a docking layout. The central tree canvas, the Settings panel, top-right canvas controls, and optional panels (Transition Inspector, Moved Subtrees, Alignment, Taxa colouring) are dock tabs, and the movie timeline is a fixed strip at the bottom.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-overview.png" alt="Phylo-Movies visualization workspace with settings panel, tree canvas, and movie timeline" />
  <figcaption>The loaded workspace shows the Settings panel, tree canvas, and the two-row player bar with transport controls and the timeline strip.</figcaption>
</figure>

## Workspace Layout

Every view is a tab in the dock:

| Tab                      | Default placement                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Tree**                 | Center. Permanent: it cannot be closed, but it can be moved and split.                                                             |
| **Settings**             | Left column on the first visit.                                                                                                    |
| **Transition Inspector** | Right column. Opens on demand from **Inspect transition** or by double-clicking a transition; closing the tab keeps the selection. |
| **Moved Subtrees**       | Right column, as a tab beside the Inspector.                                                                                       |
| **Alignment**            | Below the tree, about 40% of the height.                                                                                           |
| **Taxa colouring**       | Floating window. Drag its tab to dock it.                                                                                          |

Tabs can be closed, reopened, dragged into splits or tab groups, and resized. The arrangement is saved in the browser (`localStorage`) and restored on the next visit. Floating panels are not remembered. If the saved layout cannot be restored, the default layout is used.

Toggle **Settings** with the **☰** button in the player bar or **Ctrl/⌘+B**. The movie player bar and timeline are a fixed strip below the dock and are never tabs. Below 920 px width, all docked panels gather into one tab group; the wide arrangement returns when there is room.

## Settings Groups

The **Settings** tab contains these groups:

| Group        | Controls                                                            |
| ------------ | ------------------------------------------------------------------- |
| **Dataset**  | Change Dataset, Provenance, Sequence Alignment.                     |
| **Layout**   | Branch Lengths, Tree Layout.                                        |
| **Style**    | Geometry & Labels, Taxa & Highlights, Taxa legend.                  |
| **Analysis** | Moved Subtrees, Tree Metrics.                                       |
| **View**     | View Mode, Focus & Dimming, Changed Edge Effects, Group Connectors. |

## Dataset

| Control                | Meaning                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Change Dataset**     | Returns to the setup screen.                                                                              |
| **Provenance**         | Shows dataset source, tree source, alignment source, and processing settings when available.              |
| **Sequence Alignment** | Opens the **Alignment** tab and toggles **Follow Current Window** when the dataset includes an alignment. |

## Branch Lengths

| Mode                                          | Meaning                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| **Original: input branch lengths**            | Preserves input branch lengths.                                       |
| **Readable scale: global sqrt transform**     | Applies one square-root transform across the series for readability.  |
| **Readable scale: global log transform**      | Applies one log transform across the series for readability.          |
| **Animation scale: normalized sqrt**          | Normalizes each tree after a square-root transform for stable motion. |
| **Animation scale: normalized input lengths** | Normalizes each tree using input branch lengths for stable motion.    |
| **Animation scale: normalized log**           | Normalizes each tree after a log transform for stable motion.         |
| **Topology only: cladogram-style**            | Ignores branch lengths and emphasizes topology.                       |
| **Experimental: doubled input lengths**       | Doubles input branch lengths.                                         |
| **Experimental: squared input lengths**       | Squares input branch lengths for experimental inspection.             |

Original scale preserves proportional input branch lengths. Readable scale applies one global transform. Animation scale is useful for visual continuity, but it is not absolute evolutionary scale.

## Link Geometry

| Mode               | Meaning                                               |
| ------------------ | ----------------------------------------------------- |
| **Radial Elbow**   | Draws links with elbow geometry in the radial layout. |
| **Straight Lines** | Draws direct branch segments between nodes.           |

## Tree Layout

| Control         | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| **Tree Spread** | Controls how much of the circle the radial tree uses. |
| **Rotation**    | Rotates the whole tree around the canvas.             |

The tree canvas can also be magnified with the top-right zoom controls, mouse wheel, or two-finger trackpad gesture. Dragging the canvas moves the view across the current tree without changing the underlying topology or branch lengths.

## Geometry and Labels

| Control               | Meaning                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node Size**         | Changes rendered node size.                                                                                                                                                                                                                                               |
| **Branch Width**      | Changes branch line thickness.                                                                                                                                                                                                                                            |
| **Label Size**        | Changes tip-label text size.                                                                                                                                                                                                                                              |
| **Show Labels**       | Shows or hides labels.                                                                                                                                                                                                                                                    |
| **Branch Annotation** | Selects available internal-branch labels. **Label / Raw Internal Label** is the original Newick/source label text. **Support / IQ-TREE / SH-aLRT** is the parsed numeric SH-aLRT support value, so it can look identical when the raw label contains only that one value. |

## Taxa and Highlights

| Control                        | Meaning                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| **Edit Taxa Colors**           | Opens the **Taxa colouring** floating window.                       |
| **Monophyletic Branch Colors** | Applies group/taxa color assignments to monophyletic branch groups. |
| **Change Edges**               | Shows changed/pivot edges and lets you choose their color.          |
| **Subtree Highlighting**       | Highlights moved or manually selected subtrees.                     |
| **Highlight Opacity**          | Controls subtree highlight opacity.                                 |
| **Highlight Scope**            | Chooses all affected edges or only the current subtree.             |
| **Highlight Style**            | Uses a solid color, taxa colors, or high contrast.                  |
| **Focus**                      | Zooms to the manually highlighted subtree.                          |
| **Clear**                      | Removes manually marked subtree highlights.                         |

## View Mode

| Control                                       | Meaning                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Switch to 2D Camera / Switch to 3D Camera** | Toggles the camera controls only. The 3D view tilts and orbits the same flat tree layout; topology, rooting, and branch lengths are unchanged. |
| **Show / Hide comparison view**               | Displays or hides a neighboring comparison tree beside the active tree.                                                                        |
| **Link / Unlink tree views**                  | Shown only in comparison mode. Keeps the two views synchronized or lets each move independently.                                               |
| **Pinned tree ‹ ›**                           | Pins an input tree as a translucent overlay reference behind the active tree. **None** means no pin; the remove button clears it.              |

## Focus Effects

| Control                 | Meaning                                               |
| ----------------------- | ----------------------------------------------------- |
| **Current Change**      | Dims branches outside the current changed edge.       |
| **Subtree Highlight**   | Dims branches outside the highlighted subtree.        |
| **Dim Strength**        | Controls how strongly non-focused branches are faded. |
| **Pulse**               | Animates changed edges.                               |
| **Dashed Edges**        | Draws changed edges as dashed lines.                  |
| **Past/Future Changes** | Shows previous and upcoming change context.           |
| **Connector Opacity**   | Controls group connector opacity.                     |
| **Connector Width**     | Controls group connector stroke width.                |
