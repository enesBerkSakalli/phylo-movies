#!/usr/bin/env bash
set -euo pipefail

# Rebuild the norovirus ReCAN validation analysis.
#
# Default behavior:
#   1. regenerate the source-layer ReCAN working subset from the canonical publication alignment
#   2. run the sliding-window analysis into a timestamped runs/run_* directory
#
# Use SKIP_SUBSET=1 to keep the existing source-layer working subset.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
ENV_FILE="${REPO_ROOT}/publication_data/publication_data.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

cd "$SCRIPT_DIR"

resolve_python() {
  if [[ -n "${PYTHON:-}" ]]; then
    printf '%s\n' "$PYTHON"
    return
  fi

  if [[ -n "${CONDA_PREFIX:-}" && -x "${CONDA_PREFIX}/bin/python" ]]; then
    printf '%s\n' "${CONDA_PREFIX}/bin/python"
    return
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return
  fi

  echo "ERROR: could not find a Python interpreter. Run via conda or set PYTHON=/path/to/python." >&2
  return 1
}

PYTHON_BIN="$(resolve_python)"
PYTHON_EXE="$("$PYTHON_BIN" -c 'import sys; print(sys.executable)')"
echo "[recombination] python: ${PYTHON_EXE}"

"$PYTHON_BIN" - <<'PY'
import importlib.util
import sys

missing = [
    module
    for module in ("Bio", "matplotlib", "pandas", "recan")
    if importlib.util.find_spec(module) is None
]

if missing:
    print(
        "ERROR: missing Python dependencies: " + ", ".join(missing) + "\n"
        "Install them with:\n"
        "  python -m pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1)
PY

if [[ "${SKIP_SUBSET:-0}" != "1" ]]; then
  echo "[recombination] rebuilding source-layer ReCAN working subset"
  "$PYTHON_BIN" build_recan_working_subset.py
fi

echo "[recombination] running ReCAN sliding-window analysis"
"$PYTHON_BIN" run_recan_sliding_window.py "$@"
