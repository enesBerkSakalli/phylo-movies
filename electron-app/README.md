# Phylo-Movies Desktop App

This is the Electron wrapper for Phylo-Movies, creating a standalone desktop application.

## Structure

```
electron-app/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── package.json         # Electron dependencies
├── frontend-dist/       # Built React app (copied during build)
└── BranchArchitect/     # BranchArchitect engine (git submodule)
    ├── brancharchitect/ # Python tree transformation library
    ├── webapp/          # Flask server
    ├── msa_to_trees/    # MSA processing module
    └── pyproject.toml   # Python dependencies (Poetry)
```

## Development Setup

### Quick Start (Recommended)

The unified startup script handles everything automatically:

```bash
cd phylo-movies
./start.sh
```

This script will:
- Initialise the BranchArchitect submodule if missing
- Install Poetry if not found
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
cd electron-app/BranchArchitect
poetry install
```

#### 4. Install Electron dependencies (for desktop app)

```bash
cd electron-app
npm install
```

#### 5. Run in development mode

Terminal 1 - Start the React dev server:
```bash
cd phylo-movies  # project root
npm run dev
```

Terminal 2 - Start the Flask engine:
```bash
cd electron-app/BranchArchitect
./start_movie_server.sh
```

Terminal 3 - Start Electron (optional, for desktop mode):
```bash
cd electron-app
npm run dev
```

## Building for Distribution

### 1. Bundle the Python engine

```bash
cd electron-app/BranchArchitect
poetry run pyinstaller brancharchitect.spec --clean
```

### 2. Build the frontend and package

```bash
cd electron-app
npm run build:mac    # For macOS
npm run build:win    # For Windows
npm run build:linux  # For Linux
```

Output will be in `electron-app/release/`.

## Notes

- The frontend is built from the parent `phylo-movies` directory
- The engine is bundled using PyInstaller with all Python dependencies
- App size will be ~200-400MB due to scientific Python libraries
