# Development

[Back to README](../README.md)

## Architecture Overview

| Layer                     | Location                                   | Role                                                                                                                                      |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                  | `src/`                                     | React app, workspace setup, visualization workspace, deck.gl rendering, timeline, MSA viewer, taxa coloring, analytics, and media export. |
| Backend                   | `engine/BranchArchitect/`                  | Python tree transformation engine and Flask API.                                                                                          |
| MSA pipeline              | `engine/BranchArchitect/msa_to_trees/`     | Sliding-window alignment processing and IQ-TREE/FastTree invocation.                                                                      |
| Desktop wrapper           | `electron-app/`                            | Electron shell, backend process management, packaged frontend build, and IPC backend URL bridge.                                          |
| Examples/publication data | `publication_data/`                        | Source datasets and promoted example outputs.                                                                                             |
| Tests                     | `test/` and `engine/BranchArchitect/test/` | Frontend/domain tests and backend tests.                                                                                                  |

## Data Flow

```text
New Project or Example Library
  -> POST /treedata/stream
  -> backend background processing
  -> GET /stream/progress/<channel_id>
  -> metadata + tree chunks + complete
  -> frontend data service stores validated movie payload
  -> /visualization initializes Zustand store
  -> deck.gl canvas, timeline, sidebar, and floating windows render the dataset
```

## Rendering Flow

- `src/App.jsx` loads processed data from `phyloData`.
- `useTreeController()` initializes tree rendering controllers.
- `DeckGLCanvas` renders the tree view.
- `MoviePlayerBar` mounts the timeline manager and controls playback.
- `ToolsSidebar` exposes dataset, layout, style, analysis, and focus controls.

## Where to Add Features

| Change                                | Start here                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Setup page upload or example behavior | `src/pages/WorkspaceInitialization/`                                                                                  |
| Backend request fields                | `src/pages/WorkspaceInitialization/services/movieProcessing.js` and `engine/BranchArchitect/webapp/routes/helpers.py` |
| API route behavior                    | `engine/BranchArchitect/webapp/routes/routes.py`                                                                      |
| Tree visualization behavior           | `src/treeVisualisation/` and `src/components/deckgl/`                                                                 |
| Timeline behavior                     | `src/timeline/` and `src/components/movie-player/`                                                                    |
| MSA viewer behavior                   | `src/msaViewer/` and `src/components/msa/`                                                                            |
| Taxa coloring                         | `src/components/taxa-coloring/` and `src/treeColoring/`                                                               |
| Analytics panel                       | `src/components/TreeStatsPanel/`                                                                                      |
| Electron packaging                    | `electron-app/`                                                                                                       |

## Commands

Frontend:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run validate
```

Backend:

```bash
cd engine/BranchArchitect
poetry install
poetry run pytest test/ -v
```

Electron:

```bash
cd electron-app
npm ci
npm run dev
npm run test:sse
```

Build scripts for packaged desktop artifacts are documented in [electron-app/README.md](../electron-app/README.md).

## Test Ownership

- Root `npm run validate` validates the frontend layer only.
- Backend changes need backend pytest and, when relevant, type checks from the backend project.
- Electron changes need Electron package tests or platform build checks.
- Publication data regeneration has separate docs under `publication_data/`.

## Current Limitations

- The repository currently has a dirty working tree in many areas; keep documentation-only changes separate from runtime changes.
- Some docs-oriented scripts in `package.json` still refer to `knowledge/**/*.md`, while this repository currently uses `wiki/` and `docs/`. Those scripts were not changed here because no current docs lint baseline was verified.
