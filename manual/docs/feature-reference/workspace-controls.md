---
title: Workspace Controls
---

# Workspace Controls

The visualization workspace is organized into the left sidebar, central tree canvas, top-right canvas controls, bottom movie timeline, and optional floating windows.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/workspace-overview.png" alt="Phylo-Movies visualization workspace with sidebar, tree canvas, and movie timeline" />
  <figcaption>The loaded workspace shows the sidebar, tree canvas, comparison panel, and timeline.</figcaption>
</figure>

## Sidebar Groups

| Group | Controls |
| --- | --- |
| **Dataset** | Change Dataset, Provenance, Sequence Alignment. |
| **Layout** | Branch Lengths, Tree Layout, View Mode. |
| **Style** | Geometry & Labels, Taxa & Highlights, Taxa legend. |
| **Analysis** | Moved Subtrees, Tree Metrics. |
| **Focus** | Focus & Dimming, Changed Edge Effects, Group Connectors. |

## Dataset

| Control | Meaning |
| --- | --- |
| **Change Dataset** | Returns to the setup screen. |
| **Provenance** | Shows dataset source, tree source, alignment source, and processing settings when available. |
| **Sequence Alignment** | Opens the MSA viewer and toggles **Follow Current Window** when the dataset includes an alignment. |

## Branch Lengths

| Mode | Meaning |
| --- | --- |
| **Metric: raw branch lengths** | Preserves input branch lengths. |
| **Readable: global sqrt transform** | Applies one square-root transform across the series for readability. |
| **Readable: global log transform** | Applies one log transform across the series for readability. |
| **Animation: normalized sqrt** | Normalizes each tree after a square-root transform for stable motion. |
| **Animation: normalized raw lengths** | Normalizes each tree using raw lengths for stable motion. |
| **Animation: normalized log** | Normalizes each tree after a log transform for stable motion. |
| **Topology only: cladogram-style** | Ignores branch lengths and emphasizes topology. |
| **Metric: doubled branch lengths** | Doubles metric branch lengths. |
| **Experimental: square branch lengths** | Squares branch lengths for experimental inspection. |

Metric modes preserve proportional branch length scale. Animation modes are useful for visual continuity, but they are not absolute evolutionary scale.

## Link Geometry

| Mode | Meaning |
| --- | --- |
| **Radial Elbow** | Draws links with elbow geometry in the radial layout. |
| **Straight Lines** | Draws direct branch segments between nodes. |

## Tree Layout

| Control | Meaning |
| --- | --- |
| **Tree Spread** | Controls how much of the circle the radial tree uses. |
| **Rotation** | Rotates the whole tree around the canvas. |

## View Mode

| Control | Meaning |
| --- | --- |
| **Switch to 2D / Switch to 3D** | Toggles between flat 2D and interactive 3D camera behavior. |

## Geometry and Labels

| Control | Meaning |
| --- | --- |
| **Node Size** | Changes rendered node size. |
| **Branch Width** | Changes branch line thickness. |
| **Label Size** | Changes tip-label text size. |
| **Show Labels** | Shows or hides labels. |
| **Branch Annotation** | Selects available branch annotation labels, such as support values, when the dataset includes them. |

## Taxa and Highlights

| Control | Meaning |
| --- | --- |
| **Edit Taxa Colors** | Opens the Taxa Coloring floating window. |
| **Group Branch Colors** | Applies group/taxa color assignments to monophyletic branch groups. |
| **Change Edges** | Shows changed/pivot edges and lets you choose their color. |
| **Subtree Highlighting** | Highlights moved or manually selected subtrees. |
| **Highlight Opacity** | Controls subtree highlight opacity. |
| **Highlight Scope** | Chooses all affected edges or only the current subtree. |
| **Highlight Style** | Uses a solid color, taxa colors, or high contrast. |
| **Clear Highlighted Subtree** | Removes manually marked subtree highlights. |

## Focus Effects

| Control | Meaning |
| --- | --- |
| **Current Change** | Dims branches outside the current changed edge. |
| **Subtree Highlight** | Dims branches outside the highlighted subtree. |
| **Dim Strength** | Controls how strongly non-focused branches are faded. |
| **Pulse** | Animates changed edges. |
| **Dashed Edges** | Draws changed edges as dashed lines. |
| **Past/Future Changes** | Shows previous and upcoming change context. |
| **Connector Opacity** | Controls group connector opacity. |
| **Connector Width** | Controls group connector stroke width. |
