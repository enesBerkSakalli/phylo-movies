#!/usr/bin/env bash

# SSE smoke test: start backend, POST a tiny Newick file, then read the
# returned progress channel until the complete event arrives.

set -euo pipefail

PORT="${1:-5200}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT}/../engine/BranchArchitect"
LOG_FILE="/tmp/brancharchitect-sse-test.log"
TREE_FILE="$(mktemp /tmp/brancharchitect-sse-tree.XXXXXX.nwk)"
STREAM_FILE="$(mktemp /tmp/brancharchitect-sse-stream.XXXXXX.log)"

cd "$BACKEND_DIR"

printf '((A:1,B:1):1,C:1);\n(A:1,(B:1,C:1):1);\n' >"$TREE_FILE"

echo "[sse-test] starting backend on port ${PORT}..."
PYTHONUNBUFFERED=1 poetry run python webapp/run.py --host 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
PID=$!
trap 'kill "$PID" >/dev/null 2>&1 || true; rm -f "$TREE_FILE" "$STREAM_FILE"' EXIT

for _ in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:${PORT}/about" >/dev/null; then
    break
  fi
  sleep 1
done

curl --silent --fail "http://127.0.0.1:${PORT}/about" >/dev/null

echo "[sse-test] starting tree processing ..."
RESPONSE="$(
  curl --silent --fail \
    -F "treeFile=@${TREE_FILE};filename=sse_smoke.nwk" \
    -F "windowSize=1" \
    -F "windowStepSize=1" \
    "http://127.0.0.1:${PORT}/treedata/stream"
)"

CHANNEL_ID="$(
  RESPONSE="$RESPONSE" python - <<'PY'
import json
import os

print(json.loads(os.environ["RESPONSE"])["channel_id"])
PY
)"

echo "[sse-test] reading /stream/progress/${CHANNEL_ID} ..."
curl --silent --no-buffer --fail --max-time 30 \
  "http://127.0.0.1:${PORT}/stream/progress/${CHANNEL_ID}" \
  | tee "$STREAM_FILE"

if ! grep -q '^event: complete' "$STREAM_FILE"; then
  echo "[sse-test] missing complete event" >&2
  echo "[sse-test] backend log:" >&2
  tail -80 "$LOG_FILE" >&2
  exit 1
fi

echo "[sse-test] success"
