#!/usr/bin/env bash
set -euo pipefail

RUN_DIR=""
EXPECTED_RANKED=2
INTERVAL_SECONDS=300
PID_TO_WATCH=""

usage() {
  cat <<'USAGE'
Usage:
  monitor_bootstrap_run.sh --run-dir PATH [--expected-ranked N] [--interval SECONDS] [--pid PID]

Watches a bootstrap publication run and writes:
  MONITOR.log
  MONITOR_SUMMARY.txt

The monitor exits successfully once the expected ranked all_trees_*.nwk outputs exist.
If --pid is provided and that process exits before the outputs exist, the monitor exits
with a failure summary.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-dir)
      RUN_DIR="${2:-}"
      shift 2
      ;;
    --expected-ranked)
      EXPECTED_RANKED="${2:-}"
      shift 2
      ;;
    --interval)
      INTERVAL_SECONDS="${2:-}"
      shift 2
      ;;
    --pid)
      PID_TO_WATCH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$RUN_DIR" ]]; then
  echo "--run-dir is required" >&2
  exit 2
fi

if [[ ! -d "$RUN_DIR" ]]; then
  echo "Run directory does not exist: $RUN_DIR" >&2
  exit 2
fi

LOG_FILE="$RUN_DIR/MONITOR.log"
SUMMARY_FILE="$RUN_DIR/MONITOR_SUMMARY.txt"

count_ranked_outputs() {
  find "$RUN_DIR" -path '*/ranked/all_trees_*.nwk' -type f 2>/dev/null | wc -l | awk '{print $1}'
}

count_treefiles() {
  find "$RUN_DIR" -path '*/trees/rep_*/*.treefile' -type f 2>/dev/null | wc -l | awk '{print $1}'
}

write_summary() {
  local status="$1"
  local ranked_count="$2"
  local treefile_count="$3"
  {
    echo "status=$status"
    echo "completed_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "run_dir=$RUN_DIR"
    echo "ranked_outputs=$ranked_count"
    echo "expected_ranked_outputs=$EXPECTED_RANKED"
    echo "treefiles=$treefile_count"
    if [[ -n "$PID_TO_WATCH" ]]; then
      echo "watched_pid=$PID_TO_WATCH"
    fi
    echo
    echo "ranked_files:"
    find "$RUN_DIR" -path '*/ranked/all_trees_*.nwk' -type f 2>/dev/null | sort
    echo
    echo "annotation_support_kinds:"
    find "$RUN_DIR" -path '*/ranked/all_trees_*.nwk' -type f -print0 2>/dev/null \
      | xargs -0 grep -h -o 'support_kind=[^]]*' 2>/dev/null \
      | sort -u || true
    echo
    echo "annotation_labels:"
    find "$RUN_DIR" -path '*/ranked/all_trees_*.nwk' -type f -print0 2>/dev/null \
      | xargs -0 grep -h -o 'label=[^];]*' 2>/dev/null \
      | sort -u || true
  } > "$SUMMARY_FILE"
}

echo "$(date '+%Y-%m-%d %H:%M:%S') monitor started: run_dir=$RUN_DIR expected_ranked=$EXPECTED_RANKED interval=${INTERVAL_SECONDS}s pid=${PID_TO_WATCH:-none}" >> "$LOG_FILE"

while true; do
  ranked_count="$(count_ranked_outputs)"
  treefile_count="$(count_treefiles)"
  echo "$(date '+%Y-%m-%d %H:%M:%S') ranked_outputs=$ranked_count/$EXPECTED_RANKED treefiles=$treefile_count" >> "$LOG_FILE"

  if [[ "$ranked_count" -ge "$EXPECTED_RANKED" ]]; then
    write_summary "completed" "$ranked_count" "$treefile_count"
    echo "$(date '+%Y-%m-%d %H:%M:%S') monitor completed" >> "$LOG_FILE"
    exit 0
  fi

  if [[ -n "$PID_TO_WATCH" ]] && ! ps -p "$PID_TO_WATCH" >/dev/null 2>&1; then
    write_summary "failed_process_exited_before_outputs" "$ranked_count" "$treefile_count"
    echo "$(date '+%Y-%m-%d %H:%M:%S') watched process exited before expected outputs were present" >> "$LOG_FILE"
    exit 1
  fi

  sleep "$INTERVAL_SECONDS"
done
