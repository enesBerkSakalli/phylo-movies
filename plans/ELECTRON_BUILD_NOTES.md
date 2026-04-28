# Electron Build Notes & Lessons Learned

This document captures all the knowledge gained from building and debugging the Phylo-Movies Electron app with the BranchArchitect Python backend.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Build Process](#build-process)
3. [PyInstaller Bundling](#pyinstaller-bundling)
4. [FastTree Binary Bundling](#fasttree-binary-bundling)
5. [Path Resolution in Frozen Apps](#path-resolution-in-frozen-apps)
6. [SSE Streaming with Waitress](#sse-streaming-with-waitress)
7. [Debugging the Electron App](#debugging-the-electron-app)
8. [Common Issues & Solutions](#common-issues--solutions)
9. [File Locations Reference](#file-locations-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron App (main.js)                       │
│  - Spawns Python backend as child process                        │
│  - Creates BrowserWindow for React frontend                      │
│  - Handles IPC communication                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BranchArchitect Backend                          │
│  - Flask server with Waitress WSGI                               │
│  - PyInstaller bundled as one-dir mode                           │
│  - Handles tree interpolation & MSA processing                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Binaries                             │
│  - FastTree (for MSA → phylogenetic trees)                       │
│  - Platform-specific: darwin/win32/linux                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Build Process

### Prerequisites

```bash
# Install pyinstaller as dev dependency (already in pyproject.toml)
cd electron-app/BranchArchitect
poetry install  # Includes pyinstaller from dev deps
```

### Commands

```bash
# Full build (from electron-app directory)
npm run build:mac        # Builds for macOS (x64 + arm64)
npm run build:win        # Builds for Windows
npm run build:linux      # Builds for Linux

# What happens during build:
# 1. PyInstaller bundles Python backend (BranchArchitect) - platform-specific FastTree only
# 2. Vite builds React frontend
# 3. electron-builder packages everything into DMG/EXE/AppImage
```

### Build Output Structure

```
electron-app/
├── release/
│   ├── mac/                              # x64 build
│   │   └── Phylo-Movies.app/
│   ├── mac-arm64/                        # arm64 build
│   │   └── Phylo-Movies.app/
│   │       └── Contents/
│   │           └── Resources/
│   │               ├── BranchArchitect/
│   │               │   └── brancharchitect-server/
│   │               │       ├── brancharchitect-server  # Main executable
│   │               │       └── _internal/              # PyInstaller data
│   │               │           ├── bin/darwin/fasttree # External binary
│   │               │           ├── webapp/
│   │               │           ├── brancharchitect/
│   │               │           └── msa_to_trees/
│   │               └── frontend-dist/    # Vite build output
│   ├── Phylo-Movies-0.64.0.dmg
│   └── Phylo-Movies-0.64.0-arm64.dmg
```

---

## PyInstaller Bundling

### One-Dir vs One-File Mode

BranchArchitect uses **one-dir mode** (`--onedir` / `COLLECT` in spec):
- Creates a folder with the executable + `_internal/` subfolder
- Better for debugging and faster startup
- Data files go into `_internal/` subfolder

**`sys._MEIPASS` in both modes (PyInstaller 4.0+):**
- One-file: `sys._MEIPASS` points to temp extraction folder
- One-dir: `sys._MEIPASS` points to `_internal/` folder next to executable

### Spec File Location

```
electron-app/BranchArchitect/brancharchitect.spec
```

### Adding Data Files to Bundle

In `brancharchitect.spec`:

```python
import platform

# Determine platform-specific binary folder
system = platform.system().lower()
if system == 'darwin':
    platform_dir = 'darwin'
elif system == 'windows':
    platform_dir = 'win32'
else:
    platform_dir = 'linux'

datas = [
    ('webapp', 'webapp'),                           # Flask templates/static
    ('brancharchitect', 'brancharchitect'),         # Core library
    ('msa_to_trees', 'msa_to_trees'),               # MSA pipeline
    (f'bin/{platform_dir}', f'bin/{platform_dir}'), # External binaries (FastTree)
]
```

---

## FastTree Binary Bundling

### Problem
MSA processing failed with `FileNotFoundError` because FastTree wasn't included in the PyInstaller bundle.

### Solution

1. **Add to spec file** (already shown above):
   ```python
   (f'bin/{platform_dir}', f'bin/{platform_dir}'),
   ```

2. **Verify binary exists** in source:
   ```
   electron-app/BranchArchitect/bin/darwin/fasttree   # macOS
   electron-app/BranchArchitect/bin/win32/fasttree.exe # Windows
   electron-app/BranchArchitect/bin/linux/fasttree    # Linux
   ```

3. **Verify in built app**:
   ```bash
   find /path/to/Phylo-Movies.app -name "fasttree"
   # Should show: .../_internal/bin/darwin/fasttree
   ```

---

## Path Resolution in Frozen Apps

### The Pattern

In `msa_to_trees/msa_to_trees/pipeline.py`:

```python
import sys
from pathlib import Path

def _get_fasttree_exe() -> str:
    """Determine the path to the FastTree executable."""

    # 1. Environment variable override
    if "FASTTREE_PATH" in os.environ:
        return os.environ["FASTTREE_PATH"]

    # 2. Check for bundled binary in PyInstaller frozen app
    if getattr(sys, "frozen", False):
        # PyInstaller sets sys._MEIPASS to the data directory in both modes:
        # - One-file: temp extraction folder
        # - One-dir: _internal folder next to executable
        base_path = Path(sys._MEIPASS)

        system = platform.system().lower()
        # ... platform detection ...

        bundled_exe = base_path / "bin" / platform_dir / exe_name
        if bundled_exe.exists():
            return str(bundled_exe)

    # 3. Fallback to system PATH
    return "fasttree"
```

---

## SSE Streaming with Waitress

### The Problem

Backend logs showed:
```
ValueError: header Connection "hop-by-hop" header; Connection is a "hop-by-hop" header
```

### Cause

Waitress (the WSGI server used by BranchArchitect) doesn't fully support HTTP/1.1 chunked transfer encoding needed for Server-Sent Events (SSE).

### Workaround Options

1. **Switch to a different WSGI server** (e.g., Gunicorn with gevent):
   ```python
   # Instead of Waitress
   from gevent.pywsgi import WSGIServer
   server = WSGIServer(('0.0.0.0', 5002), app)
   ```

2. **Use polling instead of SSE** for progress updates

3. **Accept the limitation**: SSE streaming fails gracefully, but tree processing still works

### Note
This is a separate issue from FastTree bundling. The 500 errors on `/stream/progress/{uuid}` are caused by this SSE incompatibility, but the main MSA→trees pipeline should still work.

---

## Debugging the Electron App

### Enable DevTools

Added keyboard shortcut in `main.js`:

```javascript
mainWindow.webContents.on('before-input-event', (event, input) => {
    // Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
    if ((input.meta && input.alt && input.key === 'i') ||
        (input.control && input.shift && input.key === 'I')) {
        mainWindow.webContents.toggleDevTools();
    }
});
```

**Usage**: Press `Cmd+Option+I` to toggle Developer Tools in the running app.

### Backend Logs Location

```
electron-app/logs/backend.log
```

Watch logs in real-time:
```bash
tail -f electron-app/logs/backend.log
```

### Common Debug Commands

```bash
# Check if backend is running
curl http://localhost:5002/health

# Find FastTree in built app
find /path/to/Phylo-Movies.app -name "fasttree"

# Check app structure
ls -la /path/to/Phylo-Movies.app/Contents/Resources/

# View recent backend logs
tail -100 electron-app/logs/backend.log
```

---

## Common Issues & Solutions

### Issue 1: "FileNotFoundError: fasttree"
**Cause**: FastTree binary not bundled or wrong path resolution
**Solution**:
- Add binary to PyInstaller spec `datas`
- Fix path resolution to use `_internal/` subfolder

### Issue 2: "500 Internal Server Error on /stream/progress"
**Cause**: Waitress doesn't support SSE hop-by-hop headers
**Solution**: Separate issue from main functionality; consider alternative streaming

### Issue 3: "Connection to server lost" in frontend
**Cause**: Backend crashed or SSE connection failed
**Debug**: Check `logs/backend.log` for actual error

### Issue 4: Build fails with "hidden import not found"
**Cause**: PyInstaller can't detect all imports
**Solution**: Add to `hiddenimports` in spec file:
```python
hiddenimports = ['missing_module']
```

### Issue 5: App works in dev but not in production
**Cause**: Usually path resolution differences
**Debug**:
- Check if `sys.frozen` is True in production
- Verify data files are in `_internal/`
- Check for hardcoded absolute paths

---

## File Locations Reference

### Key Configuration Files

| File                                                                 | Purpose                            |
| -------------------------------------------------------------------- | ---------------------------------- |
| `electron-app/package.json`                                          | Electron app config, build scripts |
| `electron-app/main.js`                                               | Electron main process              |
| `electron-app/BranchArchitect/brancharchitect-server.spec`           | PyInstaller bundle config          |
| `electron-app/BranchArchitect/run.py`                                | Flask server entry point           |
| `electron-app/BranchArchitect/msa_to_trees/msa_to_trees/pipeline.py` | MSA processing (FastTree calls)    |

### Binary Locations

| Context     | FastTree Path                                                               |
| ----------- | --------------------------------------------------------------------------- |
| Development | `BranchArchitect/bin/darwin/fasttree`                                       |
| Built App   | `Phylo-Movies.app/.../brancharchitect-server/_internal/bin/darwin/fasttree` |

### Log Files

| File                            | Content                      |
| ------------------------------- | ---------------------------- |
| `electron-app/logs/backend.log` | Python backend stdout/stderr |
| DevTools Console                | Frontend JavaScript errors   |

---

## Rebuild Checklist

When making changes to the backend:

- [ ] Edit source files in `BranchArchitect/`
- [ ] If adding new data files, update `brancharchitect-server.spec`
- [ ] Run `npm run build:mac` from `electron-app/`
- [ ] Verify files are bundled: `find .../Phylo-Movies.app -name "filename"`
- [ ] Test the built app (not dev server)
- [ ] Check `logs/backend.log` if issues occur

---

## Version Info

- **Electron**: 33.4.11
- **electron-builder**: 25.1.8
- **PyInstaller**: (check with `poetry show pyinstaller`)
- **Python**: 3.13+
- **Node.js**: Check with `node --version`

---

*Last updated: February 2026*
