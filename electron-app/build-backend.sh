#!/bin/bash

# build-backend.sh - Build the BranchArchitect backend for Electron packaging.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/engine/BranchArchitect"

echo "[backend] Building Python backend..."
cd "$BACKEND_DIR"

rm -rf dist
rm -rf build

# Use a dedicated Python 3.11 build environment for PyInstaller compatibility.
BUILD_VENV="$BACKEND_DIR/.venv-build"

if [ -f "/opt/homebrew/opt/python@3.11/bin/python3.11" ]; then
    PYTHON_BUILD="/opt/homebrew/opt/python@3.11/bin/python3.11"
elif command -v python3.11 >/dev/null 2>&1; then
    PYTHON_BUILD="$(command -v python3.11)"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BUILD="$(command -v python3)"
else
    echo "Error: No suitable Python found. Install Python 3.11."
    exit 1
fi
echo "Using Python build interpreter: $PYTHON_BUILD"

if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == CYGWIN* || "$(uname -s)" == MSYS* ]]; then
    VENV_BIN="Scripts"
else
    VENV_BIN="bin"
fi

if [ ! -d "$BUILD_VENV" ]; then
    echo "Creating Python build environment..."
    if [ ! -f "$PYTHON_BUILD" ] && ! command -v "$PYTHON_BUILD" >/dev/null 2>&1; then
        echo "Error: Python not found at $PYTHON_BUILD"
        exit 1
    fi
    "$PYTHON_BUILD" -m venv "$BUILD_VENV"
fi

source "$BUILD_VENV/$VENV_BIN/activate"

if ! python -m pip show brancharchitect pyinstaller >/dev/null 2>&1; then
    echo "Installing backend runtime and PyInstaller into build environment..."
    python -m pip install --upgrade pip
    python -m pip install . "pyinstaller>=6.0.0,<7.0.0"
fi

echo "Using Python: $(python --version)"
echo "Using PyInstaller from build environment..."

PYINSTALLER_CONFIG_DIR=/tmp/pyi-config \
pyinstaller brancharchitect.spec \
    --distpath dist \
    --workpath build/work \
    --noconfirm \
    --clean

deactivate 2>/dev/null || true

echo "Archiving backend for Electron packaging..."
rm -f dist/brancharchitect-server.tar.gz
tar -czf dist/brancharchitect-server.tar.gz -C dist brancharchitect-server

echo "[backend] Backend build complete."
