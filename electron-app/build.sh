#!/bin/bash

# build.sh - Comprehensive build script for Phylo-Movies Electron App
# Usage: ./build.sh [macos|win|linux]

set -e # Exit immediately if a command exits with a non-zero status

# Directories
HOST_DIR=$(pwd)
PROJECT_ROOT="$(cd .. && pwd)" # Assumes we are in electron-app/
BACKEND_DIR="./BranchArchitect"
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

if ! command -v poetry &> /dev/null; then
    echo "Error: Poetry is not installed or not in PATH."
    exit 1
fi

echo "Installing backend dependencies..."
poetry install --no-root

echo "Running PyInstaller..."
# Builds the single-file executable into BranchArchitect/dist/brancharchitect-server
PYINSTALLER_CONFIG_DIR=/tmp/pyi-config \
poetry run pyinstaller brancharchitect.spec \
    --distpath dist \
    --workpath build/work \
    --noconfirm \
    --clean

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
# This fixes the issue where example files referenced in exampleDatasets.js
# are missing from the production build.
echo "Injecting example datasets..."

EXAMPLE_DEST="$FRONTEND_DIST/examples/norovirus/augur_subsampling"
mkdir -p "$EXAMPLE_DEST"

cp "$PROJECT_ROOT/publication_data/norovirus/augur_subsampling/noro_virus_example_350_gappyout_final.fasta" "$EXAMPLE_DEST/"

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
