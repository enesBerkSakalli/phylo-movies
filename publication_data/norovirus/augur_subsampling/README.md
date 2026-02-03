# Norovirus Full-Genome Dataset for PhyloMovies Publication

## Dataset Description

This dataset contains 334 full-genome Norovirus sequences used for the sliding-window phylogenetic analysis demonstrating recombination-driven topological changes in the PhyloMovies paper.

## Data Summary

| Property                 | Value                                     |
| ------------------------ | ----------------------------------------- |
| **Sequences**            | 334 full-genome Norovirus sequences       |
| **Alignment Length**     | 8,058 bp (after trimming)                 |
| **Geographic Coverage**  | 32 countries                              |
| **Temporal Range**       | 1968–2025                                 |
| **Capsid Genotypes**     | 30 types (dominant: GII.4, GII.17, GII.3) |
| **Polymerase Genotypes** | 28 types (dominant: P16, P4, P17)         |
| **Recombinants**         | 167 sequences (50.0%)                     |

---

## Directory Structure

```
augur_subsampling/
├── 01_raw/                          # Raw sequences (before alignment)
│   ├── full_genome_sequences.fasta  # Original sequences from Nextstrain
│   ├── full_genome_accessions.txt   # List of GenBank accession numbers
│   ├── subsampled_350.fasta         # After Augur subsampling
│   └── subsampled_350_renamed.fasta # With simplified sequence IDs
│
├── 02_aligned/                      # MAFFT-aligned sequences
│   └── subsampled_350_aligned.fasta # Multiple sequence alignment
│
├── 03_trimmed/                      # Trimmed alignments (analysis-ready)
│   ├── subsampled_350_gappyout.fasta        # After trimAl gappyout
│   ├── subsampled_350_gappyout_renamed.fasta # With simplified IDs
│   └── subsampled_350_gappyout_final.fasta  # FINAL: Use this for analysis
│
├── metadata/                        # Sequence metadata
│   ├── full_genome_metadata.tsv     # Original metadata from Nextstrain
│   ├── subsampled_350_metadata.tsv  # Metadata for subsampled sequences
│   ├── subsampled_350_metadata.csv  # CSV format for convenience
│   ├── rename_map.tsv               # Mapping: original ID → simplified ID
│   └── group_weights.tsv            # Sampling weights for Augur
│
├── logs/                            # Processing logs (reproducibility)
│   ├── augur_filter.log             # Augur subsampling parameters
│   └── mafft.log                    # MAFFT alignment log
│
├── scripts/                         # Processing scripts
│   ├── analyze_dataset_for_paper.py # Generate paper statistics
│   ├── rename_sequences.py          # Sequence renaming utility
│   └── convert_to_csv.py            # TSV to CSV conversion
│
├── subsampled_350_report.html       # Augur filter report
└── paper_text_draft.tex             # Generated paper text
```

---

## Data Source

Sequences were obtained from the **Nextstrain Norovirus repository**:

- **Repository**: https://github.com/nextstrain/norovirus
- **Data files**: `data/sequences.fasta` and `data/metadata.tsv`
- **Curation**: Sequences curated by Nextstrain team from GenBank submissions

The Nextstrain Norovirus dataset is a curated collection of full-genome Norovirus sequences with standardized metadata including:
- Genotype assignments (VP1/capsid and RdRp/polymerase)
- Geographic and temporal information
- Quality control annotations

---

## Data Processing Pipeline

### Step 1: Download from Nextstrain

```bash
# Clone the Nextstrain Norovirus repository
git clone https://github.com/nextstrain/norovirus.git
cd norovirus

# Copy sequences and metadata
cp data/sequences.fasta ../full_genome_sequences.fasta
cp data/metadata.tsv ../full_genome_metadata.tsv
```

### Step 2: Subsampling with Augur

Stratified subsampling to ensure diverse representation across genotypes, geography, and time:

```bash
augur filter \
    --sequences 01_raw/full_genome_sequences.fasta \
    --metadata metadata/full_genome_metadata.tsv \
    --group-by year VP1_nextclade country \
    --subsample-max-sequences 350 \
    --output 01_raw/subsampled_350.fasta \
    --output-metadata metadata/subsampled_350_metadata.tsv
```

**Sampling strategy**:
- Grouped by: year, capsid genotype (VP1_nextclade), country
- Target: 350 sequences (final: 334 after QC)
- This ensures temporal, geographic, and genotypic diversity

### Step 3: Multiple Sequence Alignment

Using MAFFT v7.526 with automatic algorithm selection:

```bash
mafft --auto --thread -1 \
    01_raw/subsampled_350.fasta \
    > 02_aligned/subsampled_350_aligned.fasta \
    2> logs/mafft.log
```

