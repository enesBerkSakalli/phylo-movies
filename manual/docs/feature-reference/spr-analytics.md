---
title: SPR Analytics
---

# SPR Analytics

The **Moved Subtrees** analytics window quantifies subtree-prune-and-regraft movement across neighboring input trees. Open it from **Analysis -> Moved Subtrees**.

An SPR move is one moved subtree that changes attachment between two neighboring trees. Rows report the moved subtree, source attachment, target attachment, and branch annotation values when available.

## Tabs

| Tab                    | Meaning                                                                            | Main use                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Overview**           | Summarizes unique moved subtrees, total SPR movement count, and active pair count. | Use this first to see how much movement the current tree sequence contains.                               |
| **SPR Moves**          | Shows one row per SPR move between neighboring input trees.                        | Use this as the detailed event ledger for source/target placement context.                                |
| **Recurrent Subtrees** | Aggregates moved subtrees across all SPR moves and ranks them by repeat count.     | Use this to identify taxa or clades that repeatedly move, then inspect their event rows in **SPR Moves**. |

## SPR Moves Table

The **SPR Moves** table reports one row per movement event:

| Field type               | Meaning                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Moved subtree            | Taxa or subtree that changes attachment.                                                 |
| Pivot edge               | Edge around which the topology change is described.                                      |
| Source attachment        | Attachment context in the source tree before the move.                                   |
| Target attachment        | Attachment context in the target tree after the move.                                    |
| Branch annotation values | Source-to-target values for the moved subtree and nearest parent branch, when available. |
| Movement steps           | Local animation step range for the move.                                                 |
| Metrics                  | Path hops, path length, RF distance, and weighted RF distance when available.            |
| MSA window range         | Alignment-window context for MSA datasets.                                               |

Use this table to answer where a subtree moved from, where it moved to, and
whether the source or target placement has supporting branch annotations. For
example, if the trees carry bootstrap split-frequency labels or SH-aLRT
branch-support values, the branch-value column shows the source-to-target values
for the moved subtree and the nearest parent branch.

## Branch Annotation Threshold

When branch support annotations are available, the analytics table can use a
threshold to emphasize values above or below the selected branch annotation
cutoff. Select the visible annotation in **Style -> Geometry & Labels -> Branch
Annotation**.

The filters separate movement rows by whether the selected moved-subtree or
parent-branch values are both above the threshold, mixed, both below the
threshold, or missing. This helps distinguish movements involving stronger
placement support from movements in weaker or unavailable support contexts.

## Recurrent Subtrees

The **Recurrent Subtrees** table is a recurrence summary. It ranks moved
subtrees by how often they participate in SPR moves. Columns include:

- SPR move count,
- tree-pair count,
- percentage of all SPR moves,
- total and average path hops,
- total and average path length.

Clicking a row marks that subtree in the tree view. A high recurrence count means
that the same taxon or subtree participates in many SPR moves, but it is not a
standalone detector. Interpret recurrent rows together with the detailed **SPR
Moves** table, branch annotation values, and the animation.

This is especially useful for:

- rogue-taxon review,
- bootstrap replicate comparison,
- sliding-window recombination inspection,
- identifying repeated instability in a specific taxon group.

For rogue-taxon review, the recurrence table can show whether a candidate taxon
or clade moves frequently, while the **SPR Moves** table shows whether those
movements repeatedly switch between specific source and target attachment
contexts and whether those placements are weakly or strongly supported.

## CSV Exports

| Export                            | Contents                                     |
| --------------------------------- | -------------------------------------------- |
| **Export SPR moves CSV**          | One row per SPR move.                        |
| **Export recurrent subtrees CSV** | One row per recurrent moved-subtree summary. |

Exports are disabled when the current dataset does not contain rows for the selected analytics view.
