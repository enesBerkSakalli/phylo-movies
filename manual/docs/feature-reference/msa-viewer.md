---
title: MSA Viewer
---

# MSA Viewer

The MSA viewer appears when the dataset includes alignment data. It can be opened from the sidebar **Sequence Alignment** section or from the timeline shortcut.

## Sidebar Controls

| Control | Meaning |
| --- | --- |
| **Open Alignment** | Opens the floating alignment viewer. |
| **Follow Current Window** | Keeps the viewer synchronized with the current input tree or timeline segment. |

If **Follow Current Window** is disabled, the MSA viewer keeps its current viewport while the tree movie moves.

When **Follow Current Window** is enabled, synchronization follows the current input-tree/window index. During an interpolated transition, the tree viewer distinguishes the source tree and target tree; the MSA viewer follows the corresponding input window rather than redrawing for every intermediate interpolation frame.

## Region Override

| Control | Meaning |
| --- | --- |
| **Region start / end** | Sets a manual alignment-column range. |
| **Set** | Applies the region override. If start is greater than end, the values are swapped. |
| **Clear** | Removes the manual region and returns to the dataset or timeline-derived region. |

Region overrides are useful when you want to inspect a specific coordinate range independent of the active movie frame.

## View Actions

| Control | Meaning |
| --- | --- |
| **Zoom in alignment** | Increases alignment zoom. |
| **Zoom out alignment** | Decreases alignment zoom. |
| **Reset alignment view** | Restores the default alignment viewport. |

The viewer also has horizontal and vertical scrollbars for navigating long alignments and many taxa.

## Row Order

| Control | Meaning |
| --- | --- |
| **Match Tree Order** | Reorders alignment rows to match the visible tree leaf order. |
| **Reset Order** | Restores the default alignment row order. |

Matching tree order helps compare moving clades with their sequence rows.

## Coloring

The alignment viewer supports these color schemes:

| Scheme | Use |
| --- | --- |
| **None (Empty)** | Removes residue background coloring. |
| **Default** | General residue coloring. |
| **Clustal / Clustal2** | Clustal-style residue classes. |
| **Hydrophobicity, Zappo, Taylor, Buried, Cinema, Helix, Lesk, Mae, Strand, Turn** | Protein-oriented property schemes. |
| **Nucleotide (DNA), Purine (DNA)** | DNA-oriented schemes. |
| **Identity to Consensus, Similarity to Consensus** | Consensus-relative coloring. |
| **Grayscale** | Low-color overview. |

## Residue Letters

| Control | Meaning |
| --- | --- |
| **Letters** | Shows or hides residue letters over the colored alignment cells. |

Turn letters off when zoomed out or when color blocks are more useful than individual residue labels.
