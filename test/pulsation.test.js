const { expect } = require('chai');
const proxyquire = require('proxyquire');

// Mock dependencies
const linkUtilsMock = {
  shouldHighlightMarkedSubtree: () => false,
  shouldHighlightHistorySubtree: () => false,
  getHistoryOutlineStyle: () => null,
  getMarkedHighlightColor: () => [255, 0, 0],
};

const visualHighlightsMock = {
  isLinkVisuallyHighlighted: (link, cm) => {
    // Mimic the logic: marked OR activeEdge
    return cm.isActiveChangeEdge(link);
  }
};

const dashUtilsMock = {
  calculateFlightDashArray: () => [5, 5]
};

const dimmingUtilsMock = {
  applyDimmingWithCache: (opacity) => opacity
};

const colorUtilsMock = {
  colorToRgb: () => [0, 0, 255], // Blue for active
  getContrastingHighlightColor: () => [255, 255, 255]
};

// Import the module under test with mocks
const { getLinkOutlineWidth, getLinkOutlineColor } = proxyquire('../src/js/treeVisualisation/deckgl/layers/styles/links/outline/linkOutlineStyles.js', {
  '../linkUtils.js': linkUtilsMock,
  '../../../../../systems/tree_color/visualHighlights.js': visualHighlightsMock,
  '../dashUtils.js': dashUtilsMock,
  '../../dimmingUtils.js': dimmingUtilsMock,
  '../../../../../../services/ui/colorUtils.js': colorUtilsMock,
  '../../../../../../constants/TreeColors.js': { TREE_COLOR_CATEGORIES: { activeChangeEdgeColor: '#0000FF' } }
});

describe('Link Outline Pulsation Logic', () => {
  let cachedState;
  let colorManagerMock;

  beforeEach(() => {
    colorManagerMock = {
      isActiveChangeEdge: () => false,
      isCompletedChangeEdge: () => false,
      isUpcomingChangeEdge: () => false,
      getBranchColorWithHighlights: () => '#0000FF',
      // We'll add this method to simulate our proposed fix check
      isLinkMovingSubtree: () => false,
    };

    cachedState = {
      colorManager: colorManagerMock,
      pulseOpacity: 0.5, // Halfway pulse
      upcomingChangesEnabled: false,
      markedSubtreesEnabled: true,
      highlightColorMode: 'solid'
    };

    // Helpers mock
    cachedState.helpers = {
      getBaseStrokeWidth: () => 2
    };
  });

  it('Standard active edge should pulse', () => {
    // Setup: It IS an active change edge
    colorManagerMock.isActiveChangeEdge = () => true;

    // Pulse calculation: base(2)*2 + 4 + (4 * 0.5) = 4 + 4 + 2 = 10
    const width = getLinkOutlineWidth({}, cachedState, cachedState.helpers);
    expect(width).to.equal(10);
  });

  it('Moving subtree (if active) currently pulses', () => {
    // Setup: It's active (because moving subtrees are considered active currently)
    colorManagerMock.isActiveChangeEdge = () => true;
    // And it IS a moving subtree
    colorManagerMock.isLinkMovingSubtree = () => true;

    const width = getLinkOutlineWidth({}, cachedState, cachedState.helpers);
    // NEW BEHAVIOR: Static width (base*2 + 8 = 12, mimicking marked subtree style)
    // We expect it NOT to be 10 (which is the pulse value for 0.5 opacity)
    expect(width).to.equal(12);
  });
});
