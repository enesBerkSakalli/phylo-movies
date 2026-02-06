#!/bin/bash

# Frontend & Engine Server Startup Script
# Starts the Vite frontend development server and ensures BranchArchitect engine is running

set -e  # Exit on error (disabled for specific commands below)

# Kill any existing processes on port 5173
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
sleep 1  # Give OS time to release the port

# Check if port 5173 (frontend) is available
if lsof -i :5173 | grep LISTEN; then
  echo "[frontend] ERROR: Port 5173 is already in use. Please free it and try again."
  exit 1
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "[frontend] Current working directory: $(pwd)"

# ============================================================================
# PREREQUISITES CHECK: Ensure Node.js and npm are installed
# ============================================================================

if ! command -v node &> /dev/null; then
  echo "[prereq] ERROR: Node.js is not installed."
  echo "[prereq] Please install Node.js from https://nodejs.org/ (LTS recommended)"
  echo "[prereq] Or use a version manager:"
  echo "[prereq]   - nvm: https://github.com/nvm-sh/nvm"
  echo "[prereq]   - brew install node (macOS)"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "[prereq] ERROR: npm is not installed."
  echo "[prereq] npm usually comes with Node.js. Please reinstall Node.js."
  exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "[prereq] Node.js $NODE_VERSION and npm v$NPM_VERSION detected"

# ============================================================================
# ENGINE SETUP: Check and start BranchArchitect Flask server
# ============================================================================

ENGINE_DIR="$PROJECT_ROOT/engine/BranchArchitect"
ENGINE_REPO="https://github.com/EnesSakalliUniWien/BranchArchitect.git"
ENGINE_PORT=5002

echo "[engine] Checking if BranchArchitect engine exists at $ENGINE_DIR..."

# Initialise the git submodule if the directory is empty or missing key files
if [ ! -f "$ENGINE_DIR/pyproject.toml" ]; then
  echo "[engine] BranchArchitect submodule not initialised. Running git submodule update..."
  cd "$PROJECT_ROOT"
  git submodule update --init --recursive
  if [ $? -ne 0 ]; then
    echo "[engine] ERROR: Failed to initialise BranchArchitect submodule."
    echo "[engine] You can also try: git clone --recurse-submodules <repo-url>"
    exit 1
  fi
  echo "[engine] Successfully initialised BranchArchitect submodule"
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
  echo "[engine] ERROR: Poetry is not installed."
  echo "[engine] Please install Poetry using one of these methods:"
  echo "[engine]   - Official installer: curl -sSL https://install.python-poetry.org | python3 -"
  echo "[engine]   - Homebrew (macOS):  brew install poetry"
  echo "[engine]   - pipx:              pipx install poetry"
  echo "[engine] After installing, restart your terminal and run this script again."
  exit 1
fi

# Install Python dependencies (always run - it's fast if nothing changed)
echo "[engine] Installing Python dependencies with Poetry..."
cd "$ENGINE_DIR"
poetry install --no-interaction
if [ $? -ne 0 ]; then
  echo "[engine] ERROR: Failed to install Python dependencies"
  exit 1
fi
echo "[engine] Python dependencies installed successfully"
cd "$PROJECT_ROOT"

# Check if Flask server is already running on port 5002
if lsof -i :$ENGINE_PORT | grep -q LISTEN; then
  echo "[engine] Flask server is already running on port $ENGINE_PORT"
else
  echo "[engine] Flask server not running. Starting it..."

  # Check if start_movie_server.sh exists
  if [ ! -f "$ENGINE_DIR/start_movie_server.sh" ]; then
    echo "[engine] ERROR: start_movie_server.sh not found in $ENGINE_DIR"
    exit 1
  fi

  # Start the Flask server in the background
  cd "$ENGINE_DIR"
  chmod +x start_movie_server.sh
  ./start_movie_server.sh >engine.log 2>&1 &
  ENGINE_PID=$!

  echo "[engine] Flask server starting (PID: $ENGINE_PID)..."

  # Wait for engine to be ready
  echo "[engine] Waiting for Flask server to start on port $ENGINE_PORT..."
  for i in {1..30}; do
    if lsof -i :$ENGINE_PORT | grep -q LISTEN; then
      echo "[engine] Flask server is ready!"
      break
    fi
    if ! kill -0 $ENGINE_PID 2>/dev/null; then
      echo "[engine] ERROR: Flask server process failed to start"
      echo "[engine] --- Engine logs ---"
      cat engine.log
      exit 1
    fi
    echo "[engine] Waiting for Flask server... ($i/30)"
    sleep 1
  done

  if ! lsof -i :$ENGINE_PORT | grep -q LISTEN; then
    echo "[engine] ERROR: Flask server failed to start within 30 seconds"
    kill $ENGINE_PID 2>/dev/null
    echo "[engine] --- Engine logs ---"
    cat engine.log
    exit 1
  fi
fi

# Return to project root
cd "$PROJECT_ROOT"

echo "[engine] Engine is ready on http://127.0.0.1:$ENGINE_PORT"

# ============================================================================
# FRONTEND SETUP: Start Vite frontend dev server
# ============================================================================
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
  echo ""
  echo "[cleanup] Shutting down services..."
  if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "[cleanup] Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
  fi
  if [ -n "$ENGINE_PID" ] && kill -0 $ENGINE_PID 2>/dev/null; then
    echo "[cleanup] Stopping engine (PID: $ENGINE_PID)..."
    kill $ENGINE_PID 2>/dev/null
  fi
  wait 2>/dev/null
  echo "[cleanup] Done"
}

# Trap cleanup on SIGINT (Ctrl+C), SIGTERM, and EXIT
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "========================================================================="
echo "[info] PhyloMovies Development Environment Ready"
echo "========================================================================="
echo "[frontend] PID: $FRONTEND_PID"
echo "[engine]   Flask server running on http://127.0.0.1:5002"
echo "[frontend] Vite frontend running on http://127.0.0.1:5173"
echo ""
echo "[logs] Frontend logs: vite.log"
echo "[logs] Engine logs: engine/BranchArchitect/engine.log"
echo ""
echo "Press Ctrl+C to stop all services."
echo "========================================================================="
echo ""

# Keep the script running
wait $FRONTEND_PID || true
