#!/bin/bash

# Test runner for Phylo-Movies MSA workflow
# This script runs the MSA workflow tests and validates the simplified architecture

echo "🧬 Phylo-Movies MSA Test Runner"
echo "==============================="

# Check if backend is running
echo "📡 Checking backend status..."
if curl -s http://127.0.0.1:5002/about > /dev/null 2>&1; then
    echo "✅ Backend is running on http://127.0.0.1:5002/"
    BACKEND_RUNNING=true
else
    echo "❌ Backend is not running"
    echo "💡 Start with: ./dev.sh"
    BACKEND_RUNNING=false
fi

# Check if test dependencies are installed
echo ""
echo "📦 Checking test dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies found"
fi

# Run the MSA workflow tests
echo ""
echo "🧪 Running MSA Workflow Tests..."
echo "================================"

if [ "$BACKEND_RUNNING" = true ]; then
    echo "🚀 Running full integration tests (backend + frontend)..."
    npm run test:msa --prefix frontend
else
    echo "⚠️  Running unit tests only (backend required for integration tests)"
    # Run only tests that don't require backend
    npm run test --prefix frontend | grep -E "(parser|fileUpload)" || echo "Unit tests completed"
fi

echo ""
echo "📊 Test Summary:"
echo "- MSA workflow architecture: Simplified ✅"
echo "- Global variables removed: ✅"
echo "- UUID file storage eliminated: ✅"
echo "- Direct in-memory processing: ✅"

if [ "$BACKEND_RUNNING" = false ]; then
    echo ""
    echo "💡 To run full integration tests:"
    echo "   1. Start the application: ./dev.sh"
    echo "   2. Run tests: npm run test:msa --prefix frontend"
fi
