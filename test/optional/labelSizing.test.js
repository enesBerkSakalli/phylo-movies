const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

const { getLabelSize } = proxyquire(
  '../../src/treeVisualisation/deckgl/layers/styles/labels/labelStyles.js',
  {
    '../nodes/nodeStyles.js': {
      getNodeBasedRgba: () => [0, 0, 0, 255],
    },
  }
);

describe('Label Sizing Logic (TDD)', () => {
  const DEFAULT_FONT_SIZE = 2.6; // Typical store value
  const EXPECTED_BASE_PIXELS = DEFAULT_FONT_SIZE * 12; // 31.2

  let cachedState;

  beforeEach(() => {
    cachedState = {
      highlightedSubtreeData: [], // effectively empty, but present
      subtreeHighlightsEnabled: true,
      colorManager: {
        isNodeCompletedChangeEdge: () => false,
        isNodeUpcomingChangeEdge: () => false,
        isNodePivotEdge: () => false,
        isNodeHistorySubtree: () => false,
        isNodeSourceEdge: () => false,
        isNodeDestinationEdge: () => false,
        isNodeInActiveMoverSubtree: () => false,
      },
    };
  });

  it('calculates standard label size correctly', () => {
    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS);
  });

  it('calculates subtree highlight label size', () => {
    cachedState.highlightedSubtreeData = [new Set([1])];

    const size = getLabelSize({ id: 'node1', split_indices: [1] }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.2);
  });

  it('calculates history subtree label size (x1.1)', () => {
    cachedState.colorManager.isNodeHistorySubtree = () => true;

    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.1);
  });

  it('keeps labels visible inside actively moving subtrees', () => {
    cachedState.colorManager = {
      ...cachedState.colorManager,
      isNodeInActiveMoverSubtree: (node) => node?.id === 'moving-label',
    };

    const size = getLabelSize({ id: 'moving-label' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.2);
  });
});
