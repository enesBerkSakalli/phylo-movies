---
title: Setup and Input
---

# Setup and Input

The setup screen has two entry points:

| Entry point         | Use when                                       | Backend required                                                      |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| **Example Library** | You want to open bundled precomputed datasets. | No for generated browser examples; yes for backend-driven processing. |
| **New Project**     | You want to upload local trees and/or an MSA.  | Yes for uploads, interpolation, and tree inference.                   |

The backend status badge reports whether upload processing and MSA inference are available. In GitHub Pages demo mode, use generated examples unless you are running the local backend, Docker workflow, or desktop app.

## Input Files

| Input             | Accepted role                                       | Notes                                                                                      |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tree file         | Ordered tree series for interpolation.              | Use Newick-style tree files such as `.nwk`, `.newick`, or `.tree`.                         |
| MSA file          | Alignment context or sliding-window tree inference. | Backend-supported parsers include FASTA, CLUSTAL, PHYLIP, Nexus, and MSF-style alignments. |
| CSV taxa metadata | Taxa coloring groups.                               | Loaded from the Taxa Coloring window, not from the setup screen.                           |

## Workflow Modes

| Files provided     | Processing mode                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Tree file only     | Normalize the ordered tree series and build transition frames.                                         |
| Tree file plus MSA | Build tree transitions and map alignment columns to the tree sequence.                                 |
| MSA only           | Split the alignment into overlapping windows, infer one tree per window, then build transition frames. |

## Sliding Window Settings

These settings apply when an MSA is uploaded.

| Setting                 | Meaning                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Window Size (sites)** | Number of alignment columns included in each window.                                                                                             |
| **Step Size (sites)**   | Distance between consecutive window centres. The number of windows (and inferred trees) is the alignment length divided by the step, rounded up. |

After you choose an alignment, the panel shows its size (sequences × sites) and the resulting window count. Untouched fields are filled with suggested values: for an MSA alone, a window of about a fifth of the alignment with a step of half a window; with uploaded trees, one window per tree. Warnings appear when the window count does not match the number of uploaded trees, when the window covers the whole alignment, or when more than 100 trees would be inferred.

When trees and an MSA are uploaded together, the same window and step values map alignment coordinates onto the uploaded tree sequence. When only an MSA is uploaded, they control the slices used for inference.

## Tree Adjustments

| Setting              | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| **Midpoint rooting** | Roots inferred or uploaded trees at the midpoint before transition construction. |

Use midpoint rooting when the input series is unrooted or inconsistent and you want a stable visual reference. Preserve input rooting when the biological interpretation depends on a known root.

## Tree Inference Engine

Tree inference settings apply only to MSA-only workflows.

| Engine       | Use when                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| **IQ-TREE**  | You want model-based inference with optional branch support annotations. |
| **FastTree** | You want faster approximate inference for responsive exploratory runs.   |

## IQ-TREE Settings

| Setting                  | Meaning                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **IQ-TREE Fast Search**  | Much faster search that may miss the best tree on difficult windows (IQ-TREE `-fast`). Turned off while UFBoot is selected.    |
| **Model: JC/GTR**        | JC treats all substitutions as equally likely. GTR gives each substitution type its own rate (recommended for real data).      |
| **Gamma rate variation** | Lets some sites evolve faster than others (recommended for most real data).                                                    |
| **Support Mode**         | Selects no support values, UFBoot (ultrafast bootstrap), SH-aLRT (likelihood ratio test), or both. Support increases run time. |
| **UFBoot replicates**    | Number of ultrafast bootstrap replicates when UFBoot is enabled.                                                               |
| **SH-aLRT replicates**   | Number of SH-aLRT replicates when SH-aLRT is enabled.                                                                          |
| **Bootstrap NNI**        | Refines each bootstrap tree to reduce overestimated UFBoot support (IQ-TREE `-bnni`). Slower.                                  |

Branch support annotations can later be selected in the workspace under **Style -> Geometry & Labels -> Branch Annotation**.

## FastTree Settings

| Setting                           | Meaning                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| **Pseudocounts**                  | Stabilises distances for gappy alignments or short windows (FastTree `-pseudo`).           |
| **Skip ML optimization (faster)** | Keeps the quick distance-based tree, so branch lengths are approximate (FastTree `-noml`). |

FastTree settings trade detail for speed. They are most useful for exploratory datasets where rapid feedback is more important than a final inference run.
