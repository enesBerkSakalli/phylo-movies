---
title: Setup and Input
---

# Setup and Input

The setup screen has two entry points:

| Entry point | Use when | Backend required |
| --- | --- | --- |
| **Example Library** | You want to open bundled precomputed datasets. | No for generated browser examples; yes for backend-driven processing. |
| **New Project** | You want to upload local trees and/or an MSA. | Yes for uploads, interpolation, and tree inference. |

The backend status badge reports whether upload processing and MSA inference are available. In GitHub Pages demo mode, use generated examples unless you are running the local backend, Docker workflow, or desktop app.

## Input Files

| Input | Accepted role | Notes |
| --- | --- | --- |
| Tree file | Ordered tree series for interpolation. | Use Newick-style tree files such as `.nwk`, `.newick`, or `.tree`. |
| MSA file | Alignment context or sliding-window tree inference. | Backend-supported parsers include FASTA, CLUSTAL, PHYLIP, Nexus, and MSF-style alignments. |
| CSV taxa metadata | Taxa coloring groups. | Loaded from the Taxa Coloring window, not from the setup screen. |

## Workflow Modes

| Files provided | Processing mode |
| --- | --- |
| Tree file only | Normalize the ordered tree series and build transition frames. |
| Tree file plus MSA | Build tree transitions and map alignment columns to the tree sequence. |
| MSA only | Split the alignment into overlapping windows, infer one tree per window, then build transition frames. |

## Sliding Window Settings

These settings apply when an MSA is uploaded.

| Setting | Meaning |
| --- | --- |
| **Window Size (sites)** | Number of alignment columns included in each window. |
| **Step Size (sites)** | Distance between consecutive window starts. Smaller steps create more overlapping windows and more input trees. |

When trees and an MSA are uploaded together, the same window and step values map alignment coordinates onto the uploaded tree sequence. When only an MSA is uploaded, they control the slices used for inference.

## Tree Adjustments

| Setting | Meaning |
| --- | --- |
| **Midpoint rooting** | Roots inferred or uploaded trees at the midpoint before transition construction. |

Use midpoint rooting when the input series is unrooted or inconsistent and you want a stable visual reference. Preserve input rooting when the biological interpretation depends on a known root.

## Tree Inference Engine

Tree inference settings apply only to MSA-only workflows.

| Engine | Use when |
| --- | --- |
| **IQ-TREE** | You want model-based inference with optional branch support annotations. |
| **FastTree** | You want faster approximate inference for responsive exploratory runs. |

## IQ-TREE Settings

| Setting | Meaning |
| --- | --- |
| **IQ-TREE Fast Search** | Sends IQ-TREE fast-search options for more responsive runs. This is disabled when UFBoot is selected. |
| **Substitution Model: JC/GTR** | JC assumes equal rates and frequencies. GTR estimates rates and base frequencies. |
| **Gamma Rate Heterogeneity** | Adds site-rate variation to the selected model. |
| **Support Mode** | Selects no support run, UFBoot, SH-aLRT, or SH-aLRT plus UFBoot. |
| **UFBoot replicates** | Number of ultrafast bootstrap replicates when UFBoot is enabled. |
| **SH-aLRT replicates** | Number of SH-aLRT replicates when SH-aLRT is enabled. |
| **Bootstrap NNI** | Sends IQ-TREE `-bnni` for bootstrap support refinement. |

Branch support annotations can later be selected in the workspace under **Style -> Geometry & Labels -> Branch Annotation**.

## FastTree Settings

| Setting | Meaning |
| --- | --- |
| **Pseudocounts** | Sends FastTree `-pseudo`. |
| **Skip ML Optimization** | Sends FastTree `-noml`. |

FastTree settings trade detail for speed. They are most useful for exploratory datasets where rapid feedback is more important than a final inference run.
