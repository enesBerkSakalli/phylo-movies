# EPAS1 Rogue-Taxon Sliding-Window Trees - Reproducible Pipeline

This directory contains the script-facing EPAS1 rogue-taxon helper pipeline for
the Phylo-Movies publication-data layer. It does not bundle the required VCF,
reference, or archaic genome inputs.

This repo-style guide gives you a **turnkey pipeline** to make a sliding‑window Phylo‑Movie around **EPAS1** where a **Tibetan** sample jumps onto the **Denisovan** branch only inside the EPAS1 region. It:

* builds **haploid consensus sequences** per sample from VCFs using `bcftools consensus`
* concatenates them into a multi‑FASTA (already aligned by reference)
* slices **sliding windows** (default 5 kb / step 1 kb or 10 kb / 2 kb)
* runs **IQ-TREE** (or FastTree) per window
* detects whether **Tibetan clusters with Denisovan** in the tree
* emits a tidy **CSV/JSON** you can feed straight into your viewer

> ⚠️ **Reference build matters.** Use all inputs on **GRCh38** (recommended). If your Tibetan VCF is GRCh37, lift it or switch the pipeline `REF`/`REGION` to GRCh37. Archaic VCFs on GRCh38 are linked below.

---

## File layout

This project organizes data, scripts, and outputs as follows:

```
rogue_taxa_analysis/
├── README.md               # This document.
├── Makefile                # Workflow automation (optional).
├── config.yaml             # Main configuration for analysis parameters.
├── env.yml                 # Conda environment definition (optional).
├── data/                   # Input data files.
│   ├── ref/                # Reference genome files.
│   │   └── GRCh38.primary_assembly.genome.fa  # Reference FASTA (chr2 region).
│   ├── vcf/                # VCF files for modern human populations.
│   │   ├── 1000G.chr2.GRCh38.vcf.gz           # 1000 Genomes VCF.
│   │   └── TIBETAN.chr2.vcf.gz                # Tibetan VCF.
│   ├── archaic/            # VCF files for archaic hominins.
│   │   ├── Denisovan_Altai.chr2.GRCh38.vcf.gz # Denisovan VCF.
│   │   └── Neanderthal_Vindija.chr2.GRCh38.vcf.gz # Neanderthal VCF.
│   └── chain/              # Liftover chain files.
│       └── hg19ToHg38.over.chain.gz           # Chain file for liftover.
├── scripts/                # Canonical analysis scripts.
│   ├── consensus.py        # Generates consensus sequences from VCFs.
│   ├── window_trees.py     # Performs windowed phylogenetic tree inference.
│   ├── utils_topology.py   # Utility functions for tree parsing and rogue state detection.
│   └── quick_strip.py      # Generates a quick visualization of rogue states.
├── bootstrap_bridge/       # External bootstrap/RogueNaRok bridge scripts.
│   └── generate_bootstrap_order.py
├── helpers/                # Data download and local environment helpers.
│   ├── download.py
│   ├── download_archaic.sh
│   └── activate.sh
├── legacy/                 # Excluded from canonical publication workflow.
│   ├── create_all_consensus.sh
│   ├── download_additional_genomes.sh
│   ├── fix_alignment.py
│   └── get_chimp_sequence.sh
├── out/                    # Generated output files.
│   ├── consensus/          # Consensus FASTA files.
│   │   ├── epas1.aln.fa    # Merged multi-FASTA alignment.
│   │   └── *.fa            # Individual consensus FASTA files (e.g., tibetan.fa).
│   ├── windows/            # Per-window output files.
│   │   ├── w_*.fa          # Per-window FASTA alignments.
│   │   └── w_*.treefile    # Per-window phylogenetic trees.
│   ├── epas1_windows.csv   # Table of window analysis results (CSV).
│   ├── epas1_windows.json  # Table of window analysis results (JSON).
│   └── epas1_strip.png     # Visualization of rogue states.
└── data/tmp/               # Temporary files generated during data download/processing.
```

**Note on temporary files:**
During the execution of the pipeline, several temporary files (e.g., intermediate VCFs, temporary FASTA files) are generated. These are typically cleaned up by the scripts or can be removed manually. The `Makefile` includes a `clean` target to remove most generated output and temporary files.

