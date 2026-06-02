---
title: Taxa Coloring
---

# Taxa Coloring

Taxa coloring assigns colors to taxa, name-derived groups, or CSV-defined groups. Open it from **Style -> Taxa & Highlights -> Edit Taxa Colors**.

The floating window has three modes: **Taxa**, **Pattern**, and **CSV**.

## Global Actions

| Action | Meaning |
| --- | --- |
| **Default Colors** | Sets current assignments back to the default color. |
| **Reset Setup** | Resets mode, grouping settings, CSV import, and colors. |

Color assignments apply immediately to the tree view.

## Taxa Mode

| Control | Meaning |
| --- | --- |
| **Color scheme** | Applies a curated palette directly to individual taxa. |
| **Manual overrides** | Assigns colors one taxon at a time. |

Use Taxa mode when you need exact control over a small or specific set of taxa.

## Pattern Mode

Pattern mode builds groups from taxon names.

| Control | Meaning |
| --- | --- |
| **Strategy** | Chooses how names are grouped. |
| **Separators** | Splits taxon names by selected separator characters. |
| **Segment index** | Selects which name segment becomes the group key. |
| **Regex pattern** | Uses a regular expression to extract group labels. |
| **Color scheme** | Applies a palette to generated groups. |
| **Group customization** | Manually edits colors assigned to detected groups. |

Use Pattern mode when taxa names encode metadata such as region, host, accession group, or sampling class.

## CSV Mode

CSV mode colors taxa from a metadata table.

| Step | Meaning |
| --- | --- |
| Upload or choose metadata | Loads a CSV file or bundled metadata source. |
| Select column | Chooses the metadata column used as the group label. |
| Preview validation | Shows how many taxa matched the table and which groups were found. |
| Apply palette | Assigns a color scheme to CSV-defined groups. |
| Edit group colors | Manually adjusts colors for each metadata group. |

CSV coloring is the best option when names do not contain enough grouping information or when group definitions come from external metadata.

## Sidebar Highlight Controls

The sidebar uses taxa coloring together with highlight controls:

| Control | Meaning |
| --- | --- |
| **Group Branch Colors** | Colors monophyletic branch groups according to taxa or group assignments. |
| **Subtree Highlighting** | Highlights moved or selected subtrees. |
| **Highlight Style: Taxa Color** | Uses taxa/group color assignments for subtree highlighting. |

If colors appear unavailable, confirm that taxa are loaded and that the Taxa Coloring window has at least one active assignment.
