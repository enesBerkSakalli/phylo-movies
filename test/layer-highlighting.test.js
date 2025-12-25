/**
 * Layer Highlighting Regression Tests
 *
 * Verifies that deck.gl layer configurations for highlighting are correct:
 * - autoHighlight is enabled on pickable layers
 * - updateTriggers use stable scalar values (not array references)
 * - Highlight version counter triggers re-renders appropriately
 */

const { expect } = require('chai');
const Module = require('module');

// ---- Minimal deck.gl mocks ----
const mockDeckGLCore = {
  Deck: class { constructor(props) { this.props = props || {}; } setProps(p) { this.props = { ...this.props, ...p }; } finalize() { } },
  OrthographicView: class { constructor(opts) { this.opts = opts; } },
  OrbitView: class { constructor(opts) { this.opts = opts; } },
  LinearInterpolator: class { constructor(opts) { this.opts = opts; } },
  FlyToInterpolator: class { constructor(opts) { this.opts = opts; } },
  COORDINATE_SYSTEM: { CARTESIAN: 1 }
};

class MockLayer {
  constructor(props) {
    this.props = props || {};
    this.id = this.props.id;
  }
  clone(nextProps) {
    return new this.constructor({ ...this.props, ...nextProps });
  }
}

const mockDeckGLLayers = {
  PathLayer: class PathLayer extends MockLayer { },
  ScatterplotLayer: class ScatterplotLayer extends MockLayer { },
  TextLayer: class TextLayer extends MockLayer { }
};

// Mock deck.gl extensions
const mockDeckGLExtensions = {
  PathStyleExtension: class PathStyleExtension {
    constructor(opts) { this.opts = opts; }
  }
};

// Mock zustand store
let mockStoreState = {
  taxaColorVersion: 0,
  highlightVersion: 0,
  strokeWidth: 2,
  fontSize: '2.6em',
  nodeSize: 1,
  dimmingEnabled: false,
  dimmingOpacity: 0.3,
  linkConnectionOpacity: 0.6,
  highlightPulseEnabled: false,
  activeEdgeDashingEnabled: false,
  getPulseOpacity: () => 1.0,
  getColorManager: () => ({
    hasActiveChangeEdges: () => false,
    marked: [],
    getBranchColor: () => '#000000',
    getBranchColorWithHighlights: () => '#000000',
    getNodeColor: () => '#000000',
    isDownstreamOfAnyActiveChangeEdge: () => false,
    isNodeDownstreamOfAnyActiveChangeEdge: () => false
  })
};

const mockUseAppStore = {
  getState: () => mockStoreState,
  subscribe: () => () => { }
};

// Patch module loader
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  if (request === '@deck.gl/extensions') return mockDeckGLExtensions;
  if (request.includes('store.js') || request.includes('store')) return { useAppStore: mockUseAppStore };
  if (request.includes('colorUtils')) return { colorToRgb: (hex) => [0, 0, 0] };
  if (request.includes('mathUtils')) return { easeInOutCubic: (t) => t };
  return originalLoad.apply(this, arguments);
};

// Now require the SUT - using modular layer factories
const { LayerManager } = require('../src/js/treeVisualisation/deckgl/layers/LayerManager.js');
const {
  createLinksLayer,
  createNodesLayer,
  createLinkOutlinesLayer
} = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');
const { LayerStyles } = require('../src/js/treeVisualisation/deckgl/layers/LayerStyles.js');

