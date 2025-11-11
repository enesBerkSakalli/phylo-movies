# Test Suite for ChangeMetricUtils

This directory contains comprehensive unit tests for the `ChangeMetricUtils` module, which quantifies the magnitude of transformations between phylogenetic tree layouts.

## Running Tests

### Run All Tests
```bash
npx mocha --require @babel/register test/ChangeMetricUtils.test.js
```

### Run with npm test script (if configured)
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npx mocha --require @babel/register test/ChangeMetricUtils.test.js --watch
```

### Run Specific Test Suite
```bash
npx mocha --require @babel/register test/ChangeMetricUtils.test.js --grep "Correctness"
```

## Test Coverage

The test suite includes **51 test cases** covering:

### Input Validation (9 tests)
- Null/undefined layout parameters
- Missing tree properties
- Empty leaf arrays
- Partial data scenarios

### Correctness (9 tests)
- Detection of radius-only changes
- Detection of angle-only changes
- Combined radius and angle changes
- Shortest angular path calculation (wrap-around at ±2π)
- Averaging changes across multiple leaves
- Custom weight configurations (radiusWeight/angleWeight)

### Edge Cases (9 tests)
- Zero radius values
- Negative radius values
- Very large radius values
- NaN values in angle/radius
- Angle boundary conditions (π/-π equivalence)

### Multi-Leaf Scenarios (4 tests)
- Partial overlap of leaf sets
- Completely disjoint leaf sets
- Large-scale performance (1000 leaves)
- Varying changes across leaves

### Options Robustness (6 tests)
- Missing options parameter
- Partial weight configurations
- Non-normalized weights (summing > 1)
- Zero weights
- Negative weights

### classifyExtensionChanges (7 tests)
- Enter/update/exit classification
- Input validation
- Correct node references from source/target layouts

### Consistency Tests (2 tests)
- Update count matches compared count
- Same leaves identified across functions

### Integration Tests (3 tests)
- Gentle animation scenario (avgChange ≤ 0.05)
- Moderate animation scenario
- Linear animation scenario (avgChange ≥ 0.2)

## Test Framework

- **Test Runner**: Mocha 10.8.2
- **Assertions**: Chai 4.5.0 (expect style)
- **Transpilation**: Babel 7.27.x with @babel/register
- **Module Format**: ES6 imports transpiled to CommonJS

## Key Implementation Details

The tests validate the actual implementation which:

1. **Uses default weights**: `radiusWeight=0.6`, `angleWeight=0.4`
2. **Returns empty results for invalid inputs**: No exceptions thrown for null/undefined
3. **Expects layout structure**: `layout.tree.leaves()` and `layout.max_radius`
4. **Uses shortest angular path**: Via `shortestAngle()` helper from MathUtils
5. **Identifies leaves by key**: Via `getNodeKey()` from KeyGenerator

## Test Helpers

### `createMockLeaf(id, angle, radius)`
Creates a mock D3 hierarchy node with proper structure for testing.

### `createMockLayout(leafSpecs, maxRadius)`
Creates a complete mock layout object with:
- `tree.leaves()` method returning mock leaves
- `max_radius` property (calculated or explicit)

Example:
```javascript
const layout = createMockLayout([
  { id: 'leaf1', angle: 0, radius: 1 },
  { id: 'leaf2', angle: Math.PI, radius: 1.5 }
], 1.5);
```

## Adding New Tests

When adding new tests:

1. Follow the existing describe/it structure
2. Use descriptive test names starting with "should"
3. Include comments explaining expected calculations
4. Use `expect().to.be.closeTo(value, 0.001)` for floating-point comparisons
5. Test both `computeExtensionChangeMetrics` and `classifyExtensionChanges` for consistency

## CI/CD Integration

To integrate with GitHub Actions or other CI systems, add to your workflow:

```yaml
- name: Run Unit Tests
  run: npx mocha --require @babel/register test/ChangeMetricUtils.test.js
```

## Performance Benchmarks

The test suite includes a performance test ensuring efficient processing of large datasets:
- **1000 leaves**: Must complete in < 100ms
- Current implementation uses Map-based lookups for O(n) complexity

## Known Edge Cases

1. **Zero radius with zero maxRadius**: Results in NaN due to division by zero. Test accepts this as current behavior.
2. **NaN values**: Implementation tolerates NaN in angle/radius via nullish coalescing (`?? 0`)

## Dependencies

Ensure these packages are installed:
```bash
npm install --save-dev mocha chai @babel/core @babel/register @babel/preset-env
```

## Troubleshooting

### "Cannot find module" errors
Ensure `.babelrc` is configured with:
```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": { "node": "current" },
      "modules": "commonjs"
    }]
  ]
}
```

### Tests timeout
Increase Mocha timeout:
```bash
npx mocha --require @babel/register test/ChangeMetricUtils.test.js --timeout 5000
```

### Module type warnings
Add `"type": "module"` to `package.json` to eliminate ES module reparsing warnings.
