# Phylo-Movies

[![CI](https://github.com/enesBerkSakalli/phylo-movies/actions/workflows/ci.yml/badge.svg)](https://github.com/enesBerkSakalli/phylo-movies/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![bioRxiv](https://img.shields.io/badge/bioRxiv-10.64898%2F2026.04.01.715821-B31B1B.svg)](https://doi.org/10.64898/2026.04.01.715821)

<!-- [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX) -->

<p align="center">
  <img src="assets/screenshot.png" alt="PhyloMovies – interactive phylogenetic tree viewer with morphing animations" width="100%">
</p>

> **Keywords:** phylogenetics · tree visualization · tree morphing · SPR · subtree prune and regraft · recombination · multiple sequence alignment · MSA · Robinson-Foulds · sliding window · bootstrap · rogue taxa · bioinformatics · computational biology · deck.gl · React · Electron

Sliding-window phylogenetic analyses of multiple sequence alignments (MSAs) generate sequences of phylogenetic trees that can reveal recombination and other sources of phylogenetic conflict, yet comparing trees across genomic windows remains challenging. **Phylo-Movies** is a browser-based tool—also available as a standalone desktop application—that decomposes topological differences between consecutive phylogenetic trees into interpretable subtree migrations and animates these transformations.

We demonstrate its utility in two contexts: identifying recombination breakpoints in norovirus genomes, where lineages shift from polymerase-based to capsid-based clustering at the ORF1/ORF2 junction, and detecting rogue taxa that change position across bootstrap replicates. Phylo-Movies complements summary statistics such as Robinson–Foulds distances by showing _which_ lineages move, _where_ they move from, and _which_ new groupings they form.

The method and case studies are described in the bioRxiv preprint [Animating Phylogenetic Trees from Sliding-Window Analyses](https://doi.org/10.64898/2026.04.01.715821).

Project terminology is standardized as follows: observed trees are **input trees**, generated intermediate states are **transition frames**, moving topology-defined groups are **subtrees**, and `split` names are reserved for backend/API representations.

## Availability and Implementation

Source code is available under the MIT License at [github.com/enesBerkSakalli/phylo-movies](https://github.com/enesBerkSakalli/phylo-movies).
Preprint: [Animating Phylogenetic Trees from Sliding-Window Analyses](https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1) ([DOI](https://doi.org/10.64898/2026.04.01.715821)).
Project information page is published at [enesberksakalli.github.io/phylo-movies](https://enesberksakalli.github.io/phylo-movies/) (**documentation only**). Full processing workflows require the full-stack app (Docker, local backend, or desktop build).
The software consists of two components:

- **Frontend** (JavaScript/React): The browser-based visualization, animation, and UI layer in `src/`.
- **Backend** ([BranchArchitect](https://github.com/EnesSakalliUniWien/BranchArchitect)): A Python engine included as a git submodule in `engine/BranchArchitect/`. It computes SPR (Subtree Prune and Regraft) paths between input trees, identifies which subtrees move, and generates transition frames that the frontend renders as smooth morphing animations. BranchArchitect exposes a Flask API (port 5002) that the frontend calls to retrieve tree data, interpolation sequences, and MSA window mappings.

All test datasets required to reproduce the preprint benchmarks are located in `publication_data/`.

## Current Limitations

- The public GitHub Pages deployment is an information and documentation site. It does not run the BranchArchitect backend, so example loading, tree interpolation, and MSA-derived tree construction require the desktop app, Docker image, or local full-stack setup.
- The bundled tree-inference workflow currently uses FastTree 2 for rapid exploratory sliding-window analyses. For publication-grade inference, users can generate window trees externally with IQ-TREE, RAxML-NG, or another preferred phylogenetic package and load the resulting ordered Newick trees into Phylo-Movies.
- Phylo-Movies does not currently suppress animated rearrangements in the tree viewer by bootstrap-support or uncertainty thresholds. When the pipeline provides branch-support annotations, the movement events table reports source and destination support values and can filter movements using a user-selected bootstrap threshold; threshold-based pruning, replicate design, and external rogue-taxon scores should still be interpreted alongside the animation.
- Large datasets are best handled with precomputed trees and conservative rendering settings. The WebGL renderer supports hundreds of taxa interactively on typical laptops; thousands of taxa are possible for inspection but depend strongly on label visibility, branch effects, hardware, and the number of transition frames.

## Citation

If you use Phylo-Movies in your research, please cite the preprint:

> Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. <https://doi.org/10.64898/2026.04.01.715821>

The software metadata and preferred citation are also available in `CITATION.cff`.

## Demo Videos

- **Norovirus demonstration**: [Vimeo demo](https://vimeo.com/1162400544) showing recombination breakpoint detection via animated tree morphing.
- **Rogue taxon example 1**: [Vimeo demo](https://vimeo.com/1162561152) illustrating how a rogue taxon shifts position across bootstrap replicates.
- **Rogue taxon example 2**: [Vimeo demo](https://vimeo.com/1162563101) second rogue taxon scenario with different tree topology dynamics.

## Features

### Interactive Tree Visualization

- **Interpolated tree morphing**: Generate transition frames between neighboring input trees to study incremental topological changes.
- **Input trees vs. transition frames**: Toggle between observed input trees and generated transition frames to isolate where backend split events move subtrees.
- **Adjustable rendering parameters**: Control branch thickness, font size, and color schemes to highlight specific taxa.
- **Zoom and pan controls**: Inspect large trees using standard mouse or trackpad gestures.

### Comprehensive Analysis Tools

- **Robinson-Foulds distance charts**: Plot similarity metrics across a series to pinpoint major rearrangements.
- **Weighted distance analysis**: Compare branch-length aware distances alongside pure topology metrics.
- **Scale tracking**: Visualize evolutionary scale values associated with each tree.
- **Linked timeline navigation**: Drag the time axis or charts to keep numerical indicators and tree views synchronized.

### MSA Integration

- **Alignment viewer**: Display aligned sequences next to the tree viewport.
- **Bidirectional highlighting**: Selecting taxa in either view highlights the same entries elsewhere.
- **Position tracking**: Jump to alignment coordinates that correspond to the active tree state.
- **Unified theme**: Tree and alignment panes share the same dark UI style for accessibility.

### Recording & Export

- **Session capture**: Record morphing sessions directly from the browser canvas.
- **Vector export**: Output SVG representations of trees and charts for publication.
- **Automatic download**: Save recordings immediately after capture if desired.
- **Multiple formats**: Export static images (SVG/PNG) or video (WebM) depending on the use case.

### Advanced Features

- **Side-by-side comparison**: Render two trees simultaneously for qualitative inspection.
- **Taxa color presets**: Store and reuse color palettes for subtree highlighting.
- **Scatter plot analysis**: Plot tree relationships in derived feature spaces.
- **Responsive layout**: Layout adjusts between desktop and tablet breakpoints.

## Who It's For

- **Pipeline authors** validating inference methods by replaying topology changes along a timeline.
- **Surveillance teams** summarizing subtree dynamics for operational briefings.
- **Instructors or communicators** illustrating how sequence differences propagate to tree structure.

## Quick Start

### New machine setup (fastest path)

If you are setting up Phylo-Movies on a fresh machine, start here:

1. Install:
   - Node.js 22.12.0+ with npm 10.0.0+
   - Python 3.11+
   - Poetry
   - Git
2. Clone the repo and fetch the backend submodule.
3. Install all dependencies with `npm ci`.
4. Run `./start.sh` to boot both backend and frontend.

```bash
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm ci
./start.sh
```

### Prerequisites

**System Requirements:**

- **Node.js**: Version 22.12.0 or newer (tested with v24.10.0)
- **npm**: Version 10.0.0 or newer (comes with current Node.js releases)
- **Python**: Version 3.11 or newer (required by the BranchArchitect backend)
- **Poetry**: Python dependency manager ([install guide](https://python-poetry.org/docs/#installation)) — used to manage BranchArchitect's dependencies
- **Modern web browser**: Chrome, Firefox, Safari, or Edge with JavaScript enabled
- **Git**: For cloning the repository
- **RAM**: 4GB minimum, 8GB recommended for large datasets
- **Storage**: 1GB free space for installation and temporary files

### Installation Methods

Phylo-Movies has two parts: a React/Vite frontend and the [BranchArchitect](https://github.com/EnesSakalliUniWien/BranchArchitect) Python backend (included as a git submodule in `engine/BranchArchitect/`). Start with the base setup, then choose the workflow that fits your needs.

#### Method 1: Desktop App (easiest)

Download a pre-built installer — no Node.js, Python, or Poetry installation required.

> **⚠️ macOS users:** The app is not signed with an Apple Developer certificate, so macOS Gatekeeper will block the first launch. This is expected for open-source software distributed outside the App Store. To open it:
>
> 1. **Right-click** (or Control-click) the app in Finder and select **"Open"**
> 2. Click **"Open"** in the security dialog
>
> Or run `xattr -cr /Applications/Phylo-Movies.app` once in Terminal. Subsequent launches will work normally.

**Download installers from the [Releases page](https://github.com/enesBerkSakalli/phylo-movies/releases):**

| Platform                  | Filename pattern                               | Architecture        |
| ------------------------- | ---------------------------------------------- | ------------------- |
| **macOS** (Apple Silicon) | `Phylo-Movies-<version>-mac-arm64.dmg`         | ARM64 (M1/M2/M3/M4) |
| **macOS** (Intel)         | `Phylo-Movies-<version>-mac-x64.dmg`           | x86_64              |
| **Linux**                 | `Phylo-Movies-<version>-linux-x86_64.AppImage` | x86_64              |
| **Windows**               | `Phylo-Movies-<version>-win-x64.exe`           | x86_64              |

> **Note:** Phylo-Movies workflows rely on the bundled BranchArchitect backend for loading datasets, tree processing, interpolation, morphing animations, and MSA-based workflows. If the desktop app has dependency issues on your system, you can also run the full application from source using the methods below.

---

The following methods require cloning the repository. Start with the base setup:

#### Base setup

> **Note:** The BranchArchitect backend lives in a **git submodule**.
> Running the root npm dependency install will automatically initialise it
> **and** install its Python dependencies (requires [Poetry](https://python-poetry.org/)).
> If you prefer, you can also clone with `--recurse-submodules` upfront.

```bash
git clone https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm ci        # ← automatically fetches the BranchArchitect submodule
```

For Electron desktop app development, see the dedicated build script:

```bash
npm run dev:electron   # Launches the Electron app in development mode
```

This requires the Electron dependencies installed via `cd electron-app && npm ci` and the Python backend prepared with `cd engine/BranchArchitect && poetry install`.

#### Method 2: One-command start (recommended for local use)

The included `start.sh` script handles **everything** — submodule init, dependency installation, starting the BranchArchitect Flask backend, and launching the Vite dev server:

```bash
./start.sh
```

It will check for prerequisites (Node.js, npm, Poetry), install Python and JS dependencies if needed, start the backend on port 5002, and open the frontend at `http://localhost:5173/`. This is the fastest way to get a fully working environment.

#### Method 3: Local development (contributor workflow)

Use when modifying code or running tests with hot reload.

For full-stack workflows, prefer `./start.sh`. It starts both required services and is the expected local command for interpolation, example processing, and MSA workflows.

If you intentionally want to run services separately:

1. Start the BranchArchitect backend:

   ```bash
   cd engine/BranchArchitect
   ./start_movie_server.sh
   ```

   The backend listens on `http://127.0.0.1:5002/`.

2. In another terminal, start the Vite frontend:

   ```bash
   npm run dev
   ```

   The frontend listens on `http://127.0.0.1:5173/`.

3. Open `http://localhost:5173/` or `http://localhost:5173/visualization`.
4. Development mode provides HMR, source maps, and error overlays out of the box.

> **Backend flag:** `npm run dev` starts the frontend only. If the backend is not reachable at `http://127.0.0.1:5002/about`, the dev server prints a warning and the workspace screen shows a backend-not-connected banner.

#### Method 4: Production build (custom hosting)

Use when deploying optimized static assets to your own infrastructure.

1. Build static files:

   ```bash
   npm run build
   ```

   Outputs go to `dist/` with minified JS/CSS and code splitting.

2. Optionally preview locally:

   ```bash
   npm run preview
   ```

   Serves `dist/` at `http://localhost:4173`.

3. Deploy the contents of `dist/` to your preferred web server or CDN.

#### Method 5: Docker (containerized deployment)

Run the full stack (frontend + BranchArchitect backend) in a single container:

```bash
# Clone with the backend submodule
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies

# Build and start
docker compose up --build
```

Open `http://localhost:8080/`. The container bundles nginx (serving the Vite build) and the Flask backend — no local Node.js or Python installation required.

For **development** (backend in Docker, frontend with hot-reload on host):

```bash
docker compose --profile dev up --build   # Backend at localhost:5002
npm run dev                                # Frontend at localhost:5173
```

---

### Running Tests

The project includes comprehensive test suites covering various functionalities.

**Run all tests:**

```bash
npm test
```

**Run tests in watch mode:**

```bash
npm run test:watch
```

**Run specific test suites:**

```bash
npm run test:unit          # Parser and file upload tests
npm run test:msa           # MSA workflow tests
npm run test:tree-animation # Tree animation tests
npm run test:vitest        # Frontend/domain Vitest suite
npm run test:optional      # Optional Mocha regression suite
```

**Run BranchArchitect backend tests:**

```bash
cd engine/BranchArchitect
poetry run pytest test/ -v
```

Some targeted suites load fixtures from the `publication_data/` directory; keep the sample datasets intact or update the paths before running CI locally.

### Validation Responsibilities

The repository intentionally uses separate toolchains for the browser app, Python engine, and desktop wrapper. Run validation in the directory that owns the layer you changed:

| Layer                | Directory                | Install command  | Validation command                                                                                                                  | Scope                                                        |
| -------------------- | ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Frontend             | repository root          | `npm ci`         | `npm run validate`                                                                                                                  | ESLint, TypeScript, frontend/domain tests, production build  |
| Backend engine       | `engine/BranchArchitect` | `poetry install` | `poetry run mypy brancharchitect --ignore-missing-imports && poetry run pytest test/ -v --timeout=120`                              | Python typing and BranchArchitect scientific/Flask tests     |
| Desktop wrapper      | `electron-app`           | `npm ci`         | `npm run test:sse` after backend setup; use `npm run build:mac`, `npm run build:win`, or `npm run build:linux` for packaging checks | Electron shell and packaged backend/frontend integration     |
| Full stack container | repository root          | Docker           | `docker compose up --build`                                                                                                         | nginx frontend plus BranchArchitect backend in one container |

Root `npm run validate` validates the frontend application only. It does not hide backend or Electron failures; validate those layers explicitly when their code or contracts change.

---

### Verifying Your Installation

After installing, verify everything works correctly:

**1. Check Node.js and npm versions:**

```bash
node --version  # Should show v22.12.0 or higher
npm --version   # Should show v10.0.0 or higher
```

**2. Verify dependencies installed:**

```bash
npm list --depth=0  # Should list all packages without errors
```

**3. Test development server:**

```bash
npm run dev
```

Expected output should include:

```text
VITE v8.0.14  ready in XXX ms
Local: http://localhost:5173/
```

Open `http://localhost:5173/` in your browser. You should see the PhyloMovies project setup page.

**4. Test production build:**

```bash
npm run build
```

Expected output should end with:

```text
Built in XXXs
dist/index.html                              0.57 kB
dist/assets/[various files listed]
```

Check that `dist/` folder was created:

```bash
ls -l dist/
```

**5. Test production preview:**

```bash
npm run preview
```

Access at `http://localhost:4173/`

**6. Test with example data:**

- Start the full stack: `./start.sh`
- Navigate to `http://localhost:5173/`
- Click "Load Example" button
- Should load example phylogenetic tree visualization

**7. Run tests (optional):**

```bash
npm test  # Runs full test suite
```

**8. Run the full frontend validation path:**

```bash
npm run validate
```

**Success indicators:**

- Dev server starts without errors
- Browser shows the home page interface
- "Load Example" button works and displays tree visualization
- Build completes and creates `dist/` folder
- No critical errors in browser console (F12)

**If any step fails**, refer to the [Troubleshooting](#installation-troubleshooting) section below.

---

### Development Scripts

The main root-level commands are:

```bash
./start.sh            # Start full local stack: backend on 5002 and frontend on 5173
npm run dev          # Start the Vite frontend only; backend workflows also need BranchArchitect on port 5002
npm run build        # Build the frontend and copy example data
npm run preview      # Preview the production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript without emitting files
npm run format       # Apply Prettier formatting and ESLint autofixes
npm run format:check # Check Prettier formatting without editing files
npm run test         # Run all frontend test suites
npm run validate     # Lint, typecheck, test, and build
npm run dev:electron # Start the Electron wrapper workflow
```

Formatting policy: Prettier owns whitespace, wrapping, quote style, and trailing commas for supported text/code files. ESLint owns JavaScript/TypeScript correctness, React hook rules, and project-specific static checks. Do not reformat large unrelated files during behavioral changes; run `npm run format` only on a focused branch or before a dedicated formatting-only commit. `npm run format:check` is available for formatting-baseline work, but it is intentionally not part of `npm run validate` until the existing source tree has been normalized in a separate formatting-only change.

## Usage Guide

### Loading Phylogenetic Data

1. Upload your tree files (Newick format supported)
2. Optionally upload Multiple Sequence Alignment (MSA) files
3. Configure visualization parameters (window size, step size, etc.)

### Navigation Controls

- **Play/Pause**: Start or stop tree animation sequences
- **Step Forward/Backward**: Navigate transition frame by transition frame through tree changes
- **Tree Navigation**: Jump between major tree states
- **Speed Control**: Adjust animation speed (1x to 10x)

### Analysis Features

- **Chart Viewer**: Open interactive charts showing distance metrics
- **MSA Viewer**: Launch the sequence alignment viewer
- **Tree Comparison**: Compare different trees side by side
- **Recording**: Capture your analysis sessions as videos

### Customization Options

- **Branch Coloring**: Highlight internal branches and specific taxa
- **Scale Adjustment**: Modify tree scaling and branch lengths
- **Color Schemes**: Apply custom coloring to taxa groups
- **Export Settings**: Configure output formats and quality

### Typical Analysis Scenario

1. Use the **Load Example** action on the home page (or drop your own Newick/FASTA files) to populate the viewer.
2. Set animation cadence (window size, step size, playback speed) and optionally filter taxa through saved color palettes.
3. Correlate topology shifts with **Robinson-Foulds** or **Scale** charts by scrubbing the shared timeline.
4. Open the **MSA Viewer** to validate that highlighted taxa share the expected sequence signatures.
5. Capture a WebM recording or export SVG snapshots once the inspection is complete.

## Technical Details

### Architecture

**Frontend:**

- **Frontend Framework**: React 18.2.0 with modern hooks and state management
- **Build Tool**: Vite 8.0.14 for fast development and optimized builds
- **State Management**: Zustand 5.0.6 for global application state
- **Tree Rendering**: deck.gl 9.2.5 (GPU-accelerated WebGL) with D3 hierarchy utilities for tree layouts
- **UI Components**: Radix UI primitives with Tailwind CSS 4.1.13 for styling
- **MSA Viewer**: Custom deck.gl-based MSA viewer for sequence alignment visualization
- **Type Safety**: TypeScript 5.8.3 with JSDoc annotations
- **Testing**: Mocha + Chai for unit tests, Vitest for newer tests

**Backend ([BranchArchitect](https://github.com/EnesSakalliUniWien/BranchArchitect)):**

- **Language**: Python 3.11+, managed with Poetry
- **Web Framework**: Flask, serving endpoints at `/treedata/stream`, `/stream/progress/<channel_id>`, and `/about`
- **Tree Transformations**: SPR-based interpolation via lattice solvers that compute minimal subtree migrations between input trees
- **Pipeline**: Parse Newick → midpoint rooting → lattice solving (jumping taxa) → leaf ordering → 4-phase interpolation (collapse → reorder → expand → snap)
- **MSA Support**: Sliding-window tree inference from FASTA alignments via the bundled `msa_to_trees` package
- **Testing**: pytest + hypothesis + mypy

### Key Technologies

- **@deck.gl/core & @deck.gl/layers**: GPU-accelerated rendering for smooth animations
- **D3.js**: Tree layout algorithms and data transformations
- **React**: Component-based UI architecture
- **Zustand**: Lightweight state management with React hooks
- **Vite**: Next-generation frontend tooling with instant HMR
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality accessible UI components

### File Formats Supported

- **Trees**: Newick format (.nwk, .newick, .tree), JSON format
- **Alignments**: FASTA format (.fasta, .fas, .fa)
- **Export**: SVG, PNG (trees), WebM (recordings)

### Browser Compatibility

- Chrome/Chromium 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: WebGL support is required for optimal performance.

### Performance Considerations

- GPU-accelerated rendering via Deck.gl for smooth animations
- Optimized for datasets with hundreds to thousands of taxa
- Progressive loading for large tree series
- Memory-efficient rendering pipeline with viewport culling
- Responsive design adapts to various screen sizes and devices

## Project Structure

```text
phylo-movies/
|-- src/                     # Frontend source code
|   |-- components/          # React UI surfaces and shadcn/ui primitives
|   |-- domain/              # Frontend scientific/domain contracts and pure helpers
|   |-- pages/               # Workspace setup, docs-only, and splash routes
|   |-- services/            # Browser storage, API URL resolution, media helpers
|   |-- state/               # Zustand store, slices, and selectors
|   |-- timeline/            # Timeline construction, timing math, and renderer glue
|   |-- treeVisualisation/   # Tree layout, deck.gl layer data, interpolation, and viewport logic
|   |-- msaViewer/           # deck.gl alignment viewer
|   |-- css/                 # Tailwind entry point and scoped CSS
|   `-- main.jsx             # Browser application entry point
|-- engine/
|   `-- BranchArchitect/     # Python backend (git submodule)
|       |-- brancharchitect/ # Core library (tree models, interpolation, lattice solvers)
|       |-- webapp/          # Flask server (routes: /treedata/stream, /stream/progress, /about)
|       |-- msa_to_trees/    # Sliding-window MSA → tree inference package
|       `-- pyproject.toml   # Python dependencies (managed by Poetry)
|-- electron-app/            # Electron desktop wrapper
|-- publication_data/        # Datasets from the PhyloMovies manuscript
|-- test/                    # Frontend test suites
|-- start.sh                 # One-command startup (backend + frontend)
|-- dist/                    # Production build output (generated)
|-- package.json             # npm dependencies and scripts
|-- vite.config.mts          # Vite configuration
|-- tsconfig.json            # TypeScript configuration
`-- README.md                # This file
```

### The `publication_data/` Folder

The `publication_data/` directory contains the datasets used in the PhyloMovies manuscript, enabling full reproduction of the published results:

- **`recombination_norovirus/`** — Norovirus recombination source alignments, source-preparation files, ReCAN scripts, and promoted validation outputs
- **`bootstrap_rogue_taxa/`** — Aberer/RogueNaRok-derived source alignments, IQ-TREE/RAxML bootstrap-ordering scripts, and promoted IQ-TREE result trees
- **`figure_example/`** — Tree files used to generate publication figures (e.g., `paper_example.tree`)

These datasets are referenced in the demo videos and can be loaded directly into the application to explore the use cases described in the paper.

## Contributing

Follow the standard GitHub workflow:

- File bugs or feature requests through GitHub Issues.
- Discuss architectural or UX topics in Discussions before large changes.
- Submit pull requests with focused commits and rationale.
- Update documentation, examples, or tests when behavior changes.

### Development Setup

1. Complete the installation steps in the Quick Start section.
2. Create a feature branch describing the change scope.
3. Run the relevant `npm run test:*` targets and document required fixtures.
4. Include screenshots or short clips when modifying the UI.

## License

This project is open source. Please check the license file for specific terms and conditions.

## Support & Documentation

### Getting Help

- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join discussions in GitHub Discussions

### Installation Troubleshooting

**Node.js version issues:**

- Ensure you have Node.js 22.12+ installed: `node --version`
- Update Node.js if needed: [nodejs.org/download](https://nodejs.org/download)
- Consider using [nvm](https://github.com/nvm-sh/nvm) for managing Node versions

**npm dependency install fails:**

- Clear npm cache: `npm cache clean --force`
- Clean local install/build artifacts, then run `npm ci` again:
  - `npm run clean:local`
- Ensure you have write permissions in the project directory
- Check for disk space issues

**Port already in use:**

- Default dev server runs on port 5173
- If occupied, Vite will automatically try the next available port
- Or manually specify: `npm run dev -- --port 3000`

**Build fails:**

- Ensure all dependencies are installed: `npm ci`
- Check Node.js version compatibility (22.12+)
- Clear Vite cache: `rm -rf node_modules/.vite`
- Review error messages for missing dependencies

### Local Workspace Cleanup

Artifacts like `node_modules`, Python virtual environments, and build outputs are ignored by git but can grow large.

Use this when you want a minimal working tree again:

```bash
npm run clean:local
```

**TypeScript/JSConfig warnings:**

- These are typically non-blocking for JavaScript projects
- The `ignoreDeprecations: "6.0"` setting in configs silences baseUrl deprecation warnings
- The project uses both TS and JS files for gradual type safety adoption

### Common Runtime Issues

- **Browser Issues**: Use a modern browser with JavaScript and WebGL enabled
- **Performance**: For large datasets, consider:
  - Reducing animation speed
  - Closing other browser tabs
  - Using hardware acceleration
  - Increasing browser memory limits
- **File Upload**: Ensure files are in supported formats (Newick, FASTA, JSON)
- **Visualization not loading**: Check browser console for errors, ensure WebGL is supported

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended for large datasets
- **Storage**: 1GB free space for installation and temporary files
- **Network**: Internet connection required for initial npm dependency install
- **Graphics**: WebGL-capable GPU recommended for optimal performance

---
