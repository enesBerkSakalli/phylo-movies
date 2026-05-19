#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PY_SCRIPT="${SCRIPT_DIR}/generate_bootstrap_order.py"
ENV_FILE="${REPO_ROOT}/publication_data/publication_data.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

SOURCE_ROOT="${ROGUE_TAXA_SOURCE_ROOT:-${BOOTSTRAP_SOURCE_ROOT:-${REPO_ROOT}/publication_data/bootstrap_rogue_taxa/source_alignments}}"
OUTPUT_BASE="${BOOTSTRAP_OUTPUT_BASE:-${REPO_ROOT}/publication_data/bootstrap_rogue_taxa/runs}"
CONDA_ENV="${PHYLOMOVIES_PUBLICATION_ENV:-${PHYLOMOVIES_RAXML_ENV:-phylomovies-publication}}"

TREE_PROGRAM="iqtree"
IQTREE_MODE="default"
IQTREE_MODE_SET="0"
REPLICATES="${BOOTSTRAP_REPLICATES:-200}"
THREADS="1"
JOBS="1"
SEED="${BOOTSTRAP_SEED:-42}"
RUN_LABEL=""
DATASETS=("24" "125")

usage() {
  cat <<'EOF'
Usage:
  run_bootstrap_rogue_taxa.sh [options]

Default:
  Regenerate both rogue-taxon examples (datasets 24 and 125) using:
    RAxML -f j for bootstrap replicate MSAs
    IQ-TREE 2 for per-replicate tree inference
    corrected composition-distance ordering

Options:
  --smoke                 Run 2 replicates instead of 200; uses IQ-TREE fast mode unless --iqtree-mode is set.
  --replicates N          Number of bootstrap replicate MSAs.
  --threads N             Threads per tree-inference run.
  --jobs N                Number of concurrent replicate tree-inference jobs.
  --seed N                Random seed.
  --dataset ID            Dataset under source root. Repeatable. Also accepts NAME=PATH.
  --source-root DIR       Directory containing source alignment files.
  --output-base DIR       Base output directory.
  --run-label LABEL       Optional short label appended to the run directory name.
  --tree-program NAME     iqtree or fasttree. Default: iqtree.
  --iqtree-mode MODE      default or fast. Default: default.
  --conda-env NAME        Conda env containing RAxML, IQ-TREE, FastTree, and Python deps.
                          Default: phylomovies-publication.
  -h, --help              Show this help.

Examples:
  ./run_bootstrap_rogue_taxa.sh --smoke
  ./run_bootstrap_rogue_taxa.sh --replicates 200 --tree-program iqtree
  ./run_bootstrap_rogue_taxa.sh --smoke --tree-program fasttree
EOF
}

DATASET_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --smoke)
      REPLICATES="2"
      shift
      ;;
    --replicates)
      REPLICATES="$2"
      shift 2
      ;;
    --threads)
      THREADS="$2"
      shift 2
      ;;
    --jobs)
      JOBS="$2"
      shift 2
      ;;
    --seed)
      SEED="$2"
      shift 2
      ;;
    --dataset)
      DATASET_ARGS+=("$2")
      shift 2
      ;;
    --source-root)
      SOURCE_ROOT="$2"
      shift 2
      ;;
    --output-base)
      OUTPUT_BASE="$2"
      shift 2
      ;;
    --run-label)
      RUN_LABEL="$2"
      shift 2
      ;;
    --tree-program)
      TREE_PROGRAM="$2"
      shift 2
      ;;
    --iqtree-mode)
      IQTREE_MODE="$2"
      IQTREE_MODE_SET="1"
      shift 2
      ;;
    --conda-env)
      CONDA_ENV="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ${#DATASET_ARGS[@]} -gt 0 ]]; then
  DATASETS=("${DATASET_ARGS[@]}")
fi

if [[ "${REPLICATES}" == "2" && "${TREE_PROGRAM}" == "iqtree" && "${IQTREE_MODE_SET}" == "0" ]]; then
  IQTREE_MODE="fast"
fi

if ! command -v conda >/dev/null 2>&1; then
  echo "conda is required so raxmlHPC can be found in ${CONDA_ENV}." >&2
  exit 1
fi

CONDA_ENV_PREFIX="$(
  conda run -n "${CONDA_ENV}" python -c 'from pathlib import Path; import sys; print(Path(sys.executable).resolve().parents[1])'
)"

CMD=(
  conda run -n "${CONDA_ENV}" env "PATH=${CONDA_ENV_PREFIX}/bin:${PATH}" python "${PY_SCRIPT}"
  --source-root "${SOURCE_ROOT}"
  --output-base "${OUTPUT_BASE}"
  --tree-program "${TREE_PROGRAM}"
  --iqtree-mode "${IQTREE_MODE}"
  --n-replicates "${REPLICATES}"
  --threads "${THREADS}"
  --jobs "${JOBS}"
  --seed "${SEED}"
  --raxml-hpc-bin "${CONDA_ENV_PREFIX}/bin/raxmlHPC"
  --iqtree-bin "${CONDA_ENV_PREFIX}/bin/iqtree2"
  --fasttree-bin "${CONDA_ENV_PREFIX}/bin/FastTree"
)

if [[ -n "${RUN_LABEL}" ]]; then
  CMD+=(--run-label "${RUN_LABEL}")
fi

for dataset in "${DATASETS[@]}"; do
  CMD+=(--dataset "${dataset}")
done

echo "Running bootstrap ordering workflow"
echo "  datasets: ${DATASETS[*]}"
echo "  tree program: ${TREE_PROGRAM}"
  echo "  IQ-TREE mode: ${IQTREE_MODE}"
  echo "  replicates: ${REPLICATES}"
  echo "  threads per job: ${THREADS}"
  echo "  concurrent jobs: ${JOBS}"
if [[ -n "${RUN_LABEL}" ]]; then
  echo "  run label: ${RUN_LABEL}"
fi
echo "  source root: ${SOURCE_ROOT}"
echo "  output base: ${OUTPUT_BASE}"
echo

cd "${REPO_ROOT}"
exec "${CMD[@]}"
