---
title: Taxa Coloring
---

# Taxa Coloring

Taxa coloring assigns colors to taxa, name-derived groups, or CSV-defined groups. Open it from **Style -> Taxa & Highlights -> Edit Taxa Colors**.

The floating window has three modes: **Taxa**, **Pattern**, and **CSV**.

## Global Actions

| Action             | Meaning                                                  |
| ------------------ | -------------------------------------------------------- |
| **Default Colors** | Sets current assignments back to the default tree color. |
| **Reset Setup**    | Resets mode, grouping settings, CSV import, and colors.  |

Color assignments apply immediately to the tree view. They remain active while the dataset is loaded unless you change mode, reset the setup, or load another dataset.

## How Tree Colors Are Resolved

Phylo-Movies resolves colors in layers:

1. Leaf nodes and leaf branches use the color assigned to their taxon, pattern group, or CSV group.
2. Unassigned taxa use the default tree color.
3. Internal branches use group colors only when **Monophyletic Branch Colors** is enabled and every descendant taxon has the same non-default color.
4. Mixed internal branches, or branches containing unassigned taxa, stay at the default tree color.
5. Changed-edge and subtree-highlight effects can draw over the base taxa color during transition review.

This means taxa can be colored even when internal group branches remain uncolored. Internal branch coloring is stricter because it only marks monophyletic color groups.

## Taxa Mode

| Control              | Meaning                                                |
| -------------------- | ------------------------------------------------------ |
| **Color scheme**     | Applies a curated palette directly to individual taxa. |
| **Manual overrides** | Assigns colors one taxon at a time.                    |

Use Taxa mode when you need exact control over a small or specific set of taxa.

## Pattern Mode

Pattern mode builds groups from taxon names.

| Control                 | Meaning                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Strategy**            | Chooses how names are grouped: Prefix, Suffix, Middle, Select Segment, or First Letter.                                             |
| **Separators**          | Splits taxon names by selected separator characters. Multiple separators can be used together.                                      |
| **Segment index**       | Selects which split name segment becomes the group key. Positive indexes count from the start; negative indexes count from the end. |
| **Regex pattern**       | Uses a regular expression capture group to extract group labels.                                                                    |
| **Color scheme**        | Applies a palette to generated groups.                                                                                              |
| **Group customization** | Manually edits colors assigned to detected groups.                                                                                  |

Use Pattern mode when taxa names encode metadata such as region, host, accession group, or sampling class.

If no separators are selected, the app suggests likely separators from the loaded taxon names. Common separators include `_`, `-`, `.`, space, `|`, `:`, `@`, and `#`. Taxa that do not match the pattern remain ungrouped and keep the default tree color unless colored another way.

Regex mode is for advanced labels. The pattern must contain a capture group, because the first captured value becomes the group name. For example, a pattern that captures the genus from `Homo_sapiens` would group all matching taxa by that captured genus value.

## CSV Mode

CSV mode colors taxa from a metadata table.

| Step                      | Meaning                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| Upload or choose metadata | Loads a CSV file or bundled metadata source.                                |
| Select column             | Chooses the metadata column used as the group label.                        |
| Preview validation        | Shows how many metadata rows matched tree taxa and which groups were found. |
| Apply palette             | Assigns a color scheme to CSV-defined groups.                               |
| Edit group colors         | Manually adjusts colors for each metadata group.                            |

CSV coloring is the best option when names do not contain enough grouping information or when group definitions come from external metadata.

CSV mode accepts `.csv` and `.tsv` files up to 5 MB. The table needs one taxon identifier column and at least one grouping column. Accepted taxon column names include `taxon`, `taxa`, `name`, `species`, `id`, `accession`, and `accession_version`.

Every non-taxon column becomes a possible group category. You can switch categories after loading the table. Empty group cells are treated as `Unassigned`.

Taxon matching is case-insensitive and can match exact tree labels, accession prefixes, and accession versions. This allows metadata keyed by accessions to match tree labels that include extra suffixes. If no metadata rows match tree taxa, the table is rejected. If only some rows match, the preview reports the matched count and percentage.

## Sidebar Highlight Controls

The sidebar uses taxa coloring together with highlight controls:

| Control                         | Meaning                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| **Monophyletic Branch Colors**  | Colors monophyletic branch groups according to taxa or group assignments. |
| **Subtree Highlighting**        | Highlights moved or selected subtrees.                                    |
| **Highlight Style: Taxa Color** | Uses taxa/group color assignments for subtree highlighting.               |

If colors appear unavailable, confirm that taxa are loaded and that the Taxa Coloring window has at least one active assignment.

## Palettes and Manual Colors

The palette browser applies a curated color scheme to the current mode:

| Current mode | Palette target                               |
| ------------ | -------------------------------------------- |
| **Taxa**     | Individual taxa.                             |
| **Pattern**  | Detected pattern groups.                     |
| **CSV**      | CSV-defined groups in the selected category. |

If there are more taxa or groups than the chosen palette contains, the app generates additional colors so every target can receive a color. Group palettes are ordered to keep neighboring group colors visually distinct.

Each taxa or group row also has a color swatch. Use it to choose a quick color, open the browser color picker, or type a custom hex color.

## Legend and Tooltips

The **Taxa Color Groups** legend appears in the sidebar for Pattern and CSV modes. It is hidden in Taxa mode because individual taxa can be too numerous for a compact group legend.

Hovering tree labels can show active grouping metadata:

| Coloring mode | Tooltip details                        |
| ------------- | -------------------------------------- |
| **Pattern**   | Detected group and grouping strategy.  |
| **CSV**       | Metadata values from the loaded table. |
| **Taxa**      | No extra group metadata.               |

## MSA Row Colors

When the dataset includes an MSA, taxa coloring can also color alignment rows. Residue color schemes in the MSA viewer still control the alignment cells; taxa coloring controls the taxon-level row identity.

## Color Priority During Transitions

During transition review, some visual effects can temporarily override or outline base taxa colors:

| Effect                                  | Interaction with taxa colors                                            |
| --------------------------------------- | ----------------------------------------------------------------------- |
| **Change Edges**                        | Uses the selected changed-edge color for active topology changes.       |
| **Subtree Highlighting: Solid Color**   | Uses the selected solid highlight color.                                |
| **Subtree Highlighting: Taxa Color**    | Reuses the current taxa/group color.                                    |
| **Subtree Highlighting: High Contrast** | Chooses a contrasting highlight color from the underlying branch color. |
| **Focus & Dimming**                     | Fades non-focused branches without changing their assigned color.       |
