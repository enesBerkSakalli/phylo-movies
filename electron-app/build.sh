#!/bin/bash

# build.sh - Comprehensive build script for Phylo-Movies Electron App
# Usage: ./build.sh [macos|win|linux]

set -e # Exit immediately if a command exits with a non-zero status

# Directories
HOST_DIR=$(pwd)
PROJECT_ROOT="$(cd .. && pwd)" # Assumes we are in electron-app/
BACKEND_DIR="$PROJECT_ROOT/engine/BranchArchitect"
FRONTEND_DIST="./frontend-dist"

echo "=========================================="
echo "  Phylo-Movies Desktop Build Script"
echo "  Root: $PROJECT_ROOT"
echo "=========================================="

# -----------------------------------------------------------------------------
# 1. Cleanup
# -----------------------------------------------------------------------------
echo "[1/4] Cleaning previous builds..."
rm -rf "$FRONTEND_DIST"
rm -rf release
rm -rf "$BACKEND_DIR/dist"
rm -rf "$BACKEND_DIR/build"
echo "Clean complete."

# -----------------------------------------------------------------------------
# 2. Build Python Backend (Flask)
# -----------------------------------------------------------------------------
echo "[2/4] Building Python backend..."
cd "$BACKEND_DIR"

# Use dedicated Python 3.11 build environment for PyInstaller compatibility
BUILD_VENV="$BACKEND_DIR/.venv-build"
PYTHON_BUILD="/opt/homebrew/opt/python@3.11/bin/python3.11"

if [ ! -d "$BUILD_VENV" ]; then
    echo "Creating Python 3.11 build environment..."
    if [ ! -f "$PYTHON_BUILD" ]; then
        echo "Error: Python 3.11 not found at $PYTHON_BUILD"
        echo "Install with: brew install python@3.11"
        exit 1
    fi
    "$PYTHON_BUILD" -m venv "$BUILD_VENV"
    source "$BUILD_VENV/bin/activate"
    pip install --upgrade pip
    pip install poetry
    poetry env use "$BUILD_VENV/bin/python"
    poetry install --with build
else
    source "$BUILD_VENV/bin/activate"
    # Ensure poetry and build dependencies are available in existing env
    if ! command -v poetry >/dev/null 2>&1; then
        python -m pip install --upgrade pip
        python -m pip install poetry
    fi
    poetry env use "$BUILD_VENV/bin/python" >/dev/null 2>&1 || true
    if ! poetry run pyinstaller --version >/dev/null 2>&1; then
        echo "PyInstaller missing in build environment. Installing build dependencies..."
        poetry install --with build
    fi
fi

echo "Using Python: $(python --version)"
echo "Using PyInstaller from build environment..."

echo "Running PyInstaller..."
# Builds the single-file executable into BranchArchitect/dist/brancharchitect-server
PYINSTALLER_CONFIG_DIR=/tmp/pyi-config \
poetry run pyinstaller brancharchitect.spec \
    --distpath dist \
    --workpath build/work \
    --noconfirm \
    --clean

deactivate 2>/dev/null || true

echo "Archiving backend for Electron packaging..."
rm -f dist/brancharchitect-server.tar.gz
tar -czf dist/brancharchitect-server.tar.gz -C dist brancharchitect-server

cd "$HOST_DIR" # Go back to electron-app/
echo "Backend build complete."

# -----------------------------------------------------------------------------
# 3. Build React Frontend (Vite)
# -----------------------------------------------------------------------------
echo "[3/4] Building React frontend..."
cd "$PROJECT_ROOT"

echo "Installing frontend dependencies..."
npm install

echo "Building Vite project (ELECTRON_BUILD=true)..."
ELECTRON_BUILD=true npm run build

cd "$HOST_DIR" # Go back to electron-app/

echo "Copying build artifacts to $FRONTEND_DIST..."
cp -r "$PROJECT_ROOT/dist" "$FRONTEND_DIST"

# -----------------------------------------------------------------------------
# 3.1 Inject Example Custom Data
# -----------------------------------------------------------------------------
# Copy example datasets that are referenced in exampleDatasets.js
"$PROJECT_ROOT/scripts/copy-examples.sh" "$FRONTEND_DIST"

echo "Frontend prepared successfully."

# -----------------------------------------------------------------------------
# 4. Package Electron App
# -----------------------------------------------------------------------------
echo "[4/4] Packaging Electron application..."

# Determine target
TARGET=""
if [[ "$1" == "win" || "$1" == "windows" ]]; then
    TARGET="--win"
elif [[ "$1" == "linux" ]]; then
    TARGET="--linux"
else
    TARGET="--mac" # Default to Mac
fi

echo "Running electron-builder for target: $TARGET"
npx electron-builder $TARGET

echo "=========================================="
echo "  Build Success!"
echo "  Installer location: ./release"
echo "=========================================="
