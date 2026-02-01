#!/bin/zsh

# Frontend Server Startup Script
# Starts the Vite frontend development server independently

# Kill any existing processes on port 5173
lsof -ti :5173 | xargs kill -9 2>/dev/null

# Check if port 5173 (frontend) is available
if lsof -i :5173 | grep LISTEN; then
  echo "[frontend] ERROR: Port 5173 is already in use. Please free it and try again."
  exit 1
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "[frontend] Current working directory: $(pwd)"

# Start Vite frontend dev server
echo "[frontend] Starting Vite frontend dev server..."

# Explicitly change directory before npm install and npm run dev
if [ ! -d "node_modules" ]; then
  echo "[frontend] node_modules not found, running npm install..."
  npm install
else
  echo "[frontend] node_modules found, skipping npm install."
fi

echo "[frontend] Current working directory before npm run dev: $(pwd)"

# Start the frontend server
npm run dev -- --port 5173 --no-open --clearScreen false >vite.log 2>&1 </dev/null &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "[frontend] Waiting for frontend to start..."
for i in {1..20}; do
  if lsof -i :5173 | grep -q LISTEN; then
    echo "[frontend] Frontend is ready!"
    break
  fi
  if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "[frontend] ERROR: Frontend process failed to start"
    echo "[frontend] --- Frontend logs ---"
    cat vite.log
    exit 1
  fi
  echo "[frontend] Waiting for frontend... ($i/20)"
  sleep 1
done

if ! lsof -i :5173 | grep -q LISTEN; then
  echo "[frontend] ERROR: Frontend failed to start within 20 seconds"
  kill $FRONTEND_PID 2>/dev/null
  echo "[frontend] --- Frontend logs ---"
  cat vite.log
  exit 1
fi

# Cleanup function
cleanup() {
  echo "[frontend] Cleaning up..."
  if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
    kill $FRONTEND_PID 2>/dev/null
  fi
  wait $FRONTEND_PID 2>/dev/null
}

# Trap cleanup on SIGINT (Ctrl+C), SIGTERM, and EXIT
trap cleanup SIGINT SIGTERM EXIT

echo "[frontend] Frontend PID: $FRONTEND_PID"
echo "[frontend] Frontend development server is running. Press Ctrl+C to stop."
echo "[frontend] Vite frontend: http://127.0.0.1:5173/"
echo "[frontend] Frontend logs are being written to vite.log"

# Keep the script running
wait $FRONTEND_PID || true
