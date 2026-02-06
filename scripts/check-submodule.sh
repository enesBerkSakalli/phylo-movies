#!/bin/bash
# ============================================================================
# Submodule Guard — runs as npm preinstall hook
#
# Automatically initialises the BranchArchitect git submodule when it is
# missing.  This mirrors the industry-standard pattern used by projects like
# highlight.io and grpc.io: the preinstall hook calls
#   git submodule update --init --recursive
# so that a plain `git clone` + `npm install` "just works".
#
# In environments without a .git directory (Docker COPY, tarballs, CI
# artefacts) the script is a no-op.
# ============================================================================

SUBMODULE_DIR="engine/BranchArchitect"
MARKER_FILE="$SUBMODULE_DIR/pyproject.toml"

# ----- Skip in non-git contexts (Docker, tarball, etc.) -----
if [ ! -d ".git" ]; then
  exit 0
fi

# ----- Auto-init if the submodule content is missing -----
if [ ! -f "$MARKER_FILE" ]; then
  echo ""
  echo "[submodule] BranchArchitect submodule not found — initialising automatically…"
  echo ""
  git submodule update --init --recursive
  if [ $? -ne 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║  ⚠  Failed to initialise BranchArchitect submodule!            ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║                                                                ║"
    echo "║  Automatic init failed.  Please try manually:                  ║"
    echo "║                                                                ║"
    echo "║    git submodule update --init --recursive                     ║"
    echo "║                                                                ║"
    echo "║  Or re-clone with submodules:                                  ║"
    echo "║                                                                ║"
    echo "║    git clone --recurse-submodules <repo-url>                   ║"
    echo "║                                                                ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    exit 1
  fi
  echo "[submodule] BranchArchitect initialised successfully ✓"
fi

# ----- Install Python dependencies if Poetry is available -----
if [ -f "$MARKER_FILE" ]; then
  if command -v poetry &> /dev/null; then
    # Only run if .venv doesn't exist yet (first time) or pyproject.toml
    # is newer than the venv (dependency change)
    VENV_DIR="$SUBMODULE_DIR/.venv"
    if [ ! -d "$VENV_DIR" ] || [ "$MARKER_FILE" -nt "$VENV_DIR" ]; then
      echo ""
      echo "[backend] Installing BranchArchitect Python dependencies…"
      (cd "$SUBMODULE_DIR" && poetry install --no-interaction)
      if [ $? -ne 0 ]; then
        echo "[backend] ⚠  poetry install failed — backend may not work."
        echo "[backend]    You can retry manually:  cd $SUBMODULE_DIR && poetry install"
        # Non-fatal: don't block npm install for a Python issue
      else
        echo "[backend] Python dependencies installed successfully ✓"
      fi
    else
      echo "[backend] Python venv up to date — skipping poetry install"
    fi
  else
    echo ""
    echo "[backend] Poetry not found — skipping Python dependency installation."
    echo "[backend] To use the backend, install Poetry:"
    echo "[backend]   curl -sSL https://install.python-poetry.org | python3 -"
    echo "[backend]   brew install poetry          (macOS)"
    echo "[backend]   pipx install poetry           (any OS)"
    echo "[backend] Then run:  cd $SUBMODULE_DIR && poetry install"
  fi
fi
