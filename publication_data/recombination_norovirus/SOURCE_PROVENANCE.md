# Norovirus Source Provenance

Status date: 2026-05-19

## Primary Source

The norovirus publication data are derived from the Nextstrain norovirus
workflow and public GenBank records.

| Field | Value |
| --- | --- |
| Upstream repository | `https://github.com/nextstrain/norovirus` |
| Upstream files | `data/sequences.fasta`, `data/metadata.tsv` |
| Local source FASTA | `source_preparation/augur_subsampling/01_raw/full_genome_sequences.fasta` |
| Local source metadata | `source_preparation/augur_subsampling/metadata/full_genome_metadata.tsv` |
| Access date recorded for this audit | 2026-05-19 |
| Upstream commit | Not recoverable from the current local files or local project checkouts inspected on 2026-05-19. |

## Derived Publication Inputs

The canonical Phylo-Movies recombination input is:

```text
source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta
```

It contains 334 sequences, all length 8058 bp. The matching metadata file is:

```text
source_preparation/augur_subsampling/metadata/subsampled_350_metadata.csv
```

The ReCAN validation subset is derived from that canonical alignment and is
promoted through:

```text
current_results/
```

## Checksums

File-level SHA256 hashes for the source, intermediate, canonical, and promoted
ReCAN files are recorded in:

```text
MANIFEST.sha256
```

## Release Note

The upstream repository revision is the remaining provenance boundary. A local
search on 2026-05-19 found Phylo-Movies copies and backups of the norovirus
files, but no recoverable `nextstrain/norovirus` Git checkout with the original
commit.

The current publication layer is internally reproducible from the files in this
repository. For the final public archive, either:

1. recover the original Nextstrain checkout and add the exact commit here; or
2. describe this as a hashed local snapshot derived from Nextstrain/GenBank,
   with `MANIFEST.sha256` as the reproducibility anchor.
