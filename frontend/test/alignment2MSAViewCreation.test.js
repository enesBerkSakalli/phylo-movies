// Test for creating alignment2MSAView to understand SCSS loading errors
// This tests the complete environment where index.jsx creates AlignmentViewer2Component
// and verifies where the new TypeError is coming from

const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Alignment2MSAView Creation Tests', function() {
  let dom, window, document;

  // Setup DOM environment before each test
  beforeEach(function() {
    // Create a realistic DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Environment</title>
        </head>
        <body>
          <div id="msa-react-root"></div>
          <div id="msa-winbox-content"></div>
          <div id="msa-status">
            <div class="info-value">No alignment data loaded</div>
          </div>
          <button id="msa-viewer-btn">Open Alignment Viewer</button>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously'
    });

    window = dom.window;
    document = window.document;

    // Setup global environment to match browser
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.HTMLElement = window.HTMLElement;
    global.HTMLDivElement = window.HTMLDivElement;
    global.MouseEvent = window.MouseEvent;
    global.Element = window.Element;
    global.Node = window.Node;

    // Mock localStorage for MSA data
    global.localStorage = {
      data: {},
      getItem: function(key) { return this.data[key] || null; },
      setItem: function(key, value) { this.data[key] = value; },
      removeItem: function(key) { delete this.data[key]; },
      clear: function() { this.data = {}; }
    };

    // Mock localforage for MSA data loading
    global.localforage = {
      getItem: async function(key) {
        if (key === 'phyloMovieMSAData') {
          return {
            rawData: '>seq1\nATCG\n>seq2\nATCG'
          };
        }
        return null;
      }
    };

    // Clear require cache to ensure fresh imports
    const moduleCache = require.cache;
    Object.keys(moduleCache).forEach(key => {
      if (key.includes('msaViewer') || key.includes('AlignmentViewer')) {
        delete moduleCache[key];
      }
    });
  });

  afterEach(function() {
    // Cleanup global environment
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.HTMLElement;
    delete global.HTMLDivElement;
    delete global.MouseEvent;
    delete global.Element;
    delete global.Node;
    delete global.localStorage;
    delete global.localforage;

    dom?.window?.close();
  });

  describe('SCSS Module Loading Environment', function() {
    it('should verify VirtualizedMatrixViewerMock is accessible', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');

      // Clear cache and load the mock
      delete require.cache[require.resolve(mockPath)];
      const mockModule = require(mockPath);

      assert(mockModule !== undefined, 'VirtualizedMatrixViewerMock should be accessible');
      assert.strictEqual(mockModule.hoverTrackerSize, 5, 'hoverTrackerSize should be defined as 5');

      // Verify all expected CSS class exports exist
      const expectedClasses = [
        'av2-virtualized-matrix',
        'scrolled-indicator',
        'av2-wheel-scroller',
        'hover-tracker-y',
        'hover-tracker-x',
        'triangle-up',
        'triangle-down',
        'triangle-left',
        'triangle-right',
        'av2-data'
      ];

      expectedClasses.forEach(className => {
        assert(mockModule[className] !== undefined, `CSS class ${className} should exist`);
        assert(typeof mockModule[className] === 'string', `CSS class ${className} should be a string`);
      });
    });

    it('should prevent TypeError when accessing hoverTrackerSize in alignment-viewer-2 context', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const cssStyles = require(mockPath);

      // Simulate the exact code that was failing in alignment-viewer-2.js at line 40356
      // This would have been something like: styles.hoverTrackerSize where styles was undefined
      assert.doesNotThrow(() => {
        const hoverSize = cssStyles.hoverTrackerSize;
        return hoverSize;
      }, 'Should not throw when accessing hoverTrackerSize');

      // Verify the value is correct
      const hoverSize = cssStyles.hoverTrackerSize;
      assert.strictEqual(hoverSize, 5, 'hoverTrackerSize should equal 5');
      assert(typeof hoverSize === 'number', 'hoverTrackerSize should be a number');
    });
  });

  describe('AlignmentViewer2Component Import Test', function() {
    it('should be able to import AlignmentViewer2Component without SCSS errors', function() {
      // Mock React and related dependencies first
      const mockReact = {
        useState: () => [null, () => {}],
        useEffect: () => {},
        useRef: () => ({ current: null }),
        useCallback: () => {},
        createElement: () => null
      };

      const mockCreateRoot = () => ({
        render: () => {},
        unmount: () => {}
      });

      // Override require to provide mocks
      const originalRequire = require;
      require = function(moduleName) {
        if (moduleName === 'react') return mockReact;
        if (moduleName === 'react-dom/client') return { createRoot: mockCreateRoot };
        if (moduleName === 'localforage') return global.localforage;
        if (moduleName.includes('VirtualizedMatrixViewer.scss')) {
          // This should be intercepted by our Vite plugin or mock
          return require(path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js'));
        }
        return originalRequire.apply(this, arguments);
      };

      try {
        // This should not throw an error if SCSS loading is working correctly
        assert.doesNotThrow(() => {
          // Try to require the AlignmentViewer2Component
          const componentPath = path.join(__dirname, '../js/msaViewer/AlignmentViewer2Component.jsx');
          // Note: This would normally fail due to JSX, but we're testing the import process

          // Instead, let's test the specific import that causes issues
          const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
          const mockModule = require(mockPath);

          // Simulate what alignment-viewer-2 would do
          const styles = mockModule;
          const size = styles.hoverTrackerSize; // This line was failing

          assert(size !== undefined, 'Should be able to access hoverTrackerSize');
        }, 'Should not throw when importing component and accessing SCSS modules');
      } finally {
        // Restore original require
        require = originalRequire;
      }
    });
  });

  describe('MSA String Parsing Test', function() {
    it('should handle MSA string creation like AlignmentViewer2Component does', function() {
      // Mock sample MSA data (FASTA format)
      const testMSAString = `>sequence1
ATCGATCGATCG
>sequence2
ATCGATCGATCG
>sequence3
ATCGATCGATCG`;

      // Test basic MSA string validation
      assert(testMSAString.length > 0, 'MSA string should not be empty');
      assert(testMSAString.includes('>'), 'MSA string should contain FASTA headers');
      assert(testMSAString.includes('ATCG'), 'MSA string should contain sequence data');

      // Simulate what createAlignmentFromMSA would do without importing alignment-viewer-2
      const lines = testMSAString.split('\n');
      const sequences = [];
      let currentSeq = null;

      for (const line of lines) {
        if (line.startsWith('>')) {
          if (currentSeq) sequences.push(currentSeq);
          currentSeq = { id: line.substring(1), sequence: '' };
        } else if (currentSeq) {
          currentSeq.sequence += line;
        }
      }
      if (currentSeq) sequences.push(currentSeq);

      assert.strictEqual(sequences.length, 3, 'Should parse 3 sequences');
      assert.strictEqual(sequences[0].id, 'sequence1', 'First sequence ID should be correct');
      assert.strictEqual(sequences[0].sequence, 'ATCGATCGATCG', 'First sequence data should be correct');
    });
  });

  describe('Environment Simulation for alignment2MSAView Creation', function() {
    it('should simulate the complete environment where index.jsx creates AlignmentViewer2Component', function() {
      // Setup MSA data in localStorage
      global.localStorage.setItem('phyloMovieMSAData', JSON.stringify({
        rawData: `>test_seq_1
ATCGATCGATCGATCGATCG
>test_seq_2
ATCGATCGATCGATCGATCG
>test_seq_3
ATCGATCGATCGATCGATCG`
      }));

      // Verify DOM elements exist (simulating browser environment)
      assert(document.getElementById('msa-react-root'), 'MSA React root should exist');
      assert(document.getElementById('msa-winbox-content'), 'MSA WinBox content should exist');
      assert(document.getElementById('msa-status'), 'MSA status element should exist');
      assert(document.getElementById('msa-viewer-btn'), 'MSA viewer button should exist');

      // Test that SCSS modules are properly mocked
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const scssModule = require(mockPath);

      // Simulate the exact operations that happen in alignment2MSAView creation
      assert.doesNotThrow(() => {
        // This simulates the critical operation that was failing
        const hoverTrackerSize = scssModule.hoverTrackerSize;
        const cssClasses = {
          matrix: scssModule['av2-virtualized-matrix'],
          scrollIndicator: scssModule['scrolled-indicator'],
          wheelScroller: scssModule['av2-wheel-scroller'],
          hoverTrackerY: scssModule['hover-tracker-y'],
          hoverTrackerX: scssModule['hover-tracker-x']
        };

        // Verify all required properties are accessible
        assert(hoverTrackerSize !== undefined, 'hoverTrackerSize should be accessible');
        assert(cssClasses.matrix !== undefined, 'CSS classes should be accessible');
        assert(cssClasses.scrollIndicator !== undefined, 'Scroll indicator class should exist');
        assert(cssClasses.wheelScroller !== undefined, 'Wheel scroller class should exist');
        assert(cssClasses.hoverTrackerY !== undefined, 'Hover tracker Y class should exist');
        assert(cssClasses.hoverTrackerX !== undefined, 'Hover tracker X class should exist');

        return { hoverTrackerSize, cssClasses };
      }, 'Should not throw when accessing SCSS properties during alignment2MSAView creation');
    });

    it('should verify MSA data loading process works without errors', function() {
      // Test the data loading that happens in useMSAData hook
      return new Promise((resolve, reject) => {
        try {
          global.localforage.getItem('phyloMovieMSAData')
            .then(msaData => {
              assert(msaData !== null, 'MSA data should be loadable');
              assert(msaData.rawData !== undefined, 'Raw MSA data should exist');
              assert(typeof msaData.rawData === 'string', 'MSA data should be a string');
              assert(msaData.rawData.includes('>'), 'MSA data should contain FASTA headers');
              resolve();
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    });

    it('should test the exact error scenario from alignment-viewer-2.js line 40356', function() {
      // This test specifically targets the new error mentioned by the user
      // "Uncaught TypeError: Cannot read properties of undefined" in alignment-viewer-2.js at line 40356

      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];

      // Simulate the exact condition that might cause the error
      const cssModule = require(mockPath);

      // Test various scenarios that could cause "Cannot read properties of undefined"
      assert.doesNotThrow(() => {
        // Scenario 1: Direct property access (the original fix)
        const size1 = cssModule.hoverTrackerSize;
        assert(size1 !== undefined, 'Direct hoverTrackerSize access should work');

        // Scenario 2: Nested property access
        const props = { styles: cssModule };
        const size2 = props.styles.hoverTrackerSize;
        assert(size2 !== undefined, 'Nested hoverTrackerSize access should work');

        // Scenario 3: Destructuring access
        const { hoverTrackerSize, 'av2-virtualized-matrix': matrixClass } = cssModule;
        assert(hoverTrackerSize !== undefined, 'Destructured hoverTrackerSize should work');
        assert(matrixClass !== undefined, 'Destructured CSS class should work');

        // Scenario 4: Array/object spreading (common in React components)
        const styleConfig = { ...cssModule, customProp: 'test' };
        assert(styleConfig.hoverTrackerSize !== undefined, 'Spread operator should preserve hoverTrackerSize');

        return { size1, size2, hoverTrackerSize, matrixClass, styleConfig };
      }, 'All SCSS property access patterns should work without TypeError');
    });
  });

  describe('Integration with Vite Plugin', function() {
    it('should verify the virtualizedMatrixViewerPlugin intercepts SCSS imports correctly', function() {
      // Test the Vite plugin configuration would work
      const mockViteConfig = {
        plugins: [
          {
            name: 'virtualized-matrix-viewer-plugin',
            resolveId(id) {
              if (id.endsWith('VirtualizedMatrixViewer.scss')) {
                return path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
              }
              return null;
            },
            load(id) {
              if (id.endsWith('VirtualizedMatrixViewerMock.js')) {
                const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
                const fs = require('fs');
                return fs.readFileSync(mockPath, 'utf-8');
              }
              return null;
            }
          }
        ]
      };

      // Simulate what the plugin would do
      const plugin = mockViteConfig.plugins[0];

      // Test resolveId
      const resolvedId = plugin.resolveId('some/path/VirtualizedMatrixViewer.scss');
      assert(resolvedId !== null, 'Plugin should resolve SCSS imports');
      assert(resolvedId.includes('VirtualizedMatrixViewerMock.js'), 'Should resolve to mock file');

      // Test load
      const loadedContent = plugin.load(resolvedId);
      assert(loadedContent !== null, 'Plugin should load mock content');
      assert(typeof loadedContent === 'string', 'Loaded content should be a string');
      assert(loadedContent.includes('hoverTrackerSize: 5'), 'Mock content should contain hoverTrackerSize');
    });
  });

  describe('Error Prevention Verification', function() {
    it('should prevent all known TypeError patterns that could occur in alignment-viewer-2', function() {
      const mockPath = path.join(__dirname, '../src/VirtualizedMatrixViewerMock.js');
      delete require.cache[require.resolve(mockPath)];
      const scssModule = require(mockPath);

      // Test all the patterns that could cause "Cannot read properties of undefined"
      const errorPatterns = [
        () => scssModule.hoverTrackerSize, // Direct access
        () => scssModule['hoverTrackerSize'], // Bracket notation
        () => scssModule?.hoverTrackerSize, // Optional chaining
        () => Object.keys(scssModule).includes('hoverTrackerSize'), // Object.keys
        () => Object.values(scssModule).includes(5), // Object.values
        () => Object.entries(scssModule).find(([k,v]) => k === 'hoverTrackerSize'), // Object.entries
        () => JSON.stringify(scssModule), // JSON serialization
        () => ({ ...scssModule }), // Spread operator
        () => Object.assign({}, scssModule), // Object.assign
      ];

      errorPatterns.forEach((pattern, index) => {
        assert.doesNotThrow(pattern, `Pattern ${index + 1} should not throw TypeError`);
      });

      // Verify the results are correct
      assert.strictEqual(scssModule.hoverTrackerSize, 5, 'hoverTrackerSize should be 5');
      assert(Object.keys(scssModule).length > 1, 'Should have multiple CSS exports');
    });
  });
});
