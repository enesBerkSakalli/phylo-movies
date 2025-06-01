# Phylo-Movies Test Suite

This directory contains all tests for the Phylo-Movies application, including unit tests, integration tests, and end-to-end workflow tests.

## Test Structure

### Core Test Files
- **`msa-workflow.test.js`** - Comprehensive MSA workflow tests (newly added)
- **`integration.test.js`** - Frontend/backend integration tests
- **`api.test.js`** - API endpoint tests
- **`parser.test.js`** - Data parsing tests
- **`setup.js`** - Test environment configuration

### UI/Component Tests
- **`fileUpload.test.js`** - File upload functionality
- **`fileUploadTests.js`** - Extended file upload tests
- **`msaViewerIntegrationTests.js`** - MSA viewer component tests
- **`msaViewerRefreshTest.js`** - MSA viewer refresh tests
- **`tree-centering-verification.test.js`** - Tree visualization tests
- **`chart-resizing-verification.test.js`** - Chart resizing tests

### Test Data
- **`test_data/`** - Test data files directory
  - `alltrees.fasta` - Sample MSA data (11 sequences)
  - `alltrees.trees_cutted.newick` - Sample phylogenetic trees

### Configuration
- **`.babelrc`** - Babel configuration for test transpilation
- **`parsers.js`** - Parser utilities for tests
- **`test-*.js`** - Various test utilities

## Running Tests

### Prerequisites
- Backend must be running for integration tests: `./dev.sh`
- Frontend dependencies installed: `npm install` in `frontend/`

### Test Commands

```bash
# Run all tests
npm run test --prefix frontend

# Run MSA workflow tests only
npm run test:msa --prefix frontend

# Run tests requiring backend
npm run test:backend-required --prefix frontend

# Run tests in watch mode
npm run test:watch --prefix frontend

# Use dedicated test runner
./test-msa.sh
```

### Environment Setup

Tests require:
1. **Backend running** on `http://127.0.0.1:5002/` for integration tests
2. **Test data files** in `test_data/` directory
3. **Dependencies installed** via npm/poetry

## MSA Workflow Testing

The `msa-workflow.test.js` file contains comprehensive tests for the simplified MSA architecture:

### Test Categories
1. **Test Data Validation** - Verifies test files exist and are valid
2. **Backend MSA Processing** - Tests end-to-end MSA + tree processing
3. **Simplified Architecture Validation** - Confirms architectural improvements

### Key Validations
- ✅ MSA and tree files are processed correctly
- ✅ Expected taxa are extracted from sequences
- ✅ Response structure contains all required fields
- ✅ Global variables eliminated (architectural test)
- ✅ UUID-based file storage removed (architectural test)
- ✅ Direct in-memory processing implemented (architectural test)

### Error Handling Tests
- Missing MSA file handling
- Invalid file format handling
- Backend connectivity issues

## Test Framework

- **Testing Framework**: Mocha + Chai
- **DOM Mocking**: JSDOM
- **HTTP Requests**: node-fetch
- **Form Data**: form-data
- **Spying/Mocking**: Sinon

## Development Notes

### Recent Changes (MSA Simplification)
The MSA workflow has been significantly simplified:
- **Removed**: Global variables (`LAST_MSA_CONTENT`)
- **Removed**: UUID-based temporary file storage
- **Removed**: Complex fallback chains
- **Added**: Direct in-memory processing
- **Added**: Clean data flow architecture

### Testing Best Practices
1. Always check backend availability before integration tests
2. Use meaningful test descriptions
3. Include both positive and negative test cases
4. Test architectural changes with dedicated tests
5. Keep test data minimal but representative

### Debugging Failed Tests
1. Check if backend is running: `curl http://127.0.0.1:5002/about`
2. Verify test data exists: `ls test/test_data/`
3. Check dependencies: `npm list` in frontend/
4. Run individual test files: `npx mocha test/specific-test.js`

## CI/CD Integration

For automated testing:
```bash
# Start application
./dev.sh &

# Wait for startup
sleep 10

# Run tests
npm run test --prefix frontend

# Cleanup
pkill -f "python.*phylomovie"
pkill -f "vite"
```

## Contributing

When adding new tests:
1. Place all test files in this `test/` directory
2. Follow existing naming conventions: `*.test.js`
3. Include test data in `test_data/` if needed
4. Update this README with new test descriptions
5. Add new tests to package.json test scripts
