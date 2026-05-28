# Getting Started

[Back to README](../README.md)

This guide gets a new checkout to one processed dataset in the browser.

## Requirements

- Node.js 22.12.0 or newer with npm 10 or newer
- Python 3.11 or newer
- Poetry
- Git
- A WebGL-capable browser

For MSA-to-tree inference, BranchArchitect uses IQ-TREE by default and can also use FastTree. Bundled binary details live in [engine/BranchArchitect/bin/README.md](../engine/BranchArchitect/bin/README.md).

## Install

```bash
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm ci
```

`npm ci` runs `scripts/check-submodule.sh`. In a git checkout it initializes `engine/BranchArchitect` if needed. If Poetry is installed, it also attempts the backend `poetry install`; if Poetry is missing, the script prints backend setup instructions and leaves the npm install non-fatal.

## Start the Full Stack

```bash
./start.sh
```

`./start.sh` checks prerequisites, installs missing frontend/backend dependencies when needed, starts the Flask backend on `http://127.0.0.1:5002/`, and starts Vite on `http://127.0.0.1:5173/`.

Open:

```text
http://127.0.0.1:5173/
```

## First Successful Run

1. Open the app at `http://127.0.0.1:5173/`.
2. Confirm the top badge says **Engine Connected**.
3. Select **Example Library**.
4. Click **Load** for **Paper Figure Example**.
5. Wait for the processing overlay to finish.
6. The app opens the visualization route.
7. Click **Next generated frame** or **Play sequence** in the bottom transport controls.
8. Inspect the timeline, tree canvas, and sidebar controls.

## Manual Two-Terminal Startup

Use this when debugging one service at a time.

Terminal 1:

```bash
cd engine/BranchArchitect
./start_movie_server.sh
```

Terminal 2:

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Docker Startup

```bash
docker compose up --build
```

Open `http://localhost:8080/`.

For backend-in-Docker plus frontend hot reload on the host:

```bash
docker compose --profile dev up --build
npm run dev
```

## Current Limitation

The GitHub Pages build is documentation-first and does not run the backend. It includes a precomputed `/demo` payload for browser-only inspection, but uploaded datasets still require the local, Docker, or Electron backend workflow.