---

## 0) Dependencies

* **System**: `bcftools` ≥ 1.12, `samtools`, `bedtools`, `python3` (≥3.9), `iqtree2` (or `fasttree`), `gzip`, `tabix`, `curl`.
* **Python packages**: `pandas`, `numpy`, `tqdm`, `biopython`, `newick`, `ete3` (optional), `pyyaml`.

### Conda env (optional)

```yaml
# env.yml
name: epas1-pipeline
channels: [conda-forge, bioconda]
dependencies:
  - python=3.11
  - bcftools
  - samtools
  - bedtools
  - iqtree
  - fasttree
  - pip
  - pip:
      - pandas
      - numpy
      - biopython
      - newick
      - ete3
      - pyyaml
      - tqdm
```

Create it:

```bash
mamba env create -f env.yml
conda activate epas1-pipeline
```

---

## 1) Configure samples (`config.yaml`)

Provide paths to **per‑chromosome VCF/BCF** and sample IDs. You may point to multi‑sample VCFs (e.g., 1000G) and give a `sample_id` to extract; or to single‑sample VCFs. Add a FASTA for chimp (or omit and root on archaics).

```yaml
# config.yaml
ref:
  fasta: data/ref/GRCh38.primary_assembly.genome.fa
  # EPAS1 core locus on GRCh38 per Ensembl. We add +/- 50 kb flanks by default.
  region: "2:46290000-46390000"   # tweak to 200–400 kb if desired

samples:
  tibetan:
    source: data/vcf/TIBETAN.chr2.vcf.gz   # your Tibetan/Sherpa VCF (GRCh38)
    sample_id: TIB1                        # sample name inside VCF; or omit if single-sample VCF
  han:
    source: data/vcf/1000G.chr2.GRCh38.vcf.gz
    sample_id: HG00436
  ceu:
    source: data/vcf/1000G.chr2.GRCh38.vcf.gz
    sample_id: NA12878
  yri:
    source: data/vcf/1000G.chr2.GRCh38.vcf.gz
    sample_id: NA19238
  denisovan:
    source: data/archaic/AltaiDenisovan.chr2.GRCh38.vcf.gz
    sample_id: null
  neanderthal:
    source: data/archaic/AltaiNeanderthal.chr2.GRCh38.vcf.gz
    sample_id: null
  chimp:
    source: data/fasta/chimp_chr2_hg38_lifted.fa   # optional; FASTA for same region
    sample_id: null

params:
  mask_lowqual: true
  min_dp: 8
  min_qual: 30
  haplotype: "1"         # bcftools -H 1|2|I  (1 or 2 chooses a haplotype; I uses IUPAC codes)
  windows:
    size: 5000           # bp (use 10000 for smoother)
    step: 1000           # bp (use 2000 for smoother)
  min_var_sites: 25      # skip windows with < this many segregating sites
  tree:
    program: iqtree2     # or fasttree
    model: GTR+G
    sh_alrt: 0           # set 1000 to compute SH-aLRT support (slower)
    threads: 4
```

> **Where to get VCFs:**
>
> * 1000 Genomes GRCh38 multi‑sample VCFs (or high‑coverage/phased sets) → point `han`, `ceu`, `yri` to those and use real `sample_id`s.
> * Archaic VCFs (GRCh38) for Altai **Denisovan** and **Neanderthal** → put into `data/archaic/`.
> * Chimp sequence for the region (optional) → any liftover/MAF‑extracted FASTA matching the human region.

---

## 2) Make consensus sequences

This generates per‑sample **haploid consensus FASTA** for the configured `region`, masking low‑quality calls to `N` and leaving reference alleles where no variant is called.

```bash
python scripts/consensus.py config.yaml
```

> If you don't have chimp for this region yet, leave it out; the pipeline will still root with archaics or leave the tree unrooted. You can add chimp later and re-run.

---

## 3) Slide windows, infer trees, detect "rogue Tibetan"

Run it:

```bash
python scripts/window_trees.py config.yaml
```

This produces:

* per‑window alignments: `out/windows/w_*.fa`
* per‑window trees: `out/windows/w_*.treefile`
* a table: `out/epas1_windows.csv` with columns `[start_bp, end_bp, seg_sites, state, treefile]`

