#!/bin/bash
# test-build.sh - Complete test & build verification pipeline
# Usage: ./scripts/test-build.sh [--quick|--full|--electron]

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/engine/BranchArchitect"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"

# Parse arguments
MODE="${1:---quick}"

echo -e "${BLUE}=========================================="
echo "  Phylo-Movies Test & Build Pipeline"
echo "  Mode: $MODE"
echo -e "==========================================${NC}"

# Track timing
START_TIME=$(date +%s)

step() {
    echo -e "\n${YELLOW}[$1] $2${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

fail() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# =============================================================================
# STEP 1: Environment Check
# =============================================================================
step "1/7" "Checking environment..."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed"
command -v npm >/dev/null 2>&1 || fail "npm is not installed"
command -v poetry >/dev/null 2>&1 || fail "Poetry is not installed"

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
POETRY_VERSION=$(poetry --version | cut -d' ' -f3)

echo "  Node.js: $NODE_VERSION"
echo "  npm: $NPM_VERSION"
echo "  Poetry: $POETRY_VERSION"
success "Environment OK"

# =============================================================================
# STEP 2: Install Dependencies
# =============================================================================
step "2/7" "Installing dependencies..."

cd "$PROJECT_ROOT"
npm ci --silent 2>/dev/null || npm install --silent
success "Frontend dependencies installed"

cd "$BACKEND_DIR"
poetry install --quiet
success "Backend dependencies installed"

cd "$PROJECT_ROOT"

# =============================================================================
# STEP 3: Frontend Unit Tests
# =============================================================================
step "3/7" "Running frontend unit tests..."

npm run test:unit || fail "Frontend unit tests failed"
success "Frontend unit tests passed"

# =============================================================================
# STEP 4: Backend Tests
# =============================================================================
step "4/7" "Running backend tests..."

cd "$BACKEND_DIR"

if [ "$MODE" == "--quick" ]; then
    # Quick mode: run subset of tests
    poetry run pytest test/ -v --timeout=30 -x -q 2>/dev/null || poetry run pytest test/ -v --timeout=30 -x
else
    # Full mode: run all tests with coverage
    poetry run pytest test/ -v --timeout=60
fi

success "Backend tests passed"
cd "$PROJECT_ROOT"

# =============================================================================
# STEP 5: Build Frontend
# =============================================================================
step "5/7" "Building frontend..."

npm run build || fail "Frontend build failed"
success "Frontend build completed"

# =============================================================================
# STEP 6: Verify Build Output
# =============================================================================
step "6/7" "Verifying build output..."

# Check essential files exist
[ -f "dist/index.html" ] || fail "dist/index.html not found"
[ -d "dist/assets" ] || fail "dist/assets/ not found"

# Count and report bundle sizes
JS_FILES=$(find dist/assets -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null | wc -l | tr -d ' ')

echo "  Files generated:"
echo "    - index.html: $(ls -lh dist/index.html | awk '{print $5}')"
echo "    - JS bundles: $JS_FILES files"
echo "    - CSS files: $CSS_FILES files"

# Report largest bundles
echo "  Largest JS bundles:"
find dist/assets -name "*.js" -exec ls -lh {} \; | sort -k5 -h | tail -3 | awk '{print "    - " $9 ": " $5}'

# Check total bundle size (warn if > 5MB)
TOTAL_SIZE=$(du -sm dist | cut -f1)
if [ "$TOTAL_SIZE" -gt 5 ]; then
    echo -e "${YELLOW}  ⚠ Warning: Total build size is ${TOTAL_SIZE}MB (>5MB)${NC}"
else
    echo "  Total build size: ${TOTAL_SIZE}MB"
fi

success "Build verification passed"

# =============================================================================
# STEP 7: Integration Tests (if backend available)
# =============================================================================
if [ "$MODE" == "--full" ] || [ "$MODE" == "--electron" ]; then
    step "7/7" "Running integration tests..."

    # Start backend server
    echo "  Starting backend server..."
    cd "$BACKEND_DIR"
    ./start_movie_server.sh &
    BACKEND_PID=$!
    cd "$PROJECT_ROOT"

    # Wait for server to be ready
    echo "  Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5002/health >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    # Run integration tests
    npm run test:backend-required || {
        kill $BACKEND_PID 2>/dev/null
        fail "Integration tests failed"
    }

    # Cleanup
    kill $BACKEND_PID 2>/dev/null
    success "Integration tests passed"
else
    step "7/7" "Skipping integration tests (use --full to run)"
fi

# =============================================================================
# ELECTRON BUILD (optional)
# =============================================================================
if [ "$MODE" == "--electron" ]; then
    step "EXTRA" "Building Electron app..."

    cd "$ELECTRON_DIR"

    # Build frontend for Electron
    cd "$PROJECT_ROOT"
    ELECTRON_BUILD=true npm run build
    rm -rf "$ELECTRON_DIR/frontend-dist"
    cp -r dist "$ELECTRON_DIR/frontend-dist"

    # Note: Full Electron build (with PyInstaller) takes ~10min
    echo "  Frontend prepared for Electron"
    echo "  To complete Electron build, run: cd electron-app && ./build.sh mac"

    cd "$PROJECT_ROOT"
    success "Electron preparation complete"
fi

# =============================================================================
# SUMMARY
# =============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}=========================================="
echo "  ✓ All checks passed!"
echo "  Duration: ${DURATION}s"
echo -e "==========================================${NC}"

echo -e "\nNext steps:"
echo "  • Preview build: npm run preview"
echo "  • Deploy to GH Pages: npm run build:gh"
echo "  • Full Electron build: cd electron-app && ./build.sh mac"
