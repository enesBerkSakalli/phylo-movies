# PhyloMovies Dependency Map

> LLM-friendly reference for understanding project structure and dependencies

---

## Directory Structure Overview

```
phylo-movies/                          # Root repository (enesBerkSakalli/phylo-movies)
├── src/                               # FRONTEND SOURCE (React + deck.gl)
│   ├── js/                            # Core JavaScript modules
│   ├── react/                         # React components
│   ├── components/                    # shadcn/ui components
│   ├── hooks/                         # React hooks
│   └── css/                           # Styles
│
├── engine/                            # COMPUTATION ENGINE (standalone)
│   └── BranchArchitect/               # Git submodule → EnesSakalliUniWien/BranchArchitect
│       ├── brancharchitect/           # Python tree transformation engine
│       ├── webapp/                    # Flask server (REST API)
│       ├── msa_to_trees/              # MSA processing (local Poetry dep)
│       └── pyproject.toml             # Python dependencies (Poetry)
│
├── electron-app/                      # ELECTRON DESKTOP WRAPPER (optional)
│   ├── main.js                        # Electron main process
│   └── package.json                   # Electron dependencies (separate)
│
├── test/                              # Frontend tests (Mocha + Chai)
├── package.json                       # Frontend dependencies (npm)
├── start_frontend.sh                  # Unified startup script
└── .gitmodules                        # Defines BranchArchitect submodule
```

---

## Three Package Managers, Three Dependency Trees

### 1. Frontend (npm) — `/package.json`
**Location:** Root directory
**Install:** `npm install`
**Run:** `npm run dev` (port 5173)

| Category     | Key Dependencies                                    |
| ------------ | --------------------------------------------------- |
| Rendering    | `@deck.gl/*` (9.2.5), `@luma.gl/*`, `d3-hierarchy`  |
| UI Framework | `react` (18), `zustand`, `shadcn/ui`, `tailwindcss` |
| Build        | `vite`, `@vitejs/plugin-react`                      |
| Test         | `mocha`, `chai` (NOT Jest)                          |

### 2. Electron Desktop (npm) — `/electron-app/package.json`
**Location:** `electron-app/`
**Install:** `cd electron-app && npm install`
**Run:** `npm run start`

| Category | Key Dependencies                                        |
| -------- | ------------------------------------------------------- |
| Core     | `electron` (33), `electron-builder`, `electron-updater` |

### 3. Engine (Poetry/Python) — `/engine/BranchArchitect/pyproject.toml`
**Location:** `engine/BranchArchitect/` (Git submodule)
**Install:** `poetry install`
**Run:** `./start_movie_server.sh` (port 5002)

| Category       | Key Dependencies                            |
| -------------- | ------------------------------------------- |
| Core           | `python` (^3.11), `numpy`, `scipy`          |
| Bioinformatics | `biopython`, `scikit-bio`                   |
| Web Server     | `flask`, `flask-cors`, `waitress`, `orjson` |
| Local Module   | `msa_to_trees` (path dependency)            |

---

## Dependency Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Frontend (React + deck.gl)                                            │ │
│  │  Location: /src/                                                       │ │
│  │  Port: 5173                                                            │ │
│  │  Deps: package.json (npm)                                              │ │
│  └─────────────────────────────────────┬──────────────────────────────────┘ │
│                                        │ HTTP API calls                      │
│                                        ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Engine (BranchArchitect Flask Server)                                 │ │
│  │  Location: /engine/BranchArchitect/                                    │ │
│  │  Port: 5002                                                            │ │
│  │  Deps: pyproject.toml (Poetry)                                         │ │
│  │  Repo: github.com/EnesSakalliUniWien/BranchArchitect (submodule)       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Electron Wrapper (Optional - Desktop App)                             │ │
│  │  Location: /electron-app/                                              │ │
│  │  Deps: electron-app/package.json (npm)                                 │ │
│  │  Bundles: Frontend dist + Engine binary                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Git Submodule: BranchArchitect

