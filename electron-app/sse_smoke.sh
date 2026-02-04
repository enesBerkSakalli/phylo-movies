#!/usr/bin/env bash

# SSE smoke test: start backend, hit /stream/test, then clean up.

set -euo pipefail

PORT="${1:-5200}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT}/BranchArchitect"
LOG_FILE="/tmp/brancharchitect-sse-test.log"

cd "$BACKEND_DIR"

echo "[sse-test] starting backend on port ${PORT}..."
PYTHONUNBUFFERED=1 poetry run python webapp/run.py --host 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT

sleep 2

echo "[sse-test] hitting /stream/test ..."
curl -N --fail --max-time 20 "http://127.0.0.1:${PORT}/stream/test"

echo "[sse-test] success"
