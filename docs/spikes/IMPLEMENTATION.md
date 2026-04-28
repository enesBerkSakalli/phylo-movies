# Electron Desktop App Implementation

This document summarizes the work done to package Phylo-Movies as a standalone Electron desktop application.

## Overview

We created an Electron wrapper that bundles:
1. **React Frontend** - Vite-built SPA with deck.gl tree visualization
2. **Python Backend** - Flask server bundled via PyInstaller (BranchArchitect)
3. **FastTree Binary** - Pre-compiled phylogenetic tree inference tool

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────┐              ┌──────────────────────┐  │
│  │   main.js       │───spawns────▶│ brancharchitect-server│  │
│  │                 │              │ (PyInstaller bundle)  │  │
│  └────────┬────────┘              └──────────┬───────────┘  │
│           │                                   │              │
│           │ loadFile()                        │ :5002        │
│           ▼                                   ▼              │
│  ┌─────────────────┐              ┌──────────────────────┐  │
│  │ Renderer Process│◀────fetch───▶│   Flask API Server   │  │
│  │ (React Frontend)│              │                      │  │
│  └─────────────────┘              └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Dual-Mode Support

The application works in two modes:

| Mode         | Frontend                    | Backend                            | API Resolution                       |
| ------------ | --------------------------- | ---------------------------------- | ------------------------------------ |
| **Web**      | `npm run dev` (Vite :5173)  | `poetry run python run.py` (:5002) | Vite proxy (`/api` → `:5002`)        |
| **Electron** | Bundled in `frontend-dist/` | Bundled PyInstaller executable     | `window.electronAPI.getBackendUrl()` |

---

## Files Created/Modified

### New Files

| File                                                | Purpose                                     |
| --------------------------------------------------- | ------------------------------------------- |
| `src/js/services/data/apiConfig.js`                 | Dynamic API URL resolution for web/Electron |
| `electron-app/BranchArchitect/brancharchitect.spec` | PyInstaller spec with dependency collection |
| `electron-app/BranchArchitect/requirements.txt`     | Frozen pip dependencies                     |
| `.github/workflows/release.yml`                     | CI/CD for cross-platform builds             |
| `test/apiConfig.test.js`                            | Tests for API config                        |
| `test/dataService_api.test.js`                      | Tests for data service API integration      |

### Modified Files

| File                                         | Change                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| `src/js/services/data/dataService.js`        | Uses `resolveApiUrl()` for all fetch calls              |
| `src/react/home/services/movieProcessing.js` | Uses `resolveApiUrl()` for uploads/SSE                  |
| `src/react/Router.jsx`                       | Uses `HashRouter` for Electron, `BrowserRouter` for web |
| `vite.config.mts`                            | `base: './'` when `ELECTRON_BUILD=true`                 |
| `electron-app/main.js`                       | Updated paths, added `FLASK_DEBUG=0`, error handling    |
| `electron-app/package.json`                  | Build scripts, electron-builder config                  |

---

## Key Implementation Details

### 1. API URL Resolution (`apiConfig.js`)

```javascript
export function isElectron() {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

export function getApiBaseUrl() {
  if (isElectron()) {
    return window.electronAPI.getBackendUrl(); // "http://localhost:5002"
  }
  return ''; // Web mode uses Vite proxy
}

export function resolveApiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}
```

### 2. Router Configuration

Electron uses `HashRouter` because `file://` protocol doesn't support history-based routing:

```javascript
// src/react/Router.jsx
import { isElectron } from '../js/services/data/apiConfig.js';

const RouterComponent = isElectron() ? HashRouter : BrowserRouter;
```

### 3. PyInstaller Spec File

The spec file explicitly collects all Flask and scientific Python dependencies:

```python
packages_to_collect = [
    'flask', 'flask_cors', 'flask_compress',
    'werkzeug', 'jinja2', 'click', 'blinker',
    'Bio', 'numpy', 'scipy', 'pandas', 'networkx',
    'sklearn', 'joblib', 'skbio', 'pydantic',
]

for pkg in packages_to_collect:
    datas, binaries, hiddenimports = collect_all(pkg)
    # Added to Analysis
```

