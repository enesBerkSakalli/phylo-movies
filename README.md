# Phylo-Movies

[![CI](https://github.com/enesBerkSakalli/phylo-movies/actions/workflows/ci.yml/badge.svg)](https://github.com/enesBerkSakalli/phylo-movies/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![bioRxiv](https://img.shields.io/badge/bioRxiv-10.64898%2F2026.04.01.715821-B31B1B.svg)](https://doi.org/10.64898/2026.04.01.715821)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20488923.svg)](https://doi.org/10.5281/zenodo.20488923)

[Website](https://enesberksakalli.github.io/phylo-movies/) ·
[Manual](https://enesberksakalli.github.io/phylo-movies/manual/) ·
[Browser demo](https://enesberksakalli.github.io/phylo-movies/demo/) ·
[Source code](https://github.com/enesBerkSakalli/phylo-movies) ·
[Publication](https://doi.org/10.64898/2026.04.01.715821) ·
[Software archive](https://doi.org/10.5281/zenodo.20488923)

Phylo-Movies is a React and Flask web tool for inspecting ordered phylogenetic tree series. It uses the BranchArchitect backend to compute subtree-prune-and-regraft transition frames between input trees, then renders the resulting movie in a WebGL tree viewer with timeline, comparison, MSA, coloring, analytics, image, and recording tools. It is intended for computational biologists, phylogenetics method developers, and instructors who need to see which taxa or subtrees move between neighboring trees.

![Phylo-Movies screenshot](src/public/og/phylo-movies-preview.png)

The project information page at [enesberksakalli.github.io/phylo-movies](https://enesberksakalli.github.io/phylo-movies/) includes documentation and a precomputed browser demo. Dataset loading, interpolation, and MSA-driven workflows require the full-stack app from source or Docker. Desktop release artifacts are provided as convenience builds; macOS artifacts are unsigned because the project does not currently use a paid Apple Developer ID for notarization, so Gatekeeper may block them or report them as damaged.

## Quick Path

For revision review, use the current `main` branch unless the submission system points to the new `0.98.1` tagged release. A new GitHub/Zenodo release should be minted from the final reviewer-facing state before submission archival.

1. Browser-only demo: open <https://enesberksakalli.github.io/phylo-movies/demo/>.
2. Full local run:

   ```bash
   git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
   cd phylo-movies
   npm ci
   ./start.sh
   ```

3. Open the printed local URL, usually <http://127.0.0.1:5173/>.
4. Smoke test: **Example Library** -> **Paper Figure Example** -> **Load**.
5. Manuscript examples: open the generated Norovirus, Bootstrap 24, Bootstrap 125, and weighted-RF sensitivity examples from the browser demo or local Example Library.

## Choose the Right Entry Point

| Entry point       | Use it for                                                                                      | Backend-dependent actions                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GitHub Pages site | Reading documentation, downloading releases/data, and opening generated demo movies at `/demo`. | New uploads, local example processing, interpolation, and MSA workflows do not run on the static site.                         |
| Source checkout   | Recommended macOS/reviewer path for full local processing from the browser.                     | Run `./start.sh`, keep the terminal open, and use the printed `http://127.0.0.1:5173/` URL.                                    |
| Docker            | Recommended full-stack path without manually setting up the backend.                            | Run `docker compose up --build` and open `http://localhost:8080/`.                                                             |
| Desktop release   | Optional packaged convenience build.                                                            | macOS artifacts are unsigned convenience builds; use source or Docker for review, or see [Troubleshooting](docs/troubleshooting.md#symptom-macos-says-the-app-is-damaged). |

## Quick Start

Requirements:

- Node.js 22.12.0 or newer with npm 10 or newer
- Python 3.11 or newer
- Poetry
- Git

On macOS, Poetry can be installed without `sudo` through Homebrew:

```bash
brew install poetry
```

```bash
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm ci
./start.sh
```

Open <http://127.0.0.1:5173/>. The startup script runs the BranchArchitect Flask backend on <http://127.0.0.1:5002/> and the Vite frontend on <http://127.0.0.1:5173/>. Keep the terminal running while using the browser app; stopping the script stops the local backend.

## First Successful Run

1. Start the full stack with `./start.sh`.
2. Open <http://127.0.0.1:5173/>.
3. Select **Example Library**.
4. Click **Load** on **Paper Figure Example**.
5. Wait for processing to finish and the app to open `/visualization`.
6. Use the bottom transport controls to step through generated frames.
7. Use the top-right canvas buttons, mouse wheel, or two-finger trackpad gesture to fit and zoom the tree; the same toolbar exports PNG images and records the canvas.

## Documentation

- [Public manual](https://enesberksakalli.github.io/phylo-movies/manual/) - researcher-facing guide with screenshots and workspace tour notes
- [Getting started](docs/getting-started.md)
- [Usage](docs/usage.md)
- [Web interface](docs/web-interface.md)
- [Configuration](docs/configuration.md)
- [API](docs/api.md)
- [Examples](docs/examples.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

Specialized source folders also keep their own documentation:

- [Electron desktop app](electron-app/README.md)
- [BranchArchitect backend](engine/BranchArchitect/README.md)
- [Publication data](publication_data/README.md)
- [Frontend tests](test/README.md)

Documentation ownership:

- `manual/` is the Docusaurus source for the public researcher manual published under `/manual/`.
- `docs/` is the source-checkout technical documentation for development, deployment, API, and configuration details.
- The root README is the short project entry point.
- The ignored `wiki/` folder contains private reviewer-response and analysis notes, not installation instructions.

## Development Commands

```bash
./start.sh                 # Start backend on 5002 and frontend on 5173
npm run dev                # Start the Vite frontend only
npm run build              # Build frontend assets and copy example data
npm run manual:build       # Build the Docusaurus manual
npm run docs:lint          # Lint Markdown docs and build the manual
npm run preview            # Preview dist/ on 4173
npm run lint               # Run ESLint
npm run typecheck          # Run TypeScript checks
npm run test               # Run frontend test suites
npm run validate           # Lint, typecheck, tests, and build for the frontend
npm run dev:electron       # Start the Electron wrapper workflow
```

Backend validation is separate:

```bash
cd engine/BranchArchitect
poetry run pytest test/ -v
```

## Citation

If you use Phylo-Movies please cite:

Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Phylo-Movies: Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. <https://doi.org/10.64898/2026.04.01.715821>

For the archived software release, cite:

Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Phylo-Movies: Interactive Phylogenetic Tree Interpolation and Visualization, version 0.98.1. Zenodo. <https://doi.org/10.5281/zenodo.20488923>

Software citation metadata is in [CITATION.cff](CITATION.cff).

## License

Phylo-Movies is released under the MIT License. See [LICENSE](LICENSE).
