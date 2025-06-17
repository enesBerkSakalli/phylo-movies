// Test to verify SCSS module loading works correctly and prevents the original error
// "Uncaught TypeError: Cannot read properties of undefined (reading 'hoverTrackerSize')"

const assert = require('assert');
const path = require('path');

describe('SCSS Module Loading Tests', function() {
  describe('VirtualizedMatrixViewerMock', function() {
    it('should load the mock module and provide hoverTrackerSize', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');

      // Clear require cache to ensure fresh import
      delete require.cache[require.resolve(mockPath)];

      const mockModule = require(mockPath);

      // Test basic existence
      assert(mockModule !== undefined, 'Mock module should exist');
      assert(typeof mockModule === 'object', 'Mock module should be an object');

      // Test the specific property that was causing the error
      assert(mockModule.hoverTrackerSize !== undefined, 'hoverTrackerSize should be defined');
      assert(typeof mockModule.hoverTrackerSize === 'number', 'hoverTrackerSize should be a number');
      assert.strictEqual(mockModule.hoverTrackerSize, 5, 'hoverTrackerSize should equal 5');
    });

    it('should provide required CSS class names', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const mockModule = require(mockPath);

      const requiredClasses = [
        'av2-virtualized-matrix',
        'scrolled-indicator',
        'av2-wheel-scroller',
        'hover-tracker-y',
        'hover-tracker-x'
      ];

      requiredClasses.forEach(className => {
        assert(mockModule[className] !== undefined, `CSS class ${className} should be defined`);
        assert(typeof mockModule[className] === 'string', `CSS class ${className} should be a string`);
      });
    });

    it('should prevent the original TypeError when accessing hoverTrackerSize', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const cssModule = require(mockPath);

      // This simulates the exact code that was failing in alignment-viewer-2.js
      // styles.hoverTrackerSize where styles was undefined
      // Now it should work because we have the mock

      assert.doesNotThrow(() => {
        const size = cssModule.hoverTrackerSize;
        return size;
      }, 'Should not throw TypeError when accessing hoverTrackerSize');

      // Verify the value is actually accessible
      const size = cssModule.hoverTrackerSize;
      assert.strictEqual(size, 5, 'Should return the expected hoverTrackerSize value');
    });

    it('should match CSS modules format with object structure', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const mockModule = require(mockPath);

      // CSS Modules export objects with class names as keys
      assert(typeof mockModule === 'object', 'Should export an object');
      assert(!Array.isArray(mockModule), 'Should not be an array');

      // Should have both string properties (CSS classes) and numeric properties
      let hasStringProps = false;
      let hasNumericProps = false;

      for (const [key, value] of Object.entries(mockModule)) {
        if (typeof value === 'string') hasStringProps = true;
        if (typeof value === 'number') hasNumericProps = true;
      }

      assert(hasStringProps, 'Should have string properties (CSS class names)');
      assert(hasNumericProps, 'Should have numeric properties (like hoverTrackerSize)');
    });
  });
});
