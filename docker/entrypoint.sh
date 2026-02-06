#!/bin/sh
# ==============================================================================
#  Phylo-Movies Docker entrypoint
#
#  Starts the Flask backend on port 5002, then nginx on port 8080
#  proxying /treedata, /stream, /msa, /about to Flask.
# ==============================================================================
set -e

echo "[entrypoint] Starting BranchArchitect backend..."
cd /app/engine/BranchArchitect
PYTHONPATH="/app/engine/BranchArchitect:$PYTHONPATH" \
  poetry run python webapp/run.py --host=0.0.0.0 --port=5002 &

# Wait for backend to be ready
echo "[entrypoint] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5002/about >/dev/null 2>&1; then
    echo "[entrypoint] Backend is ready!"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "[entrypoint] ERROR: Backend failed to start within 30s"
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] Starting nginx on port 8080..."
exec nginx -g 'daemon off;'
