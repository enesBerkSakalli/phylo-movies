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

This regenerates the static browser-demo `.movie.json` payloads with CI fixture mode, sets `VITE_DOCS_ONLY=true`, builds with base `/phylo-movies/`, applies SEO metadata, injects crawlable landing-page HTML into `dist/index.html`, copies examples, builds the Docusaurus manual, and copies that manual into `dist/manual/`. In docs-only mode the app serves the information page at `/` and exposes `/demo`, which loads generated movie JSON into browser storage before opening `/visualization`. The public manual is served from `/manual/`.

The static demo does not use a second payload contract. It ships the same direct movie payload shape as backend runs, with compact tuple tree nodes and lazy frontend hydration. Future chunked sidecar payloads would require a broader backend and static-example contract change; that is intentionally outside the reviewer-ready build.

On pushes to `main`, GitHub Actions runs `npm run fixtures:generate:ci` before frontend tests and the normal frontend build. The GitHub Pages build also runs the self-contained `npm run build:gh`, so the published `/demo` packages regenerated interpolated payloads into `dist/examples/precomputed/`. CI fixture mode intentionally reuses the checked-in inferred `.nwk` files instead of rerunning IQ-TREE on every push.

Docker and Electron packaging also regenerate these payloads before their frontend build step, so release artifacts do not depend on committed precomputed JSON files.

The GitHub Pages site does not run Flask, IQ-TREE, FastTree, SPR interpolation, uploads, or MSA processing. If a visitor sees `Failed to fetch` after using a backend-dependent path on the public site, run the source checkout with `./start.sh` or the Docker full stack instead. Desktop release artifacts are optional convenience builds.

## Docker Full Stack

```bash
docker compose up --build
```

Open `http://localhost:8080/`.

The root `Dockerfile` builds the React frontend in a Node stage, installs the BranchArchitect backend in a Python runtime stage, serves static files with nginx, and starts backend/frontend routing through `docker/entrypoint.sh` and `docker/nginx.conf`.

The production Compose service uses a container health check against `http://localhost:8080/health`, `restart: unless-stopped`, and an entrypoint that exits if either nginx or the backend process dies. That keeps the production-style local stack reproducible without requiring Node, Poetry, or Python packages on the host.

Useful checks:

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:8080/health
```

## Docker Development Backend

```bash
docker compose up --build backend-dev
npm run dev
```

Open `http://127.0.0.1:5173/`.

The `backend-dev` service exposes Flask on `5002`; Vite proxies API calls to that port. Target the `backend-dev` service explicitly so Compose does not also start the default production `app` service.

## Electron Desktop Build

See [electron-app/README.md](../electron-app/README.md).

macOS release artifacts are unsigned convenience builds. They are not notarized because notarization requires a paid Apple Developer ID. For reviewer and reproducibility workflows on macOS, prefer the source checkout or Docker path.

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
