const { expect } = require('chai');
const proxyquire = require('proxyquire');

// Mock dependencies
const linkUtilsMock = {
  shouldHighlightLink: () => false,
  getHistoryOutlineStyle: () => null,
  getSubtreeHighlightRgb: () => [255, 0, 0],
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
const { getLinkOutlineWidth } = proxyquire('../../src/treeVisualisation/deckgl/layers/styles/links/outline/linkOutlineStyles.js', {
  '../linkUtils.js': linkUtilsMock,
  '../../../../../systems/tree_color/visualHighlights.js': visualHighlightsMock,
  '../dashUtils.js': dashUtilsMock,
  '../../dimmingUtils.js': dimmingUtilsMock,
  '../../../../../../services/ui/colorUtils.js': colorUtilsMock,
  '../../../../../../constants/TreeColors.js': { SYSTEM_TREE_COLORS: { activeChangeEdgeColor: '#0000FF' } }
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
      isLinkInActiveMoverSubtree: () => false,
    };

    cachedState = {
      colorManager: colorManagerMock,
      pulseOpacity: 0.5, // Halfway pulse
      upcomingChangesEnabled: false,
      subtreeHighlightsEnabled: true,
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

  it('active mover edges use the active-edge pulse when not subtree-highlighted', () => {
    // Setup: It is active because moving subtrees can also be active edges.
    colorManagerMock.isActiveChangeEdge = () => true;
    // And it is an active mover subtree, but not a subtree-highlight outline.
    colorManagerMock.isLinkInActiveMoverSubtree = () => true;

    const width = getLinkOutlineWidth({}, cachedState, cachedState.helpers);
    expect(width).to.equal(10);
  });
});
