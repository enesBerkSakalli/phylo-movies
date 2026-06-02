#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNS_DIR="${ROOT}/publication_data/bootstrap_rogue_taxa/runs"
LOG="${IQTREE3_RECONCILE_LOG:-${RUNS_DIR}/iqtree3_reconcile_latest.log}"
HEARTBEAT_INTERVAL_SECONDS="${HEARTBEAT_INTERVAL_SECONDS:-60}"

mkdir -p "${RUNS_DIR}"
cd "${ROOT}"

exec >>"${LOG}" 2>&1

START_TS="$(date +%s)"

timestamp() {
  date "+%Y-%m-%dT%H:%M:%S%z"
}

heartbeat() {
  while true; do
    now="$(date +%s)"
    elapsed="$((now - START_TS))"
    latest="$(ls -td "${RUNS_DIR}"/run_*_iqtree3 2>/dev/null | head -1 || true)"
    treefiles="0"
    if [[ -n "${latest}" ]]; then
      treefiles="$(find "${latest}" -name "*.treefile" 2>/dev/null | wc -l | tr -d " ")"
    fi
    active="$(ps -ax -o command | grep -E -c "[/]iqtree3 .*bootstrap_rogue_taxa" || true)"
    echo "[heartbeat] $(timestamp) elapsed=${elapsed}s active_iqtree=${active} treefiles=${treefiles} latest=${latest:-none}"
    sleep "${HEARTBEAT_INTERVAL_SECONDS}"
  done
}

heartbeat &
HEARTBEAT_PID="$!"

cleanup() {
  status="$?"
  kill "${HEARTBEAT_PID}" 2>/dev/null || true
  wait "${HEARTBEAT_PID}" 2>/dev/null || true
  if [[ "${status}" -eq 0 ]]; then
    echo "[exit] $(timestamp) success"
  else
    echo "[exit] $(timestamp) failed status=${status}"
  fi
}
trap cleanup EXIT

echo "[start] $(timestamp) IQ-TREE 3 bootstrap reconciliation pid=$$"

publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/run_bootstrap_rogue_taxa.sh \
  --replicates 200 \
  --jobs 4 \
  --threads 1 \
  --seed 42 \
  --run-label iqtree3

RUN_DIR="$(ls -td "${RUNS_DIR}"/run_*_iqtree3 | head -1)"
echo "[promote] $(timestamp) ${RUN_DIR}"
python3 publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/promote_current_results.py \
  --source-run "${RUN_DIR}"

echo "[fixtures] $(timestamp) regenerating static bootstrap demo payloads"
npm run fixtures:generate:ci -- --fixture demo-bootstrap-24 --fixture demo-bootstrap-125

echo "[recurrence] $(timestamp) regenerating recurrence tables"
npm run publication:spr-recurrence

echo "[checks] $(timestamp) running publication checks"
npm run publication:spr-recurrence:check
npm run publication:data:check

echo "[done] $(timestamp) IQ-TREE 3 bootstrap reconciliation complete"