### 4. Electron Main Process

Key responsibilities in `main.js`:
- Find available port starting from 5002
- Spawn bundled Python backend with correct environment
- Wait for backend to be ready before showing window
- Expose backend URL via preload script
- Clean shutdown of backend on app quit

---

## Build Process

### Prerequisites

```bash
# Frontend dependencies
npm install

# Electron dependencies
cd electron-app && npm install

# Python dependencies
cd electron-app/BranchArchitect && poetry install
```

### Build Commands

```bash
cd electron-app

# Build Python backend (~2 min)
npm run build:backend

# Build frontend with relative paths
npm run build:frontend

# Build complete macOS app
npm run build:mac
```

### Output

```
electron-app/release/
├── Phylo-Movies-0.1.0.dmg          # Intel Mac (~260MB)
├── Phylo-Movies-0.1.0-arm64.dmg    # Apple Silicon (~255MB)
├── mac/Phylo-Movies.app/
└── mac-arm64/Phylo-Movies.app/
```

---

## Issues Encountered & Solutions

### 1. Flask Not Found in Bundle

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Cause:** Poetry virtual environment wasn't fully installed; PyInstaller needs explicit dependency collection.

**Solution:**
1. Run `poetry install` to ensure all deps are installed
2. Use `collect_all()` in PyInstaller spec for each package

### 2. Flask Debug Mode Conflicts

**Error:** `unrecognized arguments: -B -S -I -c from multiprocessing.resource_tracker`

**Cause:** Flask's debug reloader spawns child processes that inherit PyInstaller's arguments.

**Solution:** Set production environment variables:
```javascript
env.FLASK_DEBUG = '0';
env.FLASK_ENV = 'production';
```

### 3. Absolute Asset Paths

**Error:** Assets not loading (404s for `/assets/...`)

**Cause:** Vite default `base: '/'` creates absolute paths that don't work with `file://` protocol.

**Solution:**
```javascript
// vite.config.mts
const isElectronBuild = process.env.ELECTRON_BUILD === 'true';
return { base: isElectronBuild ? './' : '/' };
```

### 4. BrowserRouter Doesn't Work with file://

**Error:** Blank page or routing errors in Electron

**Cause:** `BrowserRouter` uses History API which requires a server.

**Solution:** Use `HashRouter` for Electron which uses URL hash for routing.

### 5. Worker Process Crashes (Current Issue)

**Error:** `A worker process managed by the executor was unexpectedly terminated`

**Cause:** `joblib` parallel processing with `loky` backend doesn't work in PyInstaller bundles.

**Status:** Needs investigation. Possible solutions:
- Set `JOBLIB_MULTIPROCESSING=0` to disable multiprocessing
- Use `threading` backend instead of `loky`
- Modify BranchArchitect to detect frozen state

---

## Testing

```bash
# Run API config tests
npm test -- test/apiConfig.test.js

# Run data service tests
npm test -- test/dataService_api.test.js
```

All 13 tests pass.

---

## CI/CD

The `.github/workflows/release.yml` workflow:

1. Triggers on version tags (`v*`)
2. Matrix builds for: `macos-latest`, `macos-13`, `windows-latest`, `ubuntu-latest`
3. Sets up Miniforge and downloads FastTree from Bioconda
4. Builds Python backend with PyInstaller
5. Builds frontend with `ELECTRON_BUILD=true`
6. Creates platform-specific installers
7. Uploads to GitHub Releases

---

## Next Steps

1. **Fix joblib multiprocessing** - Investigate loky backend compatibility with PyInstaller
2. **Add code signing** - Apple Developer certificate for notarization
3. **Reduce bundle size** - Exclude matplotlib, plotly, seaborn, jupyter, etc.
4. **Add auto-updates** - Implement electron-updater
5. **Test on Windows/Linux** - Verify cross-platform builds work

---

## File Size Breakdown

| Component             | Size       |
| --------------------- | ---------- |
| Electron framework    | ~100MB     |
| Python runtime + deps | ~150MB     |
| Frontend bundle       | ~3MB       |
| **Total DMG**         | **~255MB** |
