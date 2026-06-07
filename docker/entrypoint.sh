#!/bin/sh
# ==============================================================================
#  Phylo-Movies Docker entrypoint
#
#  Starts the Flask backend on port 5002, then nginx on port 8080
#  proxying /treedata, /stream, /msa, /health, /about to Flask.
# ==============================================================================
set -eu

BACKEND_PID=""
NGINX_PID=""
MONITOR_PID=""
STOPPING=0

is_running() {
  pid="$1"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null
}

cleanup() {
  if [ "$STOPPING" = "1" ]; then
    return
  fi
  STOPPING=1
  echo "[entrypoint] Shutting down services..."
  if [ -n "$MONITOR_PID" ] && is_running "$MONITOR_PID"; then
    kill "$MONITOR_PID" 2>/dev/null || true
  fi
  if [ -n "$NGINX_PID" ] && is_running "$NGINX_PID"; then
    kill "$NGINX_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ] && is_running "$BACKEND_PID"; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  [ -n "$MONITOR_PID" ] && wait "$MONITOR_PID" 2>/dev/null || true
  [ -n "$NGINX_PID" ] && wait "$NGINX_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && wait "$BACKEND_PID" 2>/dev/null || true
}

trap cleanup EXIT
trap 'cleanup; exit 143' TERM
trap 'cleanup; exit 130' INT

echo "[entrypoint] Starting BranchArchitect backend..."
cd /app/engine/BranchArchitect
PYTHONPATH="/app/engine/BranchArchitect:${PYTHONPATH:-}" \
  poetry run python webapp/run.py --host=0.0.0.0 --port=5002 &
BACKEND_PID="$!"

# Wait for backend to be ready
echo "[entrypoint] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5002/health >/dev/null 2>&1; then
    echo "[entrypoint] Backend is ready!"
    break
  fi
  if ! is_running "$BACKEND_PID"; then
    echo "[entrypoint] ERROR: Backend exited during startup"
    wait "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi
  if [ "$i" = "30" ]; then
    echo "[entrypoint] ERROR: Backend failed to start within 30s"
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] Starting nginx on port 8080..."
nginx -g 'daemon off;' &
NGINX_PID="$!"

echo "[entrypoint] Services are running."
(
  failures=0
  while :; do
    if ! curl -sf http://127.0.0.1:5002/health >/dev/null 2>&1; then
      failures=$((failures + 1))
      echo "[entrypoint] Backend health check failed ($failures/3)"
      if [ "$failures" -ge 3 ]; then
        echo "[entrypoint] ERROR: Backend health check failed repeatedly; stopping nginx"
        kill "$NGINX_PID" 2>/dev/null || true
        exit 1
      fi
    else
      failures=0
    fi
    sleep 5
  done
) &
MONITOR_PID="$!"

set +e
wait "$NGINX_PID"
NGINX_STATUS="$?"
set -e
echo "[entrypoint] nginx exited with status $NGINX_STATUS"
exit "$NGINX_STATUS"
