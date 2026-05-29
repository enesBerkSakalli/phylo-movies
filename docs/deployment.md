# Deployment

[Back to README](../README.md)

## Static Frontend Build

```bash
npm run build
```

Outputs:

- `dist/` Vite build
- copied example files under `dist/examples/`

Preview:

```bash
npm run preview
```

Open `http://localhost:4173/`.

Current limitation: a static frontend alone cannot process datasets unless it can reach a compatible BranchArchitect backend. The GitHub Pages build is documentation-only except for generated `/demo` payloads.

## GitHub Pages Documentation Build

The root package has:

```bash
npm run build:gh
```

This sets `VITE_DOCS_ONLY=true`, builds with base `/phylo-movies/`, applies SEO metadata, injects crawlable landing-page HTML into `dist/index.html`, and copies examples. In docs-only mode the app serves the information page at `/` and exposes `/demo`, which loads generated movie JSON into browser storage before opening `/visualization`.

The GitHub Pages site does not run Flask, IQ-TREE, FastTree, SPR interpolation, uploads, or MSA processing. If a visitor sees `Failed to fetch` after using a backend-dependent path on the public site, run the source checkout, Docker full stack, or desktop app instead.

## Docker Full Stack

```bash
docker compose up --build
```

Open `http://localhost:8080/`.

The root `Dockerfile` builds the React frontend in a Node stage, installs the BranchArchitect backend in a Python runtime stage, serves static files with nginx, and starts backend/frontend routing through `docker/entrypoint.sh` and `docker/nginx.conf`.

## Docker Development Backend

```bash
docker compose --profile dev up --build
npm run dev
```

Open `http://127.0.0.1:5173/`.

The `backend-dev` service exposes Flask on `5002`; Vite proxies API calls to that port.

## Electron Desktop Build

See [electron-app/README.md](../electron-app/README.md).

Common commands:

```bash
cd electron-app
npm run build:mac
npm run build:win
npm run build:linux
```

The Electron build scripts build the backend with PyInstaller, build the frontend with `ELECTRON_BUILD=true`, copy `dist/` into `electron-app/frontend-dist/`, and package the shell.

## Release Version

The root package includes:

```bash
npm run version:sync -- 0.93.0
npm run version:check
```

These scripts synchronize the root and Electron package versions. The GitHub release workflow checks the tag against committed package versions before building artifacts.