### Step 4: Alignment Trimming

Using trimAl v1.4.1 with the gappyout algorithm to remove poorly aligned regions:

```bash
trimal \
    -in 02_aligned/subsampled_350_aligned.fasta \
    -out 03_trimmed/subsampled_350_gappyout.fasta \
    -gappyout
```

**Result**: 8,058 bp alignment (from ~7,500 bp original full genomes)

### Step 5: Genotype Verification

Genotypes were pre-assigned in the Nextstrain metadata using Nextclade:
- **VP1/ORF2**: Capsid genotype (e.g., GII.4)
- **RdRp/ORF1**: Polymerase genotype (e.g., GII.P31)

---

## File Descriptions

### Primary Analysis File

| File                                             | Description                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `03_trimmed/subsampled_350_gappyout_final.fasta` | **USE THIS** - Final trimmed alignment ready for phylogenetic analysis |

### Raw Sequences (01_raw/)

| File                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `full_genome_sequences.fasta`  | All full-genome sequences from Nextstrain |
| `full_genome_accessions.txt`   | GenBank accession numbers                 |
| `subsampled_350.fasta`         | Sequences after Augur subsampling         |
| `subsampled_350_renamed.fasta` | Subsampled with simplified IDs            |

### Aligned Sequences (02_aligned/)

| File                           | Description                       |
| ------------------------------ | --------------------------------- |
| `subsampled_350_aligned.fasta` | MAFFT multiple sequence alignment |

### Trimmed Sequences (03_trimmed/)

| File                                    | Description                    |
| --------------------------------------- | ------------------------------ |
| `subsampled_350_gappyout.fasta`         | After trimAl gappyout trimming |
| `subsampled_350_gappyout_renamed.fasta` | Trimmed with simplified IDs    |
| `subsampled_350_gappyout_final.fasta`   | Final version for analysis     |

### Metadata (metadata/)

| File                          | Description                        |
| ----------------------------- | ---------------------------------- |
| `full_genome_metadata.tsv`    | Original Nextstrain metadata       |
| `subsampled_350_metadata.tsv` | Metadata for subsampled sequences  |
| `subsampled_350_metadata.csv` | CSV format                         |
| `rename_map.tsv`              | ID mapping (original → simplified) |
| `group_weights.tsv`           | Augur sampling weights             |

---

## Metadata Columns

| Column          | Description                              |
| --------------- | ---------------------------------------- |
| `taxon`         | Sequence identifier (accession + strain) |
| `accession`     | GenBank accession number                 |
| `strain`        | Strain name                              |
| `date`          | Collection date (ISO 8601 format)        |
| `country`       | Country of isolation                     |
| `VP1_nextclade` | Capsid genotype from Nextclade           |
| `RdRp_type`     | Polymerase genotype from Nextclade       |
| `ORF1_type`     | Alternative ORF1 type annotation         |
| `ORF2_type`     | Alternative ORF2 type annotation         |
| `host`          | Host organism                            |
| `region`        | Geographic region                        |

---

## Software Versions

| Software           | Version | Purpose                            |
| ------------------ | ------- | ---------------------------------- |
| Augur (Nextstrain) | 24.4.0  | Subsampling and metadata handling  |
| MAFFT              | 7.526   | Multiple sequence alignment        |
| trimAl             | 1.4.1   | Alignment trimming (gappyout)      |
| Nextclade          | 3.0     | Genotype assignment (pre-computed) |
| Python             | 3.11+   | Data processing scripts            |

---

## Citation

If you use this dataset, please cite:

1. **This study**:
   ```
   [Author et al.] PhyloMovies: Animated visualization of phylogenetic tree
   topological changes. Molecular Biology and Evolution, [year].
   ```

2. **Nextstrain Norovirus**:
   ```
   Nextstrain Norovirus. https://github.com/nextstrain/norovirus
   ```

3. **Original sequence submitters**:
   See GenBank accession numbers in metadata for original data sources.

---

## Data Availability

All 334 Norovirus genome sequences are publicly available from GenBank.
Accession numbers range from AB933645 to PX563327.

A complete list of accession numbers is provided in:
- `metadata/subsampled_350_metadata.csv`
- Supplementary Table S1 of the publication

---

## License

- **This dataset compilation**: CC BY 4.0
- **Original sequences**: Subject to GenBank/NCBI terms of use
- **Nextstrain data**: See https://github.com/nextstrain/norovirus for license

---

## Contact

For questions about this dataset:
- GitHub Issues: https://github.com/enesBerkSakalli/phylo-movies/issues