**`state` legend**

* `TIB_with_DEN` — rogue behavior (what we expect inside EPAS1)
* `TIB_with_NEA` — rarer but possible
* `Default` — Tibetan back with modern humans
* `NA` — not enough variation to build a reliable tree
* `ERR` — tree build or parse hiccup (inspect that window)

---

## 4) Make a quick strip plot (optional)

This is a minimal Python snippet to convert the CSV to a compact color strip for your frontend. (You'll likely style this in your TypeScript app.)

Run:

```bash
python scripts/quick_strip.py
```

---

## 5) Makefile (glue it together)

```make
# Makefile
.PHONY: all consensus windows strip clean

CFG?=config.yaml

all: consensus windows strip

consensus:
	python scripts/consensus.py $(CFG)

windows:
	python scripts/window_trees.py $(CFG)

strip:
	python scripts/quick_strip.py

clean:
	rm -rf out/windows out/consensus/*.vcf.gz out/consensus/*.fa out/*.csv out/*.json out/*.png out/windows/*.treefile out/windows/*.log out/windows/*.ckp.gz out/windows/*.iqtree
```

---

## 6) Notes, tips, and expected results

* **Region width**: Start with `2:46290000-46390000` (\~100 kb). For a wider montage, extend to ±200–400 kb. Signal is sharpest inside the \~100 kb EPAS1 core.
* **Windowing**: 5 kb / 1 kb gives high‑res flicker; 10 kb / 2 kb is smoother and faster.
* **Support**: To display confidence, set `params.tree.sh_alrt: 1000`. Then parse SH‑aLRT from `.treefile` branch labels (left as an exercise; many UIs don't need it for this demo).
* **Missing data**: `bcftools consensus` fills reference bases; low‑qual calls are masked to `N` via the `-i` filter. That keeps your alignment in‑frame and apples‑to‑apples.
* **Chimp (outgroup)**: If you include a chimp FASTA for the same coordinates, it will stabilize rooting. Otherwise, leave it out; the rogue pattern is still obvious from unrooted relationships.
* **Speed**: With \~120 windows (100 kb, step 1 kb) IQ‑TREE `-fast` finishes comfortably on a laptop. If you scale to several hundred windows, switch to FastTree for iteration, then re‑run IQ‑TREE on windows flagged as `TIB_with_DEN` for the final cut.

---

## 7) Example data sources (put under `data/`)

> These are pointers; download with `curl`/`wget` into the paths in `config.yaml`.

* **Reference (GRCh38)**: `GRCh38.primary_assembly.genome.fa` from Ensembl/GENCODE.
* **1000 Genomes GRCh38 VCFs**: per-chromosome multi-sample VCFs (high-coverage or phase3-on-GRCh38). Extract individuals with `-s SAMPLEID`.
* **Archaics (GRCh38)**: Altai Denisovan & Altai Neanderthal per‑chromosome VCFs.
* **Chimp (optional)**: FASTA for the human region (e.g., from Ensembl EPO/CACTUS MAF for Human–Chimp, extracted to the same coordinates).

---

## 8) What to wire into your viewer

Use `out/epas1_windows.json` as your data feed. Each window has:

```json
{
  "start_bp": 0,
  "end_bp": 5000,
  "seg_sites": 61,
  "state": "TIB_with_DEN",
  "treefile": "out/windows/w_0000000.treefile"
}
```

Render a 3‑color strip keyed to `state`, plus the current tree (use the `.treefile` to draw), a playhead, and optional gene boxes.

---

## 9) Troubleshooting

* **No rogue windows found?** Check your Tibetan sample truly carries the EPAS1 introgressed haplotype (some datasets label population but individuals vary). Try a Sherpa/Tibetan with known haplotype, broaden region to ±400 kb, and/or use 10 kb windows.
* **Too many `NA` windows?** Lower `min_var_sites` to 15–20, or use 10 kb windows.
* **Build mismatch**: If archaic VCFs are GRCh37 but your moderns are GRCh38 (or vice versa), harmonize builds first (e.g., `bcftools +liftover`).

Happy tree‑walking! 🌲🧬
