# Phylo-Movies Desktop App

This is the Electron wrapper for Phylo-Movies, creating a standalone desktop application.

## Structure

```
electron-app/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── package.json         # Electron dependencies
├── frontend-dist/       # Built React app (copied during build)
└── backend/
    ├── BranchArchitect/ # BranchArchitect repo (git submodule)
    ├── server.py        # Python server entry point
    ├── requirements.txt # Python dependencies
    └── brancharchitect.spec  # PyInstaller config
```

## Development Setup

### 1. Clone BranchArchitect

```bash
cd electron-app/backend
git clone https://github.com/EnesSakalliUniWien/BranchArchitect.git
```

Or add as a git submodule (recommended):
```bash
cd phylo-movies  # project root
git submodule add https://github.com/EnesSakalliUniWien/BranchArchitect.git electron-app/backend/BranchArchitect
```

### 2. Install Electron dependencies

```bash
cd electron-app
npm install
```

### 3. Install Python backend

```bash
cd backend/BranchArchitect
poetry install  # Install BranchArchitect dependencies

cd ..  # back to backend/
pip install -r requirements.txt
```

### 3. Run in development mode

Terminal 1 - Start the React dev server:
```bash
cd ..  # phylo-movies root
npm run dev
```

Terminal 2 - Start Electron:
```bash
cd electron-app
npm run dev
```

## Building for Distribution

### 1. Bundle the Python backend

```bash
cd backend
pyinstaller brancharchitect.spec --clean
```

### 2. Build the frontend and package

```bash
npm run build:mac    # For macOS
npm run build:win    # For Windows
npm run build:linux  # For Linux
```

Output will be in `electron-app/release/`.

## Notes

- The frontend is built from the parent `phylo-movies` directory
- The backend is bundled using PyInstaller with all Python dependencies
- App size will be ~200-400MB due to scientific Python libraries
