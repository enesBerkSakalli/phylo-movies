# Usage

[Back to README](../README.md)

Phylo-Movies has two entry screens: **New Project** and **Example Library**. Both send data to the same backend processing API and then open the visualization workspace.

## Input Workflows

| Workflow                     | Required input                            | Optional input | What the backend does                                                                                    |
| ---------------------------- | ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| Uploaded tree series         | Newick tree file                          | MSA alignment  | Normalizes the supplied tree series and builds transition frames.                                        |
| MSA sliding-window inference | MSA alignment                             | None           | Splits the alignment into windows, infers trees with IQ-TREE or FastTree, then builds transition frames. |
| Trees with MSA context       | Newick tree file and MSA alignment        | None           | Uses uploaded trees for the movie and the MSA for alignment context/window mapping.                      |
| Built-in example             | Example selected from **Example Library** | None           | Downloads bundled publication/demo input and processes it like a user project.                           |

## File Inputs

| Input             | UI field                    | Accepted by code                                              | Notes                                                                                               |
| ----------------- | --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tree file         | Tree file upload            | Text decoded as UTF-8 and parsed as Newick by BranchArchitect | Examples use `.tree`, `.nwk`, and `.newick` names.                                                  |
| MSA file          | MSA file upload             | Text decoded as UTF-8 and passed to `msa_to_trees`            | Backend-supported alignment parsers include FASTA, relaxed PHYLIP, PHYLIP, Nexus, MSF, and CLUSTAL. |
| CSV taxa metadata | Taxa Colors floating window | CSV upload in the coloring tool                               | Used for coloring taxa/groups, not for backend processing.                                          |

Backend upload validation requires at least one of `treeFile` or `msaFile`. Empty uploads are rejected.

## Outputs

| Output                                         | Where it appears                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Processed movie payload                        | Stored in browser storage under the app data service and loaded by `/visualization`.   |
| Tree movie                                     | Main WebGL tree canvas.                                                                |
| Timeline                                       | Bottom movie player bar.                                                               |
| RF, weighted RF, scale, and movement summaries | Timeline/chart panels, sidebar stats, and transition inspector when data is available. |
| MSA view                                       | Floating **Sequence Alignment** window when MSA data is loaded.                        |
| Moved-subtree analytics                        | **Analysis -> Moved Subtrees** floating window.                                        |
| Static image export                            | Top-right canvas export button.                                                        |
| WebM recording                                 | Top-right recording controls.                                                          |

## Workflow Cards

### Workflow: Load Example Data

Goal: verify the app works without preparing your own files.

Steps:

```text
Start ./start.sh -> open / -> Example Library -> Load Paper Figure Example
```

Expected result: the visualization route opens with a tree canvas, timeline, sidebar, and transport controls.

Common failure: **Engine Offline** appears on the setup page. Start the backend with `./start.sh` or `engine/BranchArchitect/start_movie_server.sh`.

Where to look next: [Troubleshooting](troubleshooting.md).

### Workflow: Process Uploaded Trees

Goal: animate an ordered tree series you already inferred externally.

Steps:

```text
New Project -> upload tree file -> adjust midpoint rooting -> Create visualization
```

Expected result: uploaded trees become input tree markers on the timeline, with generated transition frames between neighboring input trees.

Common failure: a backend parser error. Check that the tree file is plain text and contains parseable Newick trees.

### Workflow: Run MSA Sliding-Window Inference

Goal: infer a tree series from an alignment and animate the resulting topology changes.

Steps:

```text
New Project -> upload MSA alignment -> choose Sliding Windows -> choose Tree Inference -> Create visualization
```

Expected result: BranchArchitect runs the `msa_to_trees` pipeline, then sends metadata and tree chunks back to the frontend.

Common failure: IQ-TREE or FastTree binary problem. Check `IQTREE_PATH`, `FASTTREE_PATH`, and [engine/BranchArchitect/bin/README.md](../engine/BranchArchitect/bin/README.md).

### Workflow: Inspect a Transition

Goal: understand one topology-change segment.

Steps:

```text
Load data -> hover or select a timeline segment -> inspect tooltip or Transition Inspector
```

Expected result: the inspector shows source/target context, moving taxa count, generated frame count, pivot edge, RF metrics, scale, and MSA window when available.

Common failure: some metrics show unavailable. That means the processed payload did not include that metric for the selected segment.

### Workflow: Inspect Recurrent Moved Subtrees

Goal: identify which taxa or subtrees move repeatedly and inspect their
placement context.

Steps:

```text
Load data -> Analysis -> Moved Subtrees -> Recurrent Subtrees -> select a row -> SPR Moves
```

Expected result: the **Recurrent Subtrees** table ranks moved taxa or subtrees
by repeat count, tree-pair count, percentage of SPR moves, and movement path
length. Selecting a row marks that subtree in the tree view. The **SPR Moves**
table then shows the per-event context: moved subtree, pivot edge, source
attachment, target attachment, movement steps, RF/weighted RF metrics, and
source-to-target branch values for the moved subtree and parent branch. If the
input trees contain support or split-frequency labels, those branch values give
support context for the placements being left or entered.

Common failure: the tables are empty. That means the processed payload does not
contain SPR move events for the current dataset, or the current tree sequence
has no resolved moved subtrees.

### Workflow: Export Visual Output

Goal: save the current canvas state or record playback.

Steps:

```text
Load data -> adjust viewport/style -> use top-right image or recording controls
```

Expected result: image export or WebM recording is downloaded by the browser.

Common failure: controls are disabled before a dataset is loaded.
