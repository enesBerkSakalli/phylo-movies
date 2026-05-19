# Norovirus Recombination Data Hygiene Audit

Audit date: 2026-05-19

Scope: norovirus recombination publication data after redundancy cleanup.

## Summary

The norovirus publication data now has one source layer for retained alignments:

```text
publication_data/recombination_norovirus/source_alignments/
```

The ReCAN scripts read from and rebuild into that source layer. Generated run
staging and superseded local outputs are not retained in the publication-data
source tree. Promoted reviewer-facing ReCAN outputs live in:

```text
publication_data/recombination_norovirus/current_results/
```

## Retained Data Relationship

| Layer | Path | Status |
| --- | --- | --- |
| Raw source snapshot | `../recombination_norovirus/source_alignments/nextstrain_genbank_norovirus_full_genome_source_sequences_4565seq.fasta` | Retained source snapshot. |
| MAFFT alignment | `../recombination_norovirus/source_alignments/norovirus_subsampled_mafft_alignment_334taxa.fasta` | Retained alignment-stage input. |
| Canonical MSA | `../recombination_norovirus/source_alignments/norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta` | Primary 334-sequence publication alignment. |
| Metadata | `source_preparation/augur_subsampling/metadata/subsampled_350_metadata.csv` | Matching 334-row metadata table. |
| ReCAN working subset | `../recombination_norovirus/source_alignments/recan_working_subset_48taxa_8058bp.fasta` | Derived 48-sequence ReCAN input. |
| ReCAN focused subset | `../recombination_norovirus/source_alignments/recan_focused_subset_6taxa_8058bp.fasta` | Small inspection subset. |
| ReCAN promoted outputs | `current_results/` | Current reviewed validation outputs. |

## Checks

- Final MSA count: 334 sequences.
- Final MSA sequence length: 8058 for every sequence.
- Final metadata count: 334 rows.
- Final FASTA IDs missing metadata: 0.
- Metadata taxa missing final FASTA records: 0.
- ReCAN working subset: 48 sequences; missing from final MSA: 0.
- ReCAN focused subset: 6 sequences; missing from final MSA: 0.
- Latest verified ReCAN command:

```bash
conda run -n phylomovies-publication ./publication_data/recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh
```

- Latest promoted ReCAN run summary: query `MK753032_P16_GII-4`, query index
  25, 48 input sequences, 47 references, 8058 bp, 33 windows, 500 bp window,
  250 bp step, `pdist`.

## Current Hygiene Status

Closed cleanup items:

- superseded root-level ReCAN CSV/PNG outputs removed;
- generated ReCAN run staging removed after promotion;
- duplicate ReCAN subset copies beside scripts removed;
- root-level duplicate FASTA copies under `source_preparation/augur_subsampling/` removed;
- ReCAN subset output defaults now point to the source alignment layer.

Remaining provenance gap:

- pin the exact upstream Nextstrain revision if it can be recovered; otherwise
  cite the retained local source snapshot checksum explicitly.
