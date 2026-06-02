---
title: SPR Analytics
---

# SPR Analytics

The **Moved Subtrees** analytics window quantifies subtree-prune-and-regraft movement across neighboring input trees. Open it from **Analysis -> Moved Subtrees**.

An SPR move is one moved subtree that changes attachment between two neighboring trees. Rows report the moved subtree, source attachment, target attachment, and branch annotation values when available.

## Tabs

| Tab | Meaning |
| --- | --- |
| **Overview** | Summarizes unique moved subtrees, total SPR movement count, and active pair count. |
| **SPR Moves** | Shows one row per SPR move. |
| **Recurrent Subtrees** | Summarizes moved subtrees by recurrence count. |

## SPR Moves Table

The event table reports:

| Field type | Meaning |
| --- | --- |
| Moved subtree | Taxa or subtree that changes attachment. |
| Pivot edge | Edge around which the topology change is described. |
| Source attachment | Original attachment context. |
| Target attachment | New attachment context. |
| Branch annotation values | Source-to-target values for the selected branch annotation, when available. |
| MSA window range | Alignment-window context for MSA datasets. |

## Branch Annotation Threshold

When branch support annotations are available, the analytics table can use a threshold to emphasize values above or below the selected branch annotation cutoff. Select the visible annotation in **Style -> Geometry & Labels -> Branch Annotation**.

## Recurrent Subtrees

The recurrent subtree table ranks moved subtrees by repeat count. Use it to find taxa or clades that repeatedly move across neighboring trees.

This is especially useful for:

- rogue-taxon review,
- bootstrap replicate comparison,
- sliding-window recombination inspection,
- identifying repeated instability in a specific taxon group.

## CSV Exports

| Export | Contents |
| --- | --- |
| **Export SPR moves CSV** | One row per SPR move. |
| **Export recurrent subtrees CSV** | One row per recurrent moved-subtree summary. |

Exports are disabled when the current dataset does not contain rows for the selected analytics view.
