# Electron App Integration

**Branch:** `feat/electron-integration`
**Description:** Restore and complete the Electron wrapper to provide PhyloMovies as a functional desktop application with its own bundled Python sidecar.

## Goal
To allow users to run PhyloMovies as either a standard web application or a standalone desktop application (Electron). The system must dynamically resolve the backend API URL based on the environment and ensure the Python sidecar is correctly managed in the desktop version.

## Implementation Steps

### Step 1: Update Electron Main Process & Sidecar Lifecycle
**Files:** `electron-app/main.js`, `electron-app/package.json`
**What:**
- Reconcile paths in `main.js` to point to `electron-app/BranchArchitect/webapp/run.py` instead of the legacy `backend/` folder.
- Update the `isDev` spawning logic to use `poetry run python webapp/run.py` within the `BranchArchitect` directory.
- Ensure the `get-backend-url` IPC handler is robust.
**Testing:** Run `cd electron-app && npm start` and verify the splash screen appears and the backend starts (check logs for "Flask server started").

### Step 2: DUAL-MODE API URL Resolution in Frontend
**Files:** `src/js/services/data/apiConfig.js` (NEW), `src/js/services/data/dataService.js`, `src/react/home/services/movieProcessing.js`
**What:**
- Create a utility `getApiBaseUrl()` that detects the environment:
    - **Web Mode:** Returns `""` (empty string) to rely on relative paths and Vite proxying.
    - **Electron Mode:** Calls `window.electronAPI.getBackendUrl()` to get the absolute loopback address (e.g., `http://localhost:5002`).
- Update all `fetch` and `EventSource` calls: `fetch(`${getApiBaseUrl()}/treedata`, ...)`
**Testing:**
- **Web:** Run `npm run dev` and verify uploads still work via the Vite proxy.
- **Electron:** Run `cd electron-app && npm start` and verify the frontend can communicate with the spawned Python process.

### Step 3: PyInstaller Bundling Configuration
**Files:** `electron-app/brancharchitect.spec` (NEW)
**What:**
- Define the PyInstaller specification to bundle the `BranchArchitect` Flask application into a standalone executable for sidecar distribution.
- Include necessary data files and scientific dependencies (NumPy, SciPy, etc.).
**Testing:** Run `pyinstaller brancharchitect.spec` and manually verify the output executable runs.

### Step 4: Integrated Build & Packaging Pipeline
**Files:** `package.json`, `electron-app/package.json`
**What:**
- Add a root-level `npm run build:electron` script that:
  1. Builds the React frontend (`npm run build`).
  2. Bundles the Python backend.
  3. Uses `electron-builder` to package the final application.
- Update `electron-app`'s build configuration to correctly package the bundled Python sidecar.
**Testing:** Run `npm run build:electron` and verify that a `.dmg` or `.exe` is generated in `electron-app/dist/` and is fully functional.
