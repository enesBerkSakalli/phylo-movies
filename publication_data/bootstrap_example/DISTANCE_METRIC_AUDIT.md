# Bootstrap Ordering Distance Metric Audit

Audit date: 2026-05-18

Scope: `publication_data/bootstrap_example/` and
`publication_data/rogue_taxa/epas1_pipeline/bootstrap_bridge/generate_bootstrap_order.py`

## Summary

The existing `bootstrap_order_24.txt` and `bootstrap_order_125.txt` files match
the distance metric implemented by the old script, but that metric was not
publication-clean. It counted only `A`, `C`, `G`, `T`, and a narrow gap bucket
(`-`, `N`, `?`, `.`), silently dropping other IUPAC ambiguity symbols such as
`R` and `Y`.

This matters for dataset 24 because the source alignment contains many `R` and
`Y` symbols. It matters much less for dataset 125 because it contains only a
small number of non-gap ambiguity symbols.

The script has been patched so every alignment cell is represented in the
composition vector:

```text
(A, C, G, T, AmbiguousOrGap)
```

where `AmbiguousOrGap` includes IUPAC ambiguity symbols and gap/unknown
characters.

## What Was Wrong

The old metric produced these source-alignment vectors:

| Dataset | Old vector | Sum represented | True cells | Dropped cells |
| --- | --- | ---: | ---: | ---: |
| 24 | `[65249, 68794, 46443, 71488, 892]` | 252866 | 340560 | 87694 |
| 125 | `[752084, 612788, 411853, 674581, 1192250]` | 3643556 | 3643625 | 69 |

For dataset 24, the dropped cells are IUPAC ambiguity symbols:

```text
R: 38527
Y: 49167
```

Therefore the old 24-taxon ordering did not rank bootstrap replicates using the
full alignment composition.

## Corrected Vectors

The patched script gives:

| Dataset | Corrected vector | Sum represented | True cells |
| --- | --- | ---: | ---: |
| 24 | `[65249, 68794, 46443, 71488, 88586]` | 340560 | 340560 |
| 125 | `[752084, 612788, 411853, 674581, 1192319]` | 3643625 | 3643625 |

## Effect On Existing Rankings

The existing ranking files match the old metric:

| Dataset | Max absolute distance delta between table and old metric |
| --- | ---: |
| 24 | `4.996936695533805e-07` |
| 125 | `4.98854205943644e-07` |

But the corrected metric changes the 24-taxon ranking substantially:

| Dataset | Shared top 10 between old and corrected rankings | Max rank displacement | Mean rank displacement |
| --- | ---: | ---: | ---: |
| 24 | 7/10 | 99 | 16.92 |
| 125 | 10/10 | 2 | 0.03 |

## Corrected Top Replicates

Dataset 24 corrected top 10:

```text
183, 167, 53, 120, 139, 23, 110, 148, 104, 15
```

Dataset 125 corrected top 10:

```text
50, 67, 13, 52, 7, 37, 23, 161, 80, 19
```

## Consequence

The current FastTree-derived files can stay as legacy exploratory examples, but
their distance-ranking metadata should not be cited as the final publication
ordering for dataset 24.

For the IQ-TREE re-inference plan, preserve the current ordering logic in this
corrected form:

1. Generate explicit bootstrap replicate alignments.
2. Compute full-cell composition vectors as `(A, C, G, T, AmbiguousOrGap)`.
3. Rank replicates by Euclidean distance from the source alignment composition.
4. Infer one IQ-TREE tree per ranked replicate alignment.
5. Regenerate ordered Newick files and Phylo-Movies SPR analytics.

## Script Fixes Made

`generate_bootstrap_order.py` now:

- reads wrapped/interleaved relaxed PHYLIP alignments without relying on
  Biopython,
- validates that every parsed sequence has the header-declared site count,
- counts all IUPAC ambiguity symbols instead of silently dropping them,
- uses the corrected `(A, C, G, T, AmbiguousOrGap)` vector for Euclidean
  distance,
- converts PHYLIP to FASTA for FastTree through the same validated parser.
