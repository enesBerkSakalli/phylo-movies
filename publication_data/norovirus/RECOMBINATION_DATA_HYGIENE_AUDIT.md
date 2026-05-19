# Norovirus Recombination Data Hygiene Audit

Audit date: 2026-05-18

Scope: `publication_data/norovirus/`

## Summary

The norovirus publication data has a defensible core: the final 334-sequence
trimmed alignment and matching 334-row metadata table agree exactly by sequence
ID. The ReCAN recombination folder is related to that core dataset, because its
48-sequence and 6-sequence FASTA subsets are both derived from the final
alignment.

The ReCAN analysis is not publication-clean yet. The main blocker is a query
index mismatch in `recan_recombination_analysis/run_recan_analysis.py`: the
script currently uses index `3`, which is `HM748971_P4_GII-4`, while the
comment and README identify the intended recombinant as
`MK753032_P16_GII-4`, currently at index `25` in `working_subset.fasta`.
Existing ReCAN CSV/PNG outputs should therefore be treated as stale until the
query is selected by stable sequence ID and the analysis is regenerated.

## Data Relationship

| Layer | Path | Status | Notes |
| --- | --- | --- | --- |
| Raw source layer | `augur_subsampling/01_raw/full_genome_sequences.fasta` | Needs provenance hardening | 4565 full-genome sequences; source references Nextstrain/GenBank but no pinned upstream commit or checksum manifest. |
| Subsampling layer | `augur_subsampling/01_raw/subsampled_350.fasta` and `metadata/subsampled_350_metadata.tsv` | Usable intermediate | 374 sequences before final renaming/QC. Needs explicit explanation because final dataset has 334. |
| Canonical alignment | `augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta` | Good | 334 sequences, all length 8058. This is the primary publication alignment. |
| Canonical metadata | `augur_subsampling/metadata/subsampled_350_metadata.csv` | Good | 334 rows; all final FASTA IDs have metadata and all metadata taxa have FASTA records. |
| Phylo-Movies event output | `augur_subsampling/spr-event-analytics.csv` | Needs method link | 442 event rows. Needs a reproducible command or pipeline link for publication packaging. |
| ReCAN working subset | `recan_recombination_analysis/working_subset.fasta` | Derived, currently inconsistent docs | 48 sequences, all present in the canonical alignment. README/script comments claim older counts. |
| ReCAN focused subset | `recan_recombination_analysis/subset_for_recan.fasta` | Derived | 6 sequences, all present in the canonical alignment. Relationship should be documented if retained. |
| ReCAN outputs | `recan_recombination_analysis/*.csv`, `*.png` | Blocked | Outputs need regeneration after fixing query selection. |

## Checks Performed

- Final FASTA count: 334 sequences.
- Final FASTA sequence length: 8058 for every sequence.
- Final metadata count: 334 rows.
- Final FASTA IDs missing metadata: 0.
- Metadata taxa missing final FASTA records: 0.
- `working_subset.fasta`: 48 sequences; missing from final alignment: 0.
- `subset_for_recan.fasta`: 6 sequences; missing from final alignment: 0.
- Root-level duplicate `noro_virus_example_350_gappyout_final.fasta` is byte-identical to `03_trimmed/subsampled_350_gappyout_final.fasta`.
- Root-level duplicate `subsampled_350_renamed.fasta` is byte-identical to `01_raw/subsampled_350_renamed.fasta`.
- Python syntax compilation passed for norovirus helper scripts.

## Hygiene Findings

| Priority | Finding | Evidence | Recommended Fix |
| --- | --- | --- | --- |
| P0 | ReCAN query sequence is wrong by current index. | `POTENTIAL_RECOMBINANT_INDEX = 3` resolves to `HM748971_P4_GII-4`; intended `MK753032_P16_GII-4` is index `25`. | Select the query by stable FASTA ID, not numeric index, then regenerate ReCAN CSV/PNG outputs. |
| P1 | ReCAN README and scripts describe stale sequence counts. | README says 19 sequences; script comment says 22; actual `working_subset.fasta` has 48. | Rewrite ReCAN README after regenerating outputs. |
| P1 | ReCAN folder is ignored by Git. | Root `.gitignore` ignores `publication_data/norovirus/recan_recombination_analysis`. | Decide whether to track scripts and final derived outputs, or keep outputs external and track only the audit/provenance wrapper. |
| P1 | `analyze_dataset_for_paper.py` resolves data paths relative to `scripts/` and fails from current layout. | It looks for `scripts/subsampled_350_gappyout_final.fasta` and `scripts/subsampled_350_metadata.csv`. | Point it to `../03_trimmed/` and `../metadata/`, or move it to a reproducible analysis folder with explicit paths. |
| P2 | Duplicate FASTA files can drift. | Root-level copies currently match canonical files exactly, but duplicate canonical data. | Prefer one canonical path and make any app/demo copies generated or symlinked. |
| P2 | `rename_map.tsv` has no header. | First row is data (`PV588655`, renamed ID). | Add a header such as `accession` and `renamed_id` or document it as headerless. |
| P2 | Large source/report files need release policy. | `full_genome_sequences.fasta` is about 33 MB; `subsampled_350_report.html` is about 41 MB. | Decide whether large intermediates stay in Git, move to an external archive, or are regenerated from a manifest. |
| P2 | Source provenance is incomplete for publication release. | README cites Nextstrain/GenBank but does not pin upstream commit, access date, command versions, or checksums. | Add a manifest with upstream URL, commit/access date, local command versions, and SHA256 hashes. |
| P3 | ReCAN filenames are inconsistent. | README refers to `recan_similarity_plot.png`; present files include `recan_recombination_plot.png`, `recan_all_sequences_plot.png`, `recan_highlighted_groups.png`, and `norovirus_recombination_by_capsid.png`. | Keep only regenerated publication figures and update README/file names. |

## Publication Readiness

Status: not ready for publication release as-is.

The canonical 334-sequence alignment and metadata are internally consistent and
can remain the core Phylo-Movies recombination dataset. The ReCAN folder should
be treated as an internal validation workspace until the query-selection bug is
fixed, outputs are regenerated, and provenance/checksum documentation is added.

## Recommended Cleanup Order

1. Fix ReCAN query selection by FASTA ID.
2. Regenerate `recan_similarity_data.csv`, `recan_grouped_similarity.csv`, and
   all retained ReCAN plots.
3. Rewrite `recan_recombination_analysis/README.md` to match the actual subset,
   window size, step size, query ID, and output filenames.
4. Fix or retire `augur_subsampling/scripts/analyze_dataset_for_paper.py`.
5. Add `MANIFEST.sha256` and a source provenance note with upstream revision and
   access date.
6. Decide whether ReCAN scripts/results should be tracked; if yes, replace the
   broad `.gitignore` rule with selective ignores for generated scratch files.