**Defined in:** `.gitmodules`
```
[submodule "engine/BranchArchitect"]
    path = engine/BranchArchitect
    url = https://github.com/EnesSakalliUniWien/BranchArchitect.git
```

**Commands:**
```bash
# Initialize submodule (first clone)
git submodule update --init --recursive

# Update to latest
cd engine/BranchArchitect && git pull origin main

# Check submodule status
git submodule status
```

---

## Startup Scripts

### `start_frontend.sh` (Unified)
Does everything:
1. Checks if BranchArchitect exists → clones from GitHub if missing
2. Checks if Flask server (port 5002) is running → starts if not
3. Checks if Vite server (port 5173) is running → starts if not
4. Manages cleanup on Ctrl+C

### VS Code Tasks (`.vscode/tasks.json`)
| Task                           | Action                              |
| ------------------------------ | ----------------------------------- |
| `Poetry: Install Dependencies` | `poetry install` in BranchArchitect |
| `Poetry: Run Flask Server`     | `./start_movie_server.sh`           |
| `Frontend: Run Dev Server`     | `npm run dev`                       |

---

## Install Commands Summary

```bash
# Full setup from scratch
git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies

# Frontend
npm install

# Engine
cd engine/BranchArchitect
poetry install
cd ../..

# Electron (optional)
cd electron-app
npm install
```

---

## Runtime Ports

| Service       | Port | Protocol | Started By                        |
| ------------- | ---- | -------- | --------------------------------- |
| Vite Frontend | 5173 | HTTP     | `npm run dev`                     |
| Flask Engine  | 5002 | HTTP/SSE | `./start_movie_server.sh`         |
| Electron      | N/A  | Local    | `npm run start` (in electron-app) |

### Port Configuration Locations

| Port | Configured In                       | Notes                                            |
| ---- | ----------------------------------- | ------------------------------------------------ |
| 5173 | `vite.config.mts` → `server.port`   | `strictPort: true`                               |
| 5002 | `webapp/run.py` → `--port` default  | Also in `start_movie_server.sh`                  |
| 5002 | `vite.config.mts` → `server.proxy`  | Proxies `/treedata`, `/stream`, `/msa`, `/about` |
| 5002 | `start_frontend.sh` → `ENGINE_PORT` | Startup script check                             |

### API Proxy Routes (Development)

Vite proxies these routes to the Flask engine:
```
/treedata  → http://localhost:5002
/stream    → http://localhost:5002
/msa       → http://localhost:5002
/about     → http://localhost:5002
```

In Electron mode, frontend uses `window.electronAPI.getBackendUrl()` directly (no proxy).

---

## Key File Locations for Common Tasks

| Task                    | Files to Modify                                |
| ----------------------- | ---------------------------------------------- |
| Add npm dependency      | `/package.json`                                |
| Add Python dependency   | `/engine/BranchArchitect/pyproject.toml`       |
| Add Electron dependency | `/electron-app/package.json`                   |
| Configure submodule     | `/.gitmodules`                                 |
| Add startup logic       | `/start_frontend.sh`                           |
| Configure VS Code tasks | `/.vscode/tasks.json`                          |

---

## Why This Structure?

1. **Separation of Concerns**
   - Frontend is pure browser tech (npm/Vite)
   - Engine is pure Python (Poetry)
   - Electron bridges them for desktop

2. **Independent Development**
   - BranchArchitect can be developed/tested independently
   - Frontend can run against any BranchArchitect server (local/remote)
   - Submodule pins a specific version

3. **Deployment Flexibility**
   - Web-only: Deploy frontend to static host, engine to server
   - Desktop: Bundle everything in Electron

---

## Recommended Improvements (Future)

1. **Move engine to `/engine/BranchArchitect/`** - clearer than nested under electron-app
2. **Add health check endpoint** - `/api/health` in Flask for startup validation
3. **Docker compose** - for consistent dev environment
4. **Monorepo tooling** - consider `turbo` or `nx` for unified task running
