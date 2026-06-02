# Phylo-Movies Desktop App

This is the Electron wrapper for Phylo-Movies, creating a standalone desktop application.

For macOS reviewers, the supported reproducible path is the source checkout with `./start.sh` or the Docker workflow from the repository root. macOS desktop artifacts built by this project are unsigned convenience builds; they are not notarized because notarization requires a paid Apple Developer ID, so Gatekeeper may block them until quarantine is cleared manually.

## Structure

```text
electron-app/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── package.json         # Electron dependencies
└── frontend-dist/       # Built React app (generated during build; disposable)

../engine/BranchArchitect/
├── brancharchitect/     # Python tree transformation library
├── webapp/              # Flask server
├── msa_to_trees/        # MSA processing module
├── pyproject.toml       # Python dependencies (Poetry)
└── poetry.lock          # Locked backend dependency graph
```

`frontend-dist/` is generated from the repository root build. Any packaged
example files under `frontend-dist/examples/` are copied from
`../publication_data/`; do not edit them as source data.

## Development Setup

### New machine setup (recommended)

Set up the project end-to-end from scratch with one flow:

```bash
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm ci
./start.sh
```

Required local tools:

- Node.js 22.12.0+ with npm 10+
- Python 3.11+
- Poetry
- Git

`./start.sh` will verify the environment and launch both:

- BranchArchitect Flask backend on `:5002`
- Vite frontend on `:5173`

### Quick Start (Recommended)

The unified startup script handles everything automatically:

```bash
cd phylo-movies
./start.sh
```

This script will:

- Initialise the BranchArchitect submodule if missing
- Check for Poetry and print installation instructions if it is missing
- Install Python dependencies
- Start the Flask engine (port 5002)
- Start the Vite frontend (port 5173)

### Manual Setup

#### 1. Initialize BranchArchitect Submodule

```bash
cd phylo-movies  # project root
git submodule update --init --recursive
```

Or clone with submodules:

```bash
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
```

#### 2. Install Poetry (if not installed)

```bash
# macOS / Linux
curl -sSL https://install.python-poetry.org | python3 -

# Or via pip
pip install poetry
```

#### 3. Install Python Engine Dependencies

```bash
cd engine/BranchArchitect
poetry install
```

#### 4. Install Electron dependencies (for desktop app)

```bash
cd electron-app
npm ci
```

#### 5. Run in development mode

Terminal 1 - Start the React dev server:

```bash
cd phylo-movies  # project root
npm run dev
```

Terminal 2 - Start the Flask engine:

```bash
cd engine/BranchArchitect
./start_movie_server.sh
```

Terminal 3 - Start Electron (optional, for desktop mode):

```bash
cd electron-app
npm run dev
```

## Building for Distribution

These commands create local desktop artifacts. macOS artifacts are unsigned convenience builds unless you configure your own Apple Developer ID signing and notarization outside this repository's default setup.

### 1. Install dependencies

```bash
cd phylo-movies
npm ci
cd electron-app
npm ci
```

### 2. Build the backend, frontend, and package

```bash
cd electron-app
npm run build:mac    # For macOS
npm run build:win    # For Windows
npm run build:linux  # For Linux
```

The platform build scripts run `npm run build:backend` automatically. That
script bundles the Python engine via `build-backend.sh` in a dedicated Python
3.11 build environment, then packages the frontend and Electron shell.

Output will be in `electron-app/release/`.

## Notes

- The frontend is built from the parent `phylo-movies` directory
- The engine is bundled from `engine/BranchArchitect` using PyInstaller through
  `build-backend.sh`; run `npm run build:backend` only when you need to rebuild
  the packaged backend by itself
- `electron-app/package.json` and `electron-app/package-lock.json` are the
  canonical Electron dependency files
- App size will be ~200-400MB due to scientific Python libraries
