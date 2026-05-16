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
  colorVersion: 0,
  strokeWidth: 2,
  fontSize: '2.6em',
  nodeSize: 1,
  leafNamesByIndex: [],
  dimmingEnabled: false,
  dimmingOpacity: 0.3,
  linkConnectionOpacity: 0.6,
  changePulseEnabled: false,
  pivotEdgeDashingEnabled: false,
  getPulseOpacity: () => 1.0,
  getColorManager: () => ({
    hasPivotEdges: () => false,
    markedSubtreeSets: [],
    getBranchColor: () => '#000000',
    getBranchColorForInnerLine: () => '#000000',
    getBranchColorWithHighlights: () => '#000000',
    getNodeColor: () => '#000000',
    isDownstreamOfAnyPivotEdge: () => false,
    isNodeDownstreamOfAnyPivotEdge: () => false,
    isPivotEdge: () => false,
    isNodePivotEdge: () => false,
    isNodeSourceEdge: () => false,
    isNodeDestinationEdge: () => false
  })
};

const mockUseAppStore = {
  getState: () => mockStoreState,
  subscribe: () => () => { }
};

// Patch module loader
const originalLoad = Module._load;
Module._load = function (request, _parent, _isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  if (request === '@deck.gl/extensions') return mockDeckGLExtensions;
  if (request.includes('store.js') || request.includes('store')) return { useAppStore: mockUseAppStore };
  if (request.includes('colorUtils')) return {
    colorToRgb: (hex) => {
      if (Array.isArray(hex)) return hex;
      // Basic hex -> RGB for testing
      const trimmed = (hex || '').replace('#', '');
      const num = parseInt(trimmed || '000000', 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    },
    getContrastingHighlightColor: () => [255, 255, 255]
  };
  if (request.includes('mathUtils')) return { easeInOutCubic: (t) => t };
  return originalLoad.apply(this, arguments);
};

// Now require the SUT - using modular layer factories
const {
  getLinksLayerProps,
  getNodesLayerProps,
  getLinkOutlinesLayerProps,
  getExtensionsLayerProps
} = require('../../src/treeVisualisation/deckgl/layers/factory/index.js');
const { LayerStyles } = require('../../src/treeVisualisation/deckgl/layers/LayerStyles.js');
const {
  getLinkSplitIndices,
  getSplitIndices,
  isNodeInSubtree,
  isLinkInSubtree
} = require('../../src/domain/tree/splits.js');
const { shouldHighlightLink } = require('../../src/treeVisualisation/deckgl/layers/styles/links/linkUtils.js');
const { shouldHighlightNode } = require('../../src/treeVisualisation/deckgl/layers/styles/nodes/nodeUtils.js');

/**
 * Helper to create a mock ColorManager with the required fast subtree methods.
 * This ensures mocks include _markedLeavesUnion and fast path methods.
 */
function createMockColorManager(overrides = {}) {
  const subtrees = overrides.markedSubtreeSets || [];
  // Build union of all leaf indices
  const union = new Set();
  for (const subtree of subtrees) {
    for (const idx of subtree) {
      union.add(idx);
    }
  }

  const base = {
    hasPivotEdges: () => false,
    markedSubtreeSets: subtrees,
    _markedLeavesUnion: union,
    markedSubtreesColoringEnabled: true,
    getBranchColor: () => '#000000',
    getBranchColorForInnerLine: () => '#000000',
    getBranchColorWithHighlights: () => '#000000',
    getNodeColor: () => '#000000',
    getNodeBaseColor: () => '#000000',
    isDownstreamOfAnyPivotEdge: () => false,
    isNodeDownstreamOfAnyPivotEdge: () => false,
    isNodeSourceEdge: () => false,
    isNodeDestinationEdge: () => false,
    isPivotEdge: () => false,
    isNodePivotEdge: () => false,
    isNodeInMarkedSubtreeFast: function(nodeData) {
      if (this._markedLeavesUnion.size === 0) return false;
      const splits = getSplitIndices(nodeData);
      if (!splits?.length) return false;
      for (let i = 0; i < splits.length; i++) {
        if (!this._markedLeavesUnion.has(splits[i])) return false;
      }
      return isNodeInSubtree(nodeData, this.markedSubtreeSets);
    },
    isLinkInMarkedSubtreeFast: function(linkData) {
      if (this._markedLeavesUnion.size === 0) return false;
      const splits = getLinkSplitIndices(linkData);
      if (!splits?.length) return false;
      for (let i = 0; i < splits.length; i++) {
        if (!this._markedLeavesUnion.has(splits[i])) return false;
      }
      return isLinkInSubtree(linkData, this.markedSubtreeSets);
    }
  };

  // Apply overrides, but rebuild union if subtrees change
  const result = { ...base, ...overrides };
  if (overrides.markedSubtreeSets && !overrides._markedLeavesUnion) {
    const newUnion = new Set();
    for (const subtree of overrides.markedSubtreeSets) {
      for (const idx of subtree) {
        newUnion.add(idx);
      }
    }
    result._markedLeavesUnion = newUnion;
  }
  return result;
}

describe('marked subtree highlight helpers', () => {
  it('keeps marked subtree link highlighting behind the marked-subtree toggle', () => {
    const link = { split_indices: [3] };
    const cached = {
      markedSubtreesEnabled: false,
      markedSubtreeData: [new Set([3])],
      colorManager: createMockColorManager()
    };

    expect(shouldHighlightLink(link, cached)).to.equal(false);

    cached.markedSubtreesEnabled = true;

    expect(shouldHighlightLink(link, cached)).to.equal(true);
  });

  it('keeps marked subtree node highlighting behind the marked-subtree toggle', () => {
    const node = { split_indices: [6] };
    const cached = {
      markedSubtreesEnabled: false,
      markedSubtreeData: [new Set([6])],
      colorManager: createMockColorManager()
    };

    expect(shouldHighlightNode(node, cached)).to.equal(false);

    cached.markedSubtreesEnabled = true;

    expect(shouldHighlightNode(node, cached)).to.equal(true);
  });
});

describe('Layer Highlighting Configuration', () => {
  let layerStyles;

  beforeEach(() => {
    // Reset mock state using the helper for ColorManager
    mockStoreState = {
      taxaColorVersion: 0,
      colorVersion: 0,
      strokeWidth: 2,
      fontSize: '2.6em',
      nodeSize: 1,
      leafNamesByIndex: [],
      dimmingEnabled: false,
      dimmingOpacity: 0.3,
      linkConnectionOpacity: 0.6,
      changePulseEnabled: false,
      pivotEdgeDashingEnabled: false,
      getPulseOpacity: () => 1.0,
      getColorManager: () => createMockColorManager()
    };
    layerStyles = new LayerStyles();
  });

  describe('autoHighlight configuration', () => {
    it('should keep main links non-pickable', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinksLayerProps(links, mockStoreState, layerStyles);

      expect(layer.pickable).to.equal(false);
      expect(layer.autoHighlight).to.be.undefined;
    });

    it('should enable autoHighlight on nodes layer', () => {
      const nodes = [{ position: [0, 0, 0], split_indices: [1] }];
      const layer = getNodesLayerProps(nodes, mockStoreState, layerStyles);

      expect(layer.autoHighlight).to.equal(true);
      expect(layer.highlightColor).to.be.an('array');
      expect(layer.highlightColor).to.have.lengthOf(4);
    });

    it('should NOT enable autoHighlight on non-pickable layers (outlines)', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinkOutlinesLayerProps(links, mockStoreState, layerStyles);

      expect(layer.pickable).to.equal(false);
      // autoHighlight should not be set on non-pickable layers
      expect(layer.autoHighlight).to.be.undefined;
    });
  });

  describe('updateTriggers stability', () => {
    it('should use scalar colorVersion in links updateTriggers', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinksLayerProps(links, mockStoreState, layerStyles);

      const colorTrigger = layer.updateTriggers.getColor;
      // Should be an array of scalars, not containing the links array itself
      expect(colorTrigger).to.be.an('array');
      expect(colorTrigger).to.not.deep.include(links);
      // Should include version numbers
      expect(colorTrigger.some(v => typeof v === 'number')).to.be.true;
    });

    it('should use scalar colorVersion in nodes updateTriggers', () => {
      const nodes = [{ position: [0, 0, 0], split_indices: [1] }];
      const layer = getNodesLayerProps(nodes, mockStoreState, layerStyles);

      const colorTrigger = layer.updateTriggers.getFillColor;
      expect(colorTrigger).to.be.an('array');
      expect(colorTrigger).to.not.deep.include(nodes);
    });

    it('should increment colorVersion when color state changes', () => {
      const initialVersion = mockStoreState.colorVersion;

      // Simulate color version increment
      mockStoreState.colorVersion = initialVersion + 1;

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinksLayerProps(links, mockStoreState, layerStyles);

      const colorTrigger = layer.updateTriggers.getColor;
      expect(colorTrigger).to.deep.include(initialVersion + 1);
    });
  });

  describe('conditional layer visibility', () => {
    it('should hide link outlines when no highlights are active', () => {
      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinkOutlinesLayerProps(links, mockStoreState, layerStyles);

      expect(layer.visible).to.equal(false);
    });

    it('should show link outlines when pivot edges exist', () => {
      const stateWithHighlights = {
        ...mockStoreState,
        getColorManager: () => createMockColorManager({
          hasPivotEdges: () => true,
          getBranchColorWithHighlights: () => '#2196f3'
        })
      };

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinkOutlinesLayerProps(links, stateWithHighlights, layerStyles);

      expect(layer.visible).to.equal(true);
    });

    it('should show link outlines when marked components exist', () => {
      const stateWithMarked = {
        ...mockStoreState,
        getColorManager: () => createMockColorManager({
          markedSubtreeSets: [new Set([1, 2, 3])],
          getBranchColorWithHighlights: () => '#10b981'
        })
      };

      const links = [{ path: [[0, 0, 0], [1, 1, 0]], split_indices: [1] }];
      const layer = getLinkOutlinesLayerProps(links, stateWithMarked, layerStyles);

      expect(layer.visible).to.equal(true);
    });

    it('should show link outlines when lifecycle links are expanding or collapsing', () => {
      const links = [
        { path: [[0, 0, 0], [1, 1, 0]], split_indices: [1], lifecycle: 'reviving' }
      ];
      const layer = getLinkOutlinesLayerProps(links, mockStoreState, layerStyles);

      expect(layer.visible).to.equal(true);
    });

  });

  describe('lifecycle link highlighting', () => {
    it('colors and thickens expanding lifecycle links', () => {
      const link = {
        path: [[0, 0, 0], [1, 1, 0]],
        split_indices: [1],
        lifecycle: 'reviving',
        opacity: 1
      };
      const linksLayer = getLinksLayerProps([link], mockStoreState, layerStyles);
      const outlineLayer = getLinkOutlinesLayerProps([link], mockStoreState, layerStyles);

      expect(linksLayer.getColor(link).slice()).to.deep.equal([34, 197, 94, 255]);
      expect(linksLayer.getWidth(link)).to.be.greaterThan(mockStoreState.strokeWidth);
      expect(outlineLayer.getColor(link).slice()).to.deep.equal([34, 197, 94, 179]);
      expect(outlineLayer.getWidth(link)).to.be.greaterThan(0);
    });

    it('colors and thickens collapsing lifecycle links', () => {
      const link = {
        path: [[0, 0, 0], [1, 1, 0]],
        split_indices: [1],
        lifecycle: 'zeroing',
        opacity: 1
      };
      const linksLayer = getLinksLayerProps([link], mockStoreState, layerStyles);
      const outlineLayer = getLinkOutlinesLayerProps([link], mockStoreState, layerStyles);

      expect(linksLayer.getColor(link).slice()).to.deep.equal([245, 158, 11, 255]);
      expect(linksLayer.getWidth(link)).to.be.greaterThan(mockStoreState.strokeWidth);
      expect(outlineLayer.getColor(link).slice()).to.deep.equal([245, 158, 11, 179]);
      expect(outlineLayer.getWidth(link)).to.be.greaterThan(0);
    });

    it('does not lifecycle-highlight unchanged links', () => {
      const link = {
        path: [[0, 0, 0], [1, 1, 0]],
        split_indices: [1],
        lifecycle: 'unchanged',
        opacity: 1
      };
      const linksLayer = getLinksLayerProps([link], mockStoreState, layerStyles);
      const outlineLayer = getLinkOutlinesLayerProps([link], mockStoreState, layerStyles);

      expect(linksLayer.getColor(link).slice()).to.deep.equal([0, 0, 0, 255]);
      expect(linksLayer.getWidth(link)).to.equal(mockStoreState.strokeWidth);
      expect(outlineLayer.getColor(link).slice()).to.deep.equal([0, 0, 0, 0]);
      expect(outlineLayer.getWidth(link)).to.equal(0);
    });
  });

  describe('highlight color contrast', () => {
    it('should use a distinct hover highlight color', () => {
      const nodes = [{ position: [0, 0, 0], split_indices: [1] }];
      const layer = getNodesLayerProps(nodes, mockStoreState, layerStyles);

      const [, g, b, a] = layer.highlightColor;

      // Hover color should be distinct from blue (#2196f3) and emerald (#10b981)
      // Using cyan-ish color [0, 200, 220, 150]
      expect(g).to.be.greaterThan(100); // Has significant green
      expect(b).to.be.greaterThan(100); // Has significant blue
      expect(a).to.be.greaterThan(100); // Semi-transparent
    });
  });

  describe('subtree dimming', () => {
    it('should dim nodes not in marked subtree when subtreeDimmingEnabled', () => {
      // Mutate the mock store so LayerStyles.getCachedState() observes subtree settings
      mockStoreState.subtreeDimmingEnabled = true;
      mockStoreState.subtreeDimmingOpacity = 0.5;
      mockStoreState.getColorManager = () => createMockColorManager({
        markedSubtreeSets: [new Set([1, 2, 3])]
      });

      const nodes = [
        { position: [0, 0, 0], split_indices: [4], opacity: 1 }, // outside
        { position: [0, 0, 0], split_indices: [1], opacity: 1 }  // inside
      ];

      const layer = getNodesLayerProps(nodes, mockStoreState, layerStyles);

      const outsideColor = layer.getFillColor(nodes[0]).slice();
      const insideColor = layer.getFillColor(nodes[1]).slice();

      expect(outsideColor[3]).to.be.lessThan(insideColor[3]);
    });

    it('should dim extensions not in marked subtree when subtreeDimmingEnabled', () => {
      // Mutate the mock store so LayerStyles.getCachedState() observes subtree settings
      mockStoreState.subtreeDimmingEnabled = true;
      mockStoreState.subtreeDimmingOpacity = 0.5;
      mockStoreState.getColorManager = () => createMockColorManager({
        markedSubtreeSets: [new Set([1, 2, 3])]
      });

      const extensions = [
        { path: [[0, 0, 0], [1, 1, 0]], split_indices: [4], opacity: 1 }, // outside
        { path: [[0, 0, 0], [1, 1, 0]], split_indices: [1], opacity: 1 }  // inside
      ];

      const layer = getExtensionsLayerProps(extensions, mockStoreState, layerStyles);

      const outsideColor = layer.getColor(extensions[0]).slice();
      const insideColor = layer.getColor(extensions[1]).slice();

      expect(outsideColor[3]).to.be.lessThan(insideColor[3]);
    });
  });

  describe('coloring toggle independence', () => {
    it('keeps subtree dimming active when marked coloring is disabled', () => {
      mockStoreState.subtreeDimmingEnabled = true;
      mockStoreState.subtreeDimmingOpacity = 0.5;
      mockStoreState.markedSubtreesEnabled = false;
      // ColorManager has the subtree data (single source of truth)
      mockStoreState.getColorManager = () => createMockColorManager({
        markedSubtreeSets: [new Set([1])]
      });

      const nodes = [
        { position: [0, 0, 0], split_indices: [2], opacity: 1 },
        { position: [0, 0, 0], split_indices: [1], opacity: 1 }
      ];

      const cached = layerStyles.getCachedState();
      const outsideColor = layerStyles.getNodeColor(nodes[0], cached).slice();
      const insideColor = layerStyles.getNodeColor(nodes[1], cached).slice();

      expect(outsideColor[3]).to.be.lessThan(insideColor[3]);
    });

    it('removes marked highlight scaling when coloring is disabled', () => {
      // Note: This test verifies that the markedSubtreesEnabled flag affects the
      // shouldHighlightMarkedNode check (1.6x scaling), but isNodeVisuallyHighlighted
      // still checks ColorManager.markedSubtreeSets directly (1.5x scaling).
      // This is expected behavior - the toggle controls the "marked" visual treatment
      // but not the general "highlighted" treatment.
      mockStoreState.markedSubtreesEnabled = true;
      mockStoreState.dimmingEnabled = false;
      mockStoreState.subtreeDimmingEnabled = false;
      // ColorManager has the subtree data for radius scaling
      mockStoreState.getColorManager = () => createMockColorManager({
        markedSubtreeSets: [new Set([1])]
      });

      const markedNode = { position: [0, 0, 0], split_indices: [1], radius: 4, opacity: 1 };

      const cachedWithColor = layerStyles.getCachedState();
      const radiusWithColoring = layerStyles.getNodeRadius(markedNode, 3, cachedWithColor);

      layerStyles.clearRenderCache();
      mockStoreState.markedSubtreesEnabled = false;

      const cachedWithoutColor = layerStyles.getCachedState();
      const radiusWithoutColoring = layerStyles.getNodeRadius(markedNode, 3, cachedWithoutColor);

      // With markedSubtreesEnabled=true: 4 * 1.6 = 6.4 (marked scaling)
      // With markedSubtreesEnabled=false: 4 * 1.5 = 6 (highlighted scaling via isNodeVisuallyHighlighted)
      // The marked scaling (1.6x) is larger than highlighted scaling (1.5x)
      expect(radiusWithColoring).to.be.greaterThan(radiusWithoutColoring);
    });
  });
});