describe('Layer Highlighting Configuration', () => {
  let layerStyles;

  beforeEach(() => {
    // Reset mock state
    mockStoreState = {
      taxaColorVersion: 0,
      highlightVersion: 0,
      strokeWidth: 2,
      fontSize: '2.6em',
      nodeSize: 1,
      dimmingEnabled: false,
      dimmingOpacity: 0.3,
      linkConnectionOpacity: 0.6,
      highlightPulseEnabled: false,
      activeEdgeDashingEnabled: false,
      getPulseOpacity: () => 1.0,
      getColorManager: () => ({
        hasActiveChangeEdges: () => false,
        marked: [],
        getBranchColor: () => '#000000',
        getBranchColorWithHighlights: () => '#000000',
        getNodeColor: () => '#000000',
        isDownstreamOfAnyActiveChangeEdge: () => false,
        isNodeDownstreamOfAnyActiveChangeEdge: () => false
      })
    };
    layerStyles = new LayerStyles();
  });

  describe('autoHighlight configuration', () => {
    it('should enable autoHighlight on links layer', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinksLayer(links, mockStoreState, layerStyles);

      expect(layer.props.autoHighlight).to.equal(true);
      expect(layer.props.highlightColor).to.be.an('array');
      expect(layer.props.highlightColor).to.have.lengthOf(4);
    });

    it('should enable autoHighlight on nodes layer', () => {
      const nodes = [{ position: [0, 0, 0], data: { split_indices: [1] } }];
      const layer = createNodesLayer(nodes, mockStoreState, layerStyles);

      expect(layer.props.autoHighlight).to.equal(true);
      expect(layer.props.highlightColor).to.be.an('array');
      expect(layer.props.highlightColor).to.have.lengthOf(4);
    });

    it('should NOT enable autoHighlight on non-pickable layers (outlines)', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinkOutlinesLayer(links, mockStoreState, layerStyles);

      expect(layer.props.pickable).to.equal(false);
      // autoHighlight should not be set on non-pickable layers
      expect(layer.props.autoHighlight).to.be.undefined;
    });
  });

  describe('updateTriggers stability', () => {
    it('should use scalar highlightVersion in links updateTriggers', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinksLayer(links, mockStoreState, layerStyles);

      const colorTrigger = layer.props.updateTriggers.getColor;
      // Should be an array of scalars, not containing the links array itself
      expect(colorTrigger).to.be.an('array');
      expect(colorTrigger).to.not.deep.include(links);
      // Should include version numbers
      expect(colorTrigger.some(v => typeof v === 'number')).to.be.true;
    });

    it('should use scalar highlightVersion in nodes updateTriggers', () => {
      const nodes = [{ position: [0, 0, 0], data: { split_indices: [1] } }];
      const layer = createNodesLayer(nodes, mockStoreState, layerStyles);

      const colorTrigger = layer.props.updateTriggers.getFillColor;
      expect(colorTrigger).to.be.an('array');
      expect(colorTrigger).to.not.deep.include(nodes);
    });

    it('should increment highlightVersion when highlight state changes', () => {
      const initialVersion = mockStoreState.highlightVersion;

      // Simulate highlight version increment
      mockStoreState.highlightVersion = initialVersion + 1;

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinksLayer(links, mockStoreState, layerStyles);

      const colorTrigger = layer.props.updateTriggers.getColor;
      expect(colorTrigger).to.deep.include(initialVersion + 1);
    });
  });

  describe('conditional layer visibility', () => {
    it('should hide link outlines when no highlights are active', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinkOutlinesLayer(links, mockStoreState, layerStyles);

      expect(layer.props.visible).to.equal(false);
    });

    it('should show link outlines when active change edges exist', () => {
      const stateWithHighlights = {
        ...mockStoreState,
        getColorManager: () => ({
          hasActiveChangeEdges: () => true,
          marked: [],
          getBranchColor: () => '#000000',
          getBranchColorWithHighlights: () => '#2196f3',
          getNodeColor: () => '#000000',
          isDownstreamOfAnyActiveChangeEdge: () => false,
          isNodeDownstreamOfAnyActiveChangeEdge: () => false
        })
      };

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinkOutlinesLayer(links, stateWithHighlights, layerStyles);

      expect(layer.props.visible).to.equal(true);
    });

    it('should show link outlines when marked components exist', () => {
      const stateWithMarked = {
        ...mockStoreState,
        getColorManager: () => ({
          hasActiveChangeEdges: () => false,
          marked: [new Set([1, 2, 3])],
          getBranchColor: () => '#000000',
          getBranchColorWithHighlights: () => '#ff5722',
          getNodeColor: () => '#000000',
          isDownstreamOfAnyActiveChangeEdge: () => false,
          isNodeDownstreamOfAnyActiveChangeEdge: () => false
        })
      };

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], target: { data: { split_indices: [1] } } }];
      const layer = createLinkOutlinesLayer(links, stateWithMarked, layerStyles);

      expect(layer.props.visible).to.equal(true);
    });
  });

  describe('highlight color contrast', () => {
    it('should use a distinct hover highlight color', () => {
      const nodes = [{ position: [0, 0, 0], data: { split_indices: [1] } }];
      const layer = createNodesLayer(nodes, mockStoreState, layerStyles);

      const [r, g, b, a] = layer.props.highlightColor;

      // Hover color should be distinct from blue (#2196f3) and red (#ff5722)
      // Using cyan-ish color [0, 200, 220, 150]
      expect(g).to.be.greaterThan(100); // Has significant green
      expect(b).to.be.greaterThan(100); // Has significant blue
      expect(a).to.be.greaterThan(100); // Semi-transparent
    });
  });
});

describe('Highlight Version Counter Integration', () => {
  it('should be included in store state', () => {
    expect(mockStoreState).to.have.property('highlightVersion');
    expect(typeof mockStoreState.highlightVersion).to.equal('number');
  });
});
