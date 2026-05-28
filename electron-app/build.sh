#!/bin/bash

# build.sh - Comprehensive build script for Phylo-Movies Electron App
# Usage: ./build.sh [mac|win|linux] [electron-builder args...]

set -e # Exit immediately if a command exits with a non-zero status

# Directories
HOST_DIR=$(pwd)
PROJECT_ROOT="$(cd .. && pwd)" # Assumes we are in electron-app/
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
echo "Clean complete."

# -----------------------------------------------------------------------------
# 2. Build Python Backend (Flask)
# -----------------------------------------------------------------------------
echo "[2/4] Building Python backend..."
bash "$HOST_DIR/build-backend.sh"

# -----------------------------------------------------------------------------
# 3. Build React Frontend (Vite)
# -----------------------------------------------------------------------------
echo "[3/4] Building React frontend..."
cd "$PROJECT_ROOT"

echo "Installing frontend dependencies..."
npm ci

echo "Building Vite project (ELECTRON_BUILD=true)..."
ELECTRON_BUILD=true npm run build

cd "$HOST_DIR" # Go back to electron-app/

echo "Copying build artifacts to $FRONTEND_DIST..."
cp -r "$PROJECT_ROOT/dist" "$FRONTEND_DIST"

# Example datasets are copied into dist/ by the root build from publication_data/.
# frontend-dist is a generated packaging artifact; publication_data/ remains the
# only source of truth.

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

# Collect extra args (e.g., --publish always for release builds)
shift || true
EXTRA_ARGS=("$@")

echo "Running electron-builder for target: $TARGET ${EXTRA_ARGS[*]}"
npx electron-builder "$TARGET" "${EXTRA_ARGS[@]}"

echo "=========================================="
echo "  Build Success!"
echo "  Installer location: ./release"
echo "=========================================="
