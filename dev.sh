#!/bin/zsh
lsof -ti :5002 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
lsof -ti :3001 | xargs kill -9 2>/dev/null

# Check if port 5002 (backend) is available
if lsof -i :5002 | grep LISTEN; then
  echo "[dev.sh] ERROR: Port 5002 is already in use. Please free it and try again."
  exit 1
fi

# Check if port 5173 (frontend) is available
if lsof -i :5173 | grep LISTEN; then
  echo "[dev.sh] ERROR: Port 5173 is already in use. Please free it and try again."
  exit 1
fi

# Check if port 3001 (browser logs MCP) is available
if lsof -i :3001 | grep LISTEN; then
  echo "[dev.sh] ERROR: Port 3001 is already in use. Please free it and try again."
  exit 1
fi

# Start the Flask backend using poetry
echo "[dev.sh] Installing backend dependencies with poetry..."
(cd backend && poetry install)
echo "[dev.sh] Checking brancharchitect version..."
BRANCHARCHITECT_VERSION=$(cd backend && poetry run pip list | grep brancharchitect | awk '{print $2}')
echo "[dev.sh] Using brancharchitect version: $BRANCHARCHITECT_VERSION"
echo "[dev.sh] Starting Browser Logs MCP server..."
(cd backend/browser-logs-mcp && node dist/index.js) &
BROWSER_LOGS_PID=$!

echo "[dev.sh] Starting Flask backend with poetry (using run.py)..."
(cd backend && poetry run python run.py --host=127.0.0.1 --port=5002) &
BACKEND_PID=$!

# Wait for backend to be ready
echo "[dev.sh] Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:5002/about >/dev/null 2>&1; then
    echo "[dev.sh] Backend is ready!"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "[dev.sh] ERROR: Backend process died during startup"
    exit 1
  fi
  echo "[dev.sh] Waiting for backend... ($i/30)"
  sleep 1
done

if ! curl -s http://127.0.0.1:5002/about >/dev/null 2>&1; then
  echo "[dev.sh] ERROR: Backend failed to start within 30 seconds"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo "[dev.sh] Starting Vite frontend dev server..."
if [ ! -d "frontend/node_modules" ]; then
  echo "[dev.sh] node_modules not found in frontend/, running npm install..."
  (cd frontend && npm install)
else
  echo "[dev.sh] node_modules found in frontend/, skipping npm install."
fi

npm run dev --prefix frontend -- --port 5173 --host 127.0.0.1 --no-open --clearScreen false >frontend.log 2>&1 </dev/null &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "[dev.sh] Waiting for frontend to start..."
for i in {1..20}; do
  if curl -s http://127.0.0.1:5173/ >/dev/null 2>&1; then
    echo "[dev.sh] Frontend is ready!"
    break
  fi
  if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "[dev.sh] ERROR: Frontend process failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
  echo "[dev.sh] Waiting for frontend... ($i/20)"
  sleep 1
done

if ! curl -s http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo "[dev.sh] ERROR: Frontend failed to start within 20 seconds"
  kill $FRONTEND_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  echo "[dev.sh] --- Frontend logs ---"
  cat frontend.log
  exit 1
fi

# Trap to kill both background processes on exit (Ctrl+C or error)

cleanup() {
  echo "[dev.sh] Cleaning up..."
  if kill -0 $FRONTEND_PID 2>/dev/null; then kill $FRONTEND_PID 2>/dev/null; fi
  if kill -0 $BACKEND_PID 2>/dev/null; then kill $BACKEND_PID 2>/dev/null; fi
  if kill -0 $BROWSER_LOGS_PID 2>/dev/null; then kill $BROWSER_LOGS_PID 2>/dev/null; fi
  wait $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID 2>/dev/null
  wait $BROWSER_LOGS_PID 2>/dev/null
}
# Trap cleanup on SIGINT (Ctrl+C), SIGTERM, and EXIT
trap cleanup SIGINT SIGTERM EXIT

echo "[dev.sh] Frontend PID: $FRONTEND_PID, Backend PID: $BACKEND_PID, Browser Logs MCP PID: $BROWSER_LOGS_PID"
echo "[dev.sh] All servers are running. Press Ctrl+C to stop."
echo "[dev.sh] Flask backend: http://127.0.0.1:5002/"
echo "[dev.sh] Vite frontend: http://127.0.0.1:5173/"
echo "[dev.sh] Browser Logs MCP: http://127.0.0.1:3001/"
echo "[dev.sh] Browser Logs Test Page: http://127.0.0.1:3001/test-page.html"

wait || true
