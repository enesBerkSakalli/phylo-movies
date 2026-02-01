const { expect } = require('chai');
const proxyquire = require('proxyquire');

// Mock dependencies
const nodeUtilsMock = {
  toColorManagerNode: (node) => node, // Pass through
  shouldHighlightNode: () => false,
  isHistorySubtreeNode: () => false,
};

// Import the module under test with mocks
const { getLabelSize } = proxyquire('../src/js/treeVisualisation/deckgl/layers/styles/labels/labelStyles.js', {
  '../nodes/nodeUtils.js': nodeUtilsMock,
});

// Import constants directly (no dependencies)
const {
  SOURCE_LABEL_SCALE,
  DESTINATION_LABEL_SCALE,
} = require('../src/js/treeVisualisation/deckgl/layers/config/LabelConfig.js');

describe('Label Sizing Logic (TDD)', () => {
  const DEFAULT_FONT_SIZE = 2.6; // Typical store value
  const EXPECTED_BASE_PIXELS = DEFAULT_FONT_SIZE * 12; // 31.2

  let cachedState;

  beforeEach(() => {
    // Reset mock behaviors and state
    nodeUtilsMock.shouldHighlightNode = () => false;
    nodeUtilsMock.isHistorySubtreeNode = () => false;

    cachedState = {
      markedSubtreeData: [], // effectively empty, but present
      markedSubtreesEnabled: true,
    };
  });

  it('calculates standard label size correctly', () => {
    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS);
  });

  it('calculates marked subtree label size (x1.8)', () => {
    nodeUtilsMock.shouldHighlightNode = () => true;
    cachedState.markedSubtreeData = ['some-tree'];

    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.8);
  });

  it('calculates history subtree label size (x1.1)', () => {
    nodeUtilsMock.isHistorySubtreeNode = () => true;

    const size = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState);
    expect(size).to.equal(EXPECTED_BASE_PIXELS * 1.1);
  });

  it('verifies Source Labels stay at baseline (ignore highlight multipliers)', () => {
    // Even if marked
    nodeUtilsMock.shouldHighlightNode = () => true;
    cachedState.markedSubtreeData = ['some-tree'];

    // We pass true to getLabelSize to ignore context
    const baseSize = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState, true);
    const effectiveSize = baseSize * SOURCE_LABEL_SCALE;

    // Should be Base * 1.15
    expect(effectiveSize).to.closeTo(EXPECTED_BASE_PIXELS * 1.15, 0.001);
  });

  it('verifies Destination Labels stay at baseline (ignore highlight multipliers)', () => {
    // Even if history
    nodeUtilsMock.isHistorySubtreeNode = () => true;

    const baseSize = getLabelSize({ id: 'node1' }, DEFAULT_FONT_SIZE, cachedState, true);
    const effectiveSize = baseSize * DESTINATION_LABEL_SCALE;

    // Should be Base * 1.3
    expect(effectiveSize).to.closeTo(EXPECTED_BASE_PIXELS * 1.3, 0.001);
  });
});