describe('Color Version Counter Integration', () => {
  it('should be included in store state', () => {
    expect(mockStoreState).to.have.property('colorVersion');
    expect(typeof mockStoreState.colorVersion).to.equal('number');
  });
});

/**
 * Task 4: Unit tests for LayerStyles.getCachedState()
 * Property 1: ColorManager is Single Source of Truth
 * Validates: Requirements 2.1, 2.2
 */
describe('LayerStyles.getCachedState() - ColorManager as Single Source of Truth', () => {
  let layerStyles;

  beforeEach(() => {
    layerStyles = new LayerStyles();
  });

  afterEach(() => {
    layerStyles.clearRenderCache();
    layerStyles.destroy();
  });

  it('should get markedSubtreeData from ColorManager, not from store', () => {
    // Set up ColorManager with specific subtree data
    const colorManagerSubtrees = [new Set([10, 20, 30])];

    // Set up store with DIFFERENT subtree data (simulating stale store state)
    mockStoreState.getMarkedSubtreeData = () => [new Set([1, 2, 3])]; // This should be ignored
    mockStoreState.getColorManager = () => ({
      hasPivotEdges: () => false,
      markedSubtreeSets: colorManagerSubtrees,
      getBranchColor: () => '#000000',
      getBranchColorForInnerLine: () => '#000000',
      getBranchColorWithHighlights: () => '#000000',
      getNodeColor: () => '#000000',
      isDownstreamOfAnyPivotEdge: () => false,
      isNodeDownstreamOfAnyPivotEdge: () => false
    });

    const cached = layerStyles.getCachedState();

    // markedSubtreeData should come from ColorManager, not store
    expect(cached.markedSubtreeData).to.equal(colorManagerSubtrees);
    expect(cached.markedSubtreeData).to.not.deep.equal([new Set([1, 2, 3])]);
  });

  it('should return empty array when ColorManager is null', () => {
    mockStoreState.getColorManager = () => null;

    const cached = layerStyles.getCachedState();

    expect(cached.markedSubtreeData).to.deep.equal([]);
  });

  it('should return empty array when ColorManager.markedSubtreeSets is undefined', () => {
    mockStoreState.getColorManager = () => ({
      hasPivotEdges: () => false,
      // markedSubtreeSets is undefined
      getBranchColor: () => '#000000',
      getBranchColorForInnerLine: () => '#000000',
      getBranchColorWithHighlights: () => '#000000',
      getNodeColor: () => '#000000',
      isDownstreamOfAnyPivotEdge: () => false,
      isNodeDownstreamOfAnyPivotEdge: () => false
    });

    const cached = layerStyles.getCachedState();

    expect(cached.markedSubtreeData).to.deep.equal([]);
  });

  it('should properly clear and rebuild cache', () => {
    // First call with initial data
    const initialSubtrees = [new Set([1, 2])];
    mockStoreState.getColorManager = () => ({
      hasPivotEdges: () => false,
      markedSubtreeSets: initialSubtrees,
      getBranchColor: () => '#000000',
      getBranchColorForInnerLine: () => '#000000',
      getBranchColorWithHighlights: () => '#000000',
      getNodeColor: () => '#000000',
      isDownstreamOfAnyPivotEdge: () => false,
      isNodeDownstreamOfAnyPivotEdge: () => false
    });

    const cached1 = layerStyles.getCachedState();
    expect(cached1.markedSubtreeData).to.equal(initialSubtrees);

    // Clear cache
    layerStyles.clearRenderCache();

    // Update ColorManager with new data
    const updatedSubtrees = [new Set([5, 6, 7])];
    mockStoreState.getColorManager = () => ({
      hasPivotEdges: () => false,
      markedSubtreeSets: updatedSubtrees,
      getBranchColor: () => '#000000',
      getBranchColorForInnerLine: () => '#000000',
      getBranchColorWithHighlights: () => '#000000',
      getNodeColor: () => '#000000',
      isDownstreamOfAnyPivotEdge: () => false,
      isNodeDownstreamOfAnyPivotEdge: () => false
    });

    // Second call should get new data
    const cached2 = layerStyles.getCachedState();
    expect(cached2.markedSubtreeData).to.equal(updatedSubtrees);
    expect(cached2.markedSubtreeData).to.not.equal(initialSubtrees);
  });

  it('should cache state within same render cycle', () => {
    const subtrees = [new Set([1])];
    let callCount = 0;
    mockStoreState.getColorManager = () => {
      callCount++;
      return {
        hasPivotEdges: () => false,
        markedSubtreeSets: subtrees,
        getBranchColor: () => '#000000',
        getBranchColorForInnerLine: () => '#000000',
        getBranchColorWithHighlights: () => '#000000',
        getNodeColor: () => '#000000',
        isDownstreamOfAnyPivotEdge: () => false,
        isNodeDownstreamOfAnyPivotEdge: () => false
      };
    };

    // Multiple calls within same render cycle
    layerStyles.getCachedState();
    layerStyles.getCachedState();
    layerStyles.getCachedState();

    // getColorManager should only be called once due to caching
    expect(callCount).to.equal(1);
  });
});

