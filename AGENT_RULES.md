# Phylo-Movies Project Rules for AI Agents

## Project Overview

Phylo-Movies is a web application for visualizing phylogenetic trees with Multiple Sequence Alignment (MSA) data. The application consists of a Flask backend and a Vite frontend.

## Project Structure

### Development Scripts

- **`dev.sh`** - Main development script to start both backend and frontend
  - Starts Flask backend on `http://127.0.0.1:5002/`
  - Starts Vite frontend on `http://127.0.0.1:5173/`
  - Includes health checks and automatic port cleanup
  - Use this script for development environment setup

### Backend (`backend/`)

- **Language**: Python (Flask)
- **Architecture**: Poetry-managed project
- **Main entry**: `phylomovie/run.py`
- **Key components**:
  - `routes.py` - Main API endpoints
  - `tree_processing/msa_utils.py` - MSA utility functions (simplified)
  - Uses direct in-memory processing (no UUID-based file storage)

### Frontend (`frontend/`)

- **Language**: JavaScript (React + Vite)
- **Architecture**: React components with MSA viewer integration
- **Key components**:
  - `js/msaViewer/` - MSA visualization components
  - `js/partial/evenHandlers.js` - Event handling logic
  - Direct localStorage-based data flow (simplified)

### Testing (`test/`)

- **Framework**: Mocha + Chai
- **Test files location**: All tests must be in `/test/` directory
- **Key test files**:
  - `msa-workflow.test.js` - Comprehensive MSA workflow tests
  - `integration.test.js` - Frontend/backend integration tests
  - `api.test.js` - API endpoint tests
  - `setup.js` - Test environment setup
  - `test_data/` - Test data files (FASTA, Newick)

## Development Workflow

### Starting the Application

```bash
# Use the main development script
./dev.sh

# Or run individual components:
# Backend: cd backend && poetry run python -m phylomovie.run --host=127.0.0.1 --port=5002
# Frontend: npm run dev --prefix frontend -- --port 5173 --host 127.0.0.1
```

### Running Tests

```bash
# Run all tests
npm run test --prefix frontend

# Run specific test file
npx mocha test/msa-workflow.test.js

# Run tests with watch mode
npm run test:watch --prefix frontend
```

## Architecture Principles

### MSA Processing (Recently Simplified)

- **OLD (Complex)**: UUID-based file storage, global variables, complex fallback chains
- **NEW (Simplified)**: Direct in-memory processing, no global state, clean data flow
- **Data Flow**: Upload → Extract MSA length → Process trees → Return JSON

### Key Simplifications Made

1. **Removed**: Global `LAST_MSA_CONTENT` variable
2. **Removed**: UUID-based temporary file storage
3. **Removed**: Complex MSA fallback logic in frontend
4. **Simplified**: MSA utilities to essential functions only
5. **Streamlined**: Event handlers and sync mechanisms

## Testing Guidelines

### Test Requirements

- All tests must be in `/test/` directory
- Use Mocha/Chai framework
- Include both unit and integration tests
- Test data files in `/test/test_data/`

### MSA Workflow Testing

- Backend must be running for integration tests
- Use `test_data/alltrees.fasta` and `alltrees.trees_cutted.newick`
- Test both successful processing and error cases
- Validate response structure and data integrity

### Test Categories

1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Frontend-backend communication
3. **API Tests**: Endpoint validation
4. **Workflow Tests**: End-to-end MSA processing

## Common Agent Tasks

### When Asked About Project Setup

1. Reference `dev.sh` as the main startup script
2. Explain the Flask (5002) + Vite (5173) architecture
3. Point to test directory structure

### When Asked About Testing

1. Tests are in `/test/` directory
2. Use `npm run test --prefix frontend` to run tests
3. Backend must be running for integration tests
4. Reference `msa-workflow.test.js` for MSA-specific testing

### When Asked About MSA Issues

1. Architecture has been simplified (no global variables)
2. Processing is now direct in-memory
3. No UUID-based file storage
4. Clean data flow: upload → process → response

### When Debugging MSA Problems

1. Check if backend is running (`curl http://127.0.0.1:5002/about`)
2. Verify test data exists (`test/test_data/`)
3. Run MSA workflow test (`npx mocha test/msa-workflow.test.js`)
4. Check for syntax errors in simplified files

## File Locations Reference

### Critical Files

- **Startup**: `./dev.sh`
- **Backend Main**: `backend/phylomovie/routes.py`
- **MSA Utils**: `backend/phylomovie/tree_processing/msa_utils.py`
- **Frontend MSA**: `frontend/js/msaViewer/MSAViewerModal.jsx`
- **Event Handlers**: `frontend/js/partial/evenHandlers.js`

### Test Files

- **Main Test**: `test/msa-workflow.test.js`
- **Test Data**: `test/test_data/alltrees.fasta`, `test/test_data/alltrees.trees_cutted.newick`
- **Test Setup**: `test/setup.js`

### Configuration

- **Frontend**: `frontend/package.json`
- **Backend**: `backend/pyproject.toml`
- **Root**: `package.json` (minimal dependencies)

## Environment Variables

- `BACKEND_URL`: Backend server URL (default: <http://127.0.0.1:5002>)
- `API_URL`: API base URL for tests

## Dependencies

- **Backend**: Flask, Poetry, Python phylogenetic libraries
- **Frontend**: React, Vite, MSA viewer components
- **Testing**: Mocha, Chai, node-fetch, form-data, jsdom

## Common Issues

1. **Port conflicts**: Use `./dev.sh` which includes port cleanup
2. **Missing dependencies**: Run `poetry install` (backend) and `npm install` (frontend)
3. **Test failures**: Ensure backend is running before integration tests
4. **MSA processing**: Check simplified architecture (no global variables)
