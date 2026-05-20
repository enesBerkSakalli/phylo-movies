const { expect } = require('chai');
const proxyquire = require('proxyquire');

// Mock dependencies
const nodeUtilsMock = {
  shouldHighlightNode: () => false,
  isHistorySubtreeNode: () => false,
};

// Import the module under test with mocks
const { getLabelSize } = proxyquire('../../src/treeVisualisation/deckgl/layers/styles/labels/labelStyles.js', {
  '../nodes/nodeUtils.js': nodeUtilsMock,
});

describe('Label Sizing Logic (TDD)', () => {
  const DEFAULT_FONT_SIZE = 2.6; // Typical store value
  const EXPECTED_BASE_PIXELS = DEFAULT_FONT_SIZE * 12; // 31.2

  let cachedState;

  beforeEach(() => {
    // Reset mock behaviors and state
    nodeUtilsMock.shouldHighlightNode = () => false;
    nodeUtilsMock.isHistorySubtreeNode = () => false;

    cachedState = {
      highlightedSubtreeData: [], // effectively empty, but present
      subtreeHighlightsEnabled: true,
    };
  });

  it('calculates standard label size correctly', () => {
    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS);
  });

  it('calculates subtree highlight label size', () => {
    nodeUtilsMock.shouldHighlightNode = () => true;
    cachedState.highlightedSubtreeData = ['some-tree'];

    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.2);
  });

  it('calculates history subtree label size (x1.1)', () => {
    nodeUtilsMock.isHistorySubtreeNode = () => true;

    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.1);
  });

  it('keeps labels visible inside actively moving subtrees', () => {
    cachedState.colorManager = {
      isNodeInActiveMoverSubtree: (node) => node?.id === 'moving-label'
    };

    const size = getLabelSize({ id: 'moving-label' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS);
  });

});
