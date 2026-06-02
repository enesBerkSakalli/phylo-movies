---
title: Getting Started
---

# Getting Started

Start with the browser demo if you want to inspect Phylo-Movies without installing a backend. Use the desktop app, Docker, or the local app when you want to process uploaded files or infer tree series from an MSA.

## Browser Demo

Open the generated examples at:

```text
https://enesberksakalli.github.io/phylo-movies/demo/
```

The browser demo opens precomputed data and does not run BranchArchitect. It is the fastest way to inspect the tree canvas, movie timeline, comparison controls, MSA window, and export controls.

<figure className="manual-screenshot">
  <img src="/phylo-movies/manual/img/screenshots/example-library.png" alt="Generated example library in the Phylo-Movies browser demo" />
  <figcaption>Generated examples can be opened directly in the browser demo without a backend.</figcaption>
</figure>

## Local App

Use the local full-stack workflow when you need backend processing:

```bash
./start.sh
```

Then open the local URL shown by the script. The setup page should report that the BranchArchitect backend is connected before you process uploads or load backend-driven examples.

## First Successful Run

1. Open the setup screen.
2. Choose **Example Library**.
3. Load a small example dataset.
4. Wait for the visualization workspace to open.
5. Use the bottom transport controls to step through generated frames.
6. Hover or select a timeline segment to inspect topology-change details.

If the setup screen reports an offline backend, use the browser demo for generated examples or start the backend locally.