/**
 * Task 5: Unit tests for dimmingUtils.applyDimmingWithCache()
 * Property 3: Dimming Data Consistency
 * Validates: Requirements 1.4, 2.4
 */
describe('dimmingUtils.applyDimmingWithCache() - Dimming Data Consistency', () => {
  const { applyDimmingWithCache } = require('../../src/treeVisualisation/deckgl/layers/styles/dimmingUtils.js');

  it('should use ColorManager subtree data for dimming', () => {
    const colorManager = createMockColorManager({
      markedSubtreeSets: [new Set([1, 2, 3])]
    });

    // Node inside subtree (split_indices contains 1)
    const nodeInside = { split_indices: [1] };
    // Node outside subtree (split_indices contains 99)
    const nodeOutside = { split_indices: [99] };

    const opacityInside = applyDimmingWithCache(
      255, colorManager, nodeInside, true,
      false, 0.3, // dimmingEnabled, dimmingOpacity
      true, 0.5,  // subtreeDimmingEnabled, subtreeDimmingOpacity
      [] // markedSubtreeData parameter (should be ignored)
    );

    const opacityOutside = applyDimmingWithCache(
      255, colorManager, nodeOutside, true,
      false, 0.3,
      true, 0.5,
      [] // markedSubtreeData parameter (should be ignored)
    );

    // Node inside subtree should have full opacity
    expect(opacityInside).to.equal(255);
    // Node outside subtree should be dimmed
    expect(opacityOutside).to.equal(Math.round(255 * 0.5));
  });

  it('should ignore markedSubtreeData parameter and use ColorManager', () => {
    const colorManager = createMockColorManager({
      markedSubtreeSets: [new Set([100])] // ColorManager says node 100 is in subtree
    });

    // Node with split_indices [100] - in ColorManager's subtree
    const node = { split_indices: [100] };

    // Pass DIFFERENT data in markedSubtreeData parameter (should be ignored)
    const staleMarkedData = [new Set([1, 2, 3])]; // This would NOT include node 100

    const opacity = applyDimmingWithCache(
      255, colorManager, node, true,
      false, 0.3,
      true, 0.5,
      staleMarkedData // This should be ignored
    );

    // Node should NOT be dimmed because ColorManager says it's in subtree
    expect(opacity).to.equal(255);
  });

  it('should return full opacity when ColorManager is null', () => {
    const node = { split_indices: [1] };

    const opacity = applyDimmingWithCache(
      255, null, node, true,
      false, 0.3,
      true, 0.5,
      [new Set([1])] // markedSubtreeData parameter
    );

    // No dimming should occur when ColorManager is null
    expect(opacity).to.equal(255);
  });

  it('should return full opacity when ColorManager has empty subtrees', () => {
    const colorManager = createMockColorManager({
      markedSubtreeSets: [] // Empty
    });

    const node = { split_indices: [1] };

    const opacity = applyDimmingWithCache(
      255, colorManager, node, true,
      false, 0.3,
      true, 0.5,
      []
    );

    // No dimming when no subtrees are marked
    expect(opacity).to.equal(255);
  });

  it('should apply pivot edge dimming correctly', () => {
    const colorManager = createMockColorManager({
      markedSubtreeSets: [],
      hasPivotEdges: () => true,
      isNodeDownstreamOfAnyPivotEdge: (node) => node.isDownstream
    });

    const downstreamNode = { split_indices: [1], isDownstream: true };
    const upstreamNode = { split_indices: [2], isDownstream: false };

    const opacityDownstream = applyDimmingWithCache(
      255, colorManager, downstreamNode, true,
      true, 0.3, // dimmingEnabled
      false, 0.5,
      []
    );

    const opacityUpstream = applyDimmingWithCache(
      255, colorManager, upstreamNode, true,
      true, 0.3,
      false, 0.5,
      []
    );

    // Downstream node should have full opacity
    expect(opacityDownstream).to.equal(255);
    // Upstream node should be dimmed
    expect(opacityUpstream).to.equal(Math.round(255 * 0.3));
  });
});

