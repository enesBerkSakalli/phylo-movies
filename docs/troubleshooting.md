# Troubleshooting

[Back to README](../README.md)

## Symptom: Engine Offline on the Setup Page

Likely cause: the frontend is running but Flask is not reachable.

How to check:

```bash
curl http://127.0.0.1:5002/health
```

Fix:

```bash
./start.sh
```

Or start the backend manually:

```bash
cd engine/BranchArchitect
./start_movie_server.sh
```

Related files: `start.sh`, `engine/BranchArchitect/start_movie_server.sh`, `vite.config.mts`.

## Symptom: Port 5173 Is Already in Use

Likely cause: another Vite process is still running.

How to check:

```bash
lsof -i :5173
```

Fix: stop the existing process, then rerun `./start.sh`. The startup script expects port `5173` to be available.

Related files: `start.sh`, `vite.config.mts`.

## Symptom: Port 5002 Is Already in Use

Likely cause: another backend process is running.

How to check:

```bash
lsof -i :5002
```

Fix: stop the existing process. `start.sh` and `engine/BranchArchitect/start_movie_server.sh` both try to clear this port before starting the backend.

Related files: `start.sh`, `engine/BranchArchitect/start_movie_server.sh`.

## Symptom: `npm ci` Prints Poetry Warnings

Likely cause: Poetry is not installed or backend dependency installation failed.

How to check:

```bash
poetry --version
```

Fix:

```bash
cd engine/BranchArchitect
poetry install
```

Related file: `scripts/check-submodule.sh`.

## Symptom: macOS Says the App Is Damaged

Likely cause: the downloaded desktop app is an unsigned convenience build and macOS Gatekeeper quarantined it. The project does not currently notarize macOS artifacts because notarization requires a paid Apple Developer ID.

Recommended fix for reviewers: use the source checkout or Docker workflow instead of the unsigned desktop artifact:

```bash
./start.sh
```

or:

```bash
docker compose up --build
```

How to check:

```bash
xattr -l "/Applications/Phylo-Movies.app"
```

Fallback for the unsigned app: if the app came from the project GitHub Releases page and you trust that artifact, move it to `/Applications` and clear quarantine:

```bash
xattr -dr com.apple.quarantine "/Applications/Phylo-Movies.app"
```

Then open the app again. Do not use this workaround for artifacts downloaded from any location other than the project release page.

Related files: `electron-app/README.md`, `docs/getting-started.md`.

## Symptom: GitHub Pages Shows `Failed to Fetch`

Likely cause: a backend-dependent action was attempted on the static GitHub Pages site.

How to check:

- The URL starts with `https://enesberksakalli.github.io/phylo-movies/`.
- The action involves **New Project**, **Example Library** processing, file upload, interpolation, or MSA tree inference.

Fix: use `/demo` on GitHub Pages for generated browser-only examples. For uploaded datasets or examples that need backend processing, run one of the full-stack workflows:

```bash
./start.sh
```

or:

```bash
docker compose up --build
```

Related files: `README.md`, `docs/getting-started.md`, `docs/deployment.md`.

## Symptom: Example Download Works but Load Fails

Likely cause: frontend can read `/examples/...`, but the upload to the BranchArchitect backend failed.

How to check:

```bash
curl http://127.0.0.1:5002/health
tail -n 80 engine/BranchArchitect/logs/backend.log
```

Fix: use **Paper Figure Example** first to separate backend startup problems from large MSA inference problems. If the UI says the frontend could not reach the backend with a 502, 503, or 504 status, start or restart the backend and confirm `/health` responds with `"ready": true`. If the UI says the backend rejected the dataset upload, check the backend response shown after the HTTP status. If only MSA examples fail, check IQ-TREE/FastTree configuration.

Related files: `src/pages/WorkspaceInitialization/exampleDatasets.js`, `engine/BranchArchitect/webapp/routes/routes.py`.

## Symptom: MSA Workflow Fails During Tree Inference

Likely cause: IQ-TREE/FastTree executable resolution or invalid alignment input.

How to check:

```bash
cd engine/BranchArchitect
poetry run python -c "from msa_to_trees.pipeline import resolve_iqtree_binary; print(resolve_iqtree_binary())"
```

Fix: set an explicit binary path if needed:

```bash
export IQTREE_PATH=/path/to/iqtree3
export FASTTREE_PATH=/path/to/FastTree
```

Related files: `engine/BranchArchitect/msa_to_trees/msa_to_trees/pipeline.py`, `engine/BranchArchitect/bin/README.md`.

## Symptom: API Returns `Missing required file`

Likely cause: neither `treeFile` nor `msaFile` was sent to `/treedata/stream`.

How to check: inspect the request payload or reproduce with curl.

Fix: include at least one file field:

```bash
curl -X POST http://127.0.0.1:5002/treedata/stream \
  -F "treeFile=@publication_data/figure_example/paper_example.tree"
```

Related file: `engine/BranchArchitect/webapp/routes/helpers.py`.

## Symptom: Processing Stops Sending Progress

Likely cause: backend task stalled or the SSE stream stopped.

How to check:

```bash
tail -n 120 engine/BranchArchitect/logs/backend.log
tail -n 120 engine/BranchArchitect/engine.log
```

Fix: restart with `./start.sh` and retry a small example. The frontend treats 15 minutes without stream updates as a processing failure. If the UI reports a “tree processing stream contract error,” the backend emitted progress events out of order or with malformed metadata/chunk indexes; keep the browser console and backend log together when reporting it.

Related file: `src/pages/WorkspaceInitialization/services/movieProcessing.js`.

## Symptom: Build Fails

Likely cause: dependency, brand asset, TypeScript, or Vite build failure.

How to check:

```bash
npm run build
```

Fix:

```bash
npm ci
npm run check:brand
npm run typecheck
npm run build
```

Related files: `package.json`, `scripts/check-brand-assets.mjs`, `vite.config.mts`.

## Symptom: Browser Shows a Blank Visualization

Likely cause: no processed movie payload is available, or the app failed during initialization.

How to check:

- Open browser developer tools.
- Check console errors.
- Return to `/` and load **Paper Figure Example** again.

Fix: reload from the setup page. The visualization route redirects home when no processed data is available.

Related files: `src/App.jsx`, `src/services/data/dataService.js`.
