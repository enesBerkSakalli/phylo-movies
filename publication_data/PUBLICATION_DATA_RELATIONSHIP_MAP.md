# Publication Data Relationship Map

Audit date: 2026-05-19

This map describes the retained publication-data surface after cleanup.

## Rogue-Taxon Bootstrap Example

Source paper:

Aberer, Krompass, and Stamatakis, "Pruning Rogue Taxa Improves Phylogenetic
Accuracy: An Efficient Algorithm and Webservice", Systematic Biology 62(1),
2013, DOI `10.1093/sysbio/sys078`.

Retained source inputs:

| Path | Role |
| --- | --- |
| `bootstrap_rogue_taxa/source_alignments/aberer_roguenarok_dataset_24_taxa24_sites14190.phy` | Selected 24-taxon source alignment copied from the Aberer/RogueNaRok archive. |
| `bootstrap_rogue_taxa/source_alignments/aberer_roguenarok_dataset_125_taxa125_sites29149.phy` | Selected 125-taxon source alignment copied from the Aberer/RogueNaRok archive. |
| `bootstrap_rogue_taxa/source_alignments/MANIFEST.tsv` | Citation, source archive path, checksums, and role for each selected alignment. |

Retained scripts and promoted outputs:

| Path | Role |
| --- | --- |
| `bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh` | Shell entry point for regenerating bootstrap replicate alignments, inferring trees, and ranking trees. |
| `bootstrap_rogue_taxa/scripts/bootstrap_ordering/generate_bootstrap_order.py` | Core bootstrap generation, IQ-TREE/FastTree tree inference, composition-distance ordering, and manifest writer. |
| `bootstrap_rogue_taxa/scripts/bootstrap_ordering/promote_current_results.py` | Promotion helper for reviewed generated runs. |
| `bootstrap_rogue_taxa/current_results/` | Promoted IQ-TREE result set for datasets 24 and 125. |

Method summary:

- RAxML `raxmlHPC -f j` generates bootstrap replicate alignments.
- IQ-TREE is the publication default for tree inference.
- Trees are ordered by ascending nucleotide-composition distance using
  `(A, C, G, T, AmbiguousOrGap)`.
- Generated run staging is not retained in the publication-data source layer.

## Norovirus Recombination Example

The norovirus example is separate from the Aberer/RogueNaRok paper. It is a
Phylo-Movies recombination use case derived from Nextstrain/GenBank source
material and local preprocessing.

Retained source and derived alignments:

| Path | Role |
| --- | --- |
| `recombination_norovirus/source_alignments/nextstrain_genbank_norovirus_full_genome_source_sequences_4565seq.fasta` | Raw sequence snapshot. |
| `recombination_norovirus/source_alignments/norovirus_subsampled_mafft_alignment_334taxa.fasta` | MAFFT alignment before final trimming. |
| `recombination_norovirus/source_alignments/norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta` | Canonical 334-sequence publication MSA. |
| `recombination_norovirus/source_alignments/recan_working_subset_48taxa_8058bp.fasta` | ReCAN working subset derived from the canonical MSA. |
| `recombination_norovirus/source_alignments/recan_focused_subset_6taxa_8058bp.fasta` | Small focused ReCAN inspection subset. |
| `recombination_norovirus/source_alignments/MANIFEST.tsv` | Source/derivation notes and checksums. |

Retained scripts and promoted outputs:

| Path | Role |
| --- | --- |
| `recombination_norovirus/scripts/recan_recombination_analysis/run_recombination_analysis.sh` | Shell entry point for rebuilding the ReCAN working subset and running the sliding-window analysis. |
| `recombination_norovirus/scripts/recan_recombination_analysis/build_recan_working_subset.py` | Rebuilds the 48-sequence ReCAN subset from the canonical MSA. |
| `recombination_norovirus/scripts/recan_recombination_analysis/run_recan_sliding_window.py` | Runs the ReCAN-style sliding-window analysis by stable query FASTA ID. |
| `recombination_norovirus/current_results/` | Promoted ReCAN validation outputs and manifest. |

Method summary:

- Query sequence is selected by stable FASTA ID: `MK753032_P16_GII-4`.
- Current promoted ReCAN run uses 48 input sequences, 47 references, 8058 bp,
  33 windows, 500 bp window size, 250 bp step size, and `pdist`.
- Generated ReCAN run staging is not retained in the publication-data source
  layer.

## Minimal Reader Paths

For source data and provenance:

- `bootstrap_rogue_taxa/source_alignments/MANIFEST.tsv`
- `recombination_norovirus/source_alignments/MANIFEST.tsv`
- `recombination_norovirus/SOURCE_PROVENANCE.md`
- `recombination_norovirus/MANIFEST.sha256`

For promoted results:

- `bootstrap_rogue_taxa/current_results/`
- `recombination_norovirus/current_results/`

For regeneration:

- `REGENERATE.md`
- `PUBLICATION_ARCHIVE.md`
- `publication_data.env`
- `environment.yml`
- `bootstrap_rogue_taxa/REGENERATE.md`
- `recombination_norovirus/REGENERATE.md`
