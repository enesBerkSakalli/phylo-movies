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

# Determine target before doing expensive work so incompatible macOS
# architecture requests fail before rebuilding the backend and frontend.
TARGET_ARGS=()
if [[ "$1" == "win" || "$1" == "windows" ]]; then
    TARGET_ARGS=("--win")
elif [[ "$1" == "linux" ]]; then
    TARGET_ARGS=("--linux")
else
    TARGET_ARGS=("--mac") # Default to Mac
fi

# Collect extra args (e.g., --publish always for release builds)
shift || true
EXTRA_ARGS=("$@")

if [[ "${TARGET_ARGS[0]}" == "--mac" ]]; then
    HOST_ARCH="$(uname -m)"
    if [[ "$HOST_ARCH" == "arm64" ]]; then
        DEFAULT_MAC_ARCH="--arm64"
    elif [[ "$HOST_ARCH" == "x86_64" ]]; then
        DEFAULT_MAC_ARCH="--x64"
    else
        echo "Error: Unsupported macOS build architecture: $HOST_ARCH"
        exit 1
    fi

    REQUESTED_MAC_ARCH=""
    for arg in "${EXTRA_ARGS[@]}"; do
        if [[ "$arg" == "--arm64" || "$arg" == "--x64" || "$arg" == "--universal" ]]; then
            REQUESTED_MAC_ARCH="$arg"
        fi
    done

    if [[ -z "$REQUESTED_MAC_ARCH" ]]; then
        TARGET_ARGS+=("$DEFAULT_MAC_ARCH")
    elif [[ "$REQUESTED_MAC_ARCH" != "$DEFAULT_MAC_ARCH" ]]; then
        echo "Error: Cannot build $REQUESTED_MAC_ARCH macOS package on $HOST_ARCH."
        echo "The bundled PyInstaller backend is built for the host architecture."
        exit 1
    fi
fi

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

echo "Installing backend fixture dependencies..."
(cd "$PROJECT_ROOT/engine/BranchArchitect" && poetry install)

echo "Regenerating generated browser demo payloads..."
npm run fixtures:generate:ci

echo "Building Vite project (ELECTRON_BUILD=true)..."
ELECTRON_BUILD=true npm run build

cd "$HOST_DIR" # Go back to electron-app/

echo "Copying build artifacts to $FRONTEND_DIST..."
cp -r "$PROJECT_ROOT/dist" "$FRONTEND_DIST"

# Example datasets are copied into dist/ by the root build from publication_data/.
# frontend-dist is a generated packaging artifact; publication_data/ remains the
# only source of truth.
echo "Checking generated frontend for local absolute paths..."
node "$PROJECT_ROOT/scripts/check-electron-frontend-dist.mjs"

echo "Frontend prepared successfully."

# -----------------------------------------------------------------------------
# 4. Package Electron App
# -----------------------------------------------------------------------------
echo "[4/4] Packaging Electron application..."

echo "Running electron-builder for target: ${TARGET_ARGS[*]} ${EXTRA_ARGS[*]}"
npx electron-builder "${TARGET_ARGS[@]}" "${EXTRA_ARGS[@]}"

echo "=========================================="
echo "  Build Success!"
echo "  Installer location: ./release"
echo "=========================================="