/**
 * Task 6: Integration test for scrubbing highlighting
 * Property 2: Scrub Position Highlighting Consistency
 * Validates: Requirements 1.1, 1.2, 1.3
 */
describe('Scrubbing Highlighting Integration', () => {
  let layerStyles;

  beforeEach(() => {
    layerStyles = new LayerStyles();
  });

  afterEach(() => {
    layerStyles.clearRenderCache();
    layerStyles.destroy();
  });

  it('should use correct highlighting when scrubbing to different positions', () => {
    // Simulate scrubbing to tree index 5 - ColorManager is updated with tree 5's data
    const tree5Subtrees = [new Set([50, 51, 52])];
    mockStoreState.currentTreeIndex = 0; // Store still has stale index
    mockStoreState.getMarkedSubtreeData = () => [new Set([1, 2, 3])]; // Store has stale data
    mockStoreState.getColorManager = () => createMockColorManager({
      markedSubtreeSets: tree5Subtrees // ColorManager has correct data
    });

    const cached = layerStyles.getCachedState();

    // Should use ColorManager's data (tree 5), not store's stale data
    expect(cached.markedSubtreeData).to.equal(tree5Subtrees);
    expect(cached.markedSubtreeData[0].has(50)).to.be.true;
    expect(cached.markedSubtreeData[0].has(1)).to.be.false;
  });

  it('should update highlighting as scrub position changes', () => {
    // First scrub position - tree index 3
    const tree3Subtrees = [new Set([30, 31])];
    mockStoreState.getColorManager = () => createMockColorManager({
      markedSubtreeSets: tree3Subtrees
    });

    const cached1 = layerStyles.getCachedState();
    expect(cached1.markedSubtreeData[0].has(30)).to.be.true;

    // Clear cache (simulating new render frame)
    layerStyles.clearRenderCache();

    // Second scrub position - tree index 7
    const tree7Subtrees = [new Set([70, 71, 72])];
    mockStoreState.getColorManager = () => createMockColorManager({
      markedSubtreeSets: tree7Subtrees
    });

    const cached2 = layerStyles.getCachedState();
    expect(cached2.markedSubtreeData[0].has(70)).to.be.true;
    expect(cached2.markedSubtreeData[0].has(30)).to.be.false;
  });

  it('should correctly dim nodes based on scrub position subtree data', () => {
    mockStoreState.subtreeDimmingEnabled = true;
    mockStoreState.subtreeDimmingOpacity = 0.4;

    // Scrub position has subtree with nodes 100, 101
    mockStoreState.getColorManager = () => createMockColorManager({
      markedSubtreeSets: [new Set([100, 101])]
    });

    const nodeInSubtree = { position: [0, 0, 0], split_indices: [100], opacity: 1 };
    const nodeOutsideSubtree = { position: [0, 0, 0], split_indices: [999], opacity: 1 };

    const cached = layerStyles.getCachedState();
    const colorInside = layerStyles.getNodeColor(nodeInSubtree, cached).slice();
    const colorOutside = layerStyles.getNodeColor(nodeOutsideSubtree, cached).slice();

    // Node inside subtree should have higher opacity than node outside
    expect(colorInside[3]).to.be.greaterThan(colorOutside[3]);
  });

  it('should correctly dim links based on scrub position subtree data', () => {
    mockStoreState.subtreeDimmingEnabled = true;
    mockStoreState.subtreeDimmingOpacity = 0.4;

    mockStoreState.getColorManager = () => createMockColorManager({
      markedSubtreeSets: [new Set([200, 201])]
    });

    const linkInSubtree = {
      path: [[0, 0, 0], [1, 1, 0]],
      split_indices: [200],
      opacity: 1
    };
    const linkOutsideSubtree = {
      path: [[0, 0, 0], [1, 1, 0]],
      split_indices: [888],
      opacity: 1
    };

    const cached = layerStyles.getCachedState();
    const colorInside = layerStyles.getLinkColor(linkInSubtree, cached).slice();
    const colorOutside = layerStyles.getLinkColor(linkOutsideSubtree, cached).slice();

    // Link inside subtree should have higher opacity than link outside
    expect(colorInside[3]).to.be.greaterThan(colorOutside[3]);
  });
});
