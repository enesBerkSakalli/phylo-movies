#!/usr/bin/env bash
set -euo pipefail

# Recreate the norovirus source snapshot through the pinned Nextstrain/Augur
# workflow, then lock the result to the accession versions retained by the
# Phylo-Movies publication archive.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOW_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"

NEXTSTRAIN_NOROVIRUS_REPO="${NEXTSTRAIN_NOROVIRUS_REPO:-https://github.com/nextstrain/norovirus.git}"
NEXTSTRAIN_NOROVIRUS_COMMIT="${NEXTSTRAIN_NOROVIRUS_COMMIT:-bce398d15a14c82a2a8c3574da289205e2c5844f}"
WORK_DIR="${WORK_DIR:-${REPO_ROOT}/publication_data/recombination_norovirus/runs/nextstrain_augur_source_rebuild}"
THREADS="${THREADS:-1}"
NEXTSTRAIN_RUNTIME="${NEXTSTRAIN_RUNTIME:-ambient}"

if [[ -d "${REPO_ROOT}/.venv-publication" ]]; then
  # Prefer the project-local publication venv created for the macOS native toolchain.
  export PATH="${REPO_ROOT}/.venv-publication/bin:${PATH}"
fi

LOCKED_ACCESSION_VERSIONS="${WORKFLOW_ROOT}/01_raw/full_genome_accession_versions.txt"
RAW_FASTA="${WORKFLOW_ROOT}/01_raw/full_genome_sequences.fasta"
RAW_METADATA="${WORKFLOW_ROOT}/metadata/full_genome_metadata.tsv"
SUBSAMPLED_FASTA="${WORKFLOW_ROOT}/01_raw/subsampled_350.fasta"
SUBSAMPLED_METADATA="${WORKFLOW_ROOT}/metadata/subsampled_350_metadata.tsv"
ALIGNED_FASTA="${WORKFLOW_ROOT}/02_aligned/subsampled_350_aligned.fasta"
TRIMMED_FASTA="${WORKFLOW_ROOT}/03_trimmed/subsampled_350_gappyout.fasta"
FINAL_FASTA="${WORKFLOW_ROOT}/03_trimmed/subsampled_350_gappyout_final.fasta"

mkdir -p "$WORK_DIR" \
  "${WORKFLOW_ROOT}/01_raw" \
  "${WORKFLOW_ROOT}/02_aligned" \
  "${WORKFLOW_ROOT}/03_trimmed" \
  "${WORKFLOW_ROOT}/metadata" \
  "${WORKFLOW_ROOT}/logs"

if [[ ! -d "${WORK_DIR}/norovirus/.git" ]]; then
  git clone "$NEXTSTRAIN_NOROVIRUS_REPO" "${WORK_DIR}/norovirus"
fi

git -C "${WORK_DIR}/norovirus" fetch --tags origin
git -C "${WORK_DIR}/norovirus" checkout "$NEXTSTRAIN_NOROVIRUS_COMMIT"

echo "[nextstrain] rebuilding ingest outputs at ${NEXTSTRAIN_NOROVIRUS_COMMIT}"
nextstrain build "--${NEXTSTRAIN_RUNTIME}" "${WORK_DIR}/norovirus/ingest" \
  --configfile defaults/config.yaml defaults/nextclade_config.yaml \
  --cores "$THREADS"

echo "[augur] locking Nextstrain ingest output to retained accession versions"
python3 "${SCRIPT_DIR}/select_locked_nextstrain_snapshot.py" \
  --accession-versions "$LOCKED_ACCESSION_VERSIONS" \
  --nextstrain-sequences "${WORK_DIR}/norovirus/ingest/results/sequences.fasta" \
  --nextstrain-metadata "${WORK_DIR}/norovirus/ingest/results/metadata.tsv" \
  --output-sequences "$RAW_FASTA" \
  --output-metadata "$RAW_METADATA"

sed 's/\.[0-9][0-9]*$//' "$LOCKED_ACCESSION_VERSIONS" > "${WORKFLOW_ROOT}/01_raw/full_genome_accessions.txt"

echo "[augur] stratified subsampling"
augur filter \
  --sequences "$RAW_FASTA" \
  --metadata "$RAW_METADATA" \
  --group-by year VP1_nextclade country \
  --subsample-max-sequences 350 \
  --output "$SUBSAMPLED_FASTA" \
  --output-metadata "$SUBSAMPLED_METADATA" \
  > "${WORKFLOW_ROOT}/logs/augur_filter.log" \
  2>&1

echo "[mafft] aligning subsampled sequences"
mafft --auto --thread "$THREADS" "$SUBSAMPLED_FASTA" \
  > "$ALIGNED_FASTA" \
  2> "${WORKFLOW_ROOT}/logs/mafft.log"

echo "[trimal] trimming alignment"
trimal -in "$ALIGNED_FASTA" -out "$TRIMMED_FASTA" -gappyout

echo "[metadata] creating final taxon IDs and CSV metadata"
(
  cd "$WORKFLOW_ROOT"
  cp metadata/full_genome_metadata.tsv full_genome_metadata.tsv
  cp 03_trimmed/subsampled_350_gappyout.fasta subsampled_350_gappyout.fasta
  python3 scripts/rename_sequences.py
  mv subsampled_350_gappyout_final.fasta "$FINAL_FASTA"
  mv subsampled_350_metadata.csv metadata/subsampled_350_metadata.csv
  rm -f full_genome_metadata.tsv subsampled_350_gappyout.fasta
)

echo "[verify] source snapshot checksums"
(
  cd "${REPO_ROOT}/publication_data/recombination_norovirus"
  shasum -a 256 -c MANIFEST.sha256
)
