#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

remove_if_exists() {
  local target="$1"
  if [ -e "$target" ]; then
    echo "Removing: $target"
    rm -rf "$target"
  fi
}

remove_if_exists "$ROOT_DIR/node_modules"
remove_if_exists "$ROOT_DIR/.npm"
remove_if_exists "$ROOT_DIR/.cache"
remove_if_exists "$ROOT_DIR/.parcel-cache"
remove_if_exists "$ROOT_DIR/.vite"
remove_if_exists "$ROOT_DIR/dist"

remove_if_exists "$ROOT_DIR/electron-app/node_modules"
remove_if_exists "$ROOT_DIR/electron-app/frontend-dist"
remove_if_exists "$ROOT_DIR/electron-app/release"
remove_if_exists "$ROOT_DIR/electron-app/logs"

remove_if_exists "$ROOT_DIR/engine/BranchArchitect/.venv"
remove_if_exists "$ROOT_DIR/engine/BranchArchitect/.venv-build"
remove_if_exists "$ROOT_DIR/engine/BranchArchitect/dist"
remove_if_exists "$ROOT_DIR/engine/BranchArchitect/build"
remove_if_exists "$ROOT_DIR/engine/BranchArchitect/webapp/.venv"
remove_if_exists "$ROOT_DIR/engine/BranchArchitect/test/output"

# Remove python caches under repo source trees
find "$ROOT_DIR" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "$ROOT_DIR" -type f -name "*.pyc" -prune -exec rm -f {} +

remove_if_exists "$ROOT_DIR/coverage"
remove_if_exists "$ROOT_DIR/.nyc_output"
remove_if_exists "$ROOT_DIR/.pytest_cache"
remove_if_exists "$ROOT_DIR/.mypy_cache"
remove_if_exists "$ROOT_DIR/.ruff_cache"

echo "Local hygiene cleanup complete."
