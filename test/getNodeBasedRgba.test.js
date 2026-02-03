import { expect } from 'chai';
import { getNodeBasedRgba } from '../src/js/treeVisualisation/deckgl/layers/styles/nodes/nodeStyles.js';

// Minimal helper shim mirroring LayerStyles._styleHelpers
const helpers = {
  getBaseOpacity(value) {
    return value !== undefined ? Math.round(value * 255) : 255;
  }
};

describe('getNodeBasedRgba', () => {
  let cached;
  let colorManager;
  let node;

  beforeEach(() => {
    node = { id: 'n1' };
    colorManager = {
      getNodeColor: () => '#000000',
      getNodeBaseColor: () => '#000000',
      isNodeSourceEdge: () => false,
      isNodeDestinationEdge: () => false,
      hasActiveChangeEdges: () => false,
      isNodeDownstreamOfAnyActiveChangeEdge: () => false,
      sharedMarkedJumpingSubtrees: []
    };

    cached = {
      colorManager,
      dimmingEnabled: false,
      dimmingOpacity: 0.3,
      subtreeDimmingEnabled: false,
      subtreeDimmingOpacity: 0.3,
      markedSubtreeData: null,
      markedSubtreesEnabled: false, // disable subtree checks to avoid split index lookups
      highlightSourceEnabled: false,
      highlightDestinationEnabled: false,
      highlightColorMode: 'solid',
      markedColor: '#10b981'
    };
  });

  it('returns highlight color when source highlight is enabled', () => {
    cached.highlightSourceEnabled = true;
    colorManager.isNodeSourceEdge = () => true;

    const result = getNodeBasedRgba(node, undefined, cached, helpers);

    expect(result).to.deep.equal([16, 185, 129, 255]); // markedColor solid highlight
  });

  it('uses ColorManager base color when not highlighted', () => {
    colorManager.getNodeColor = () => '#112233';
    colorManager.getNodeBaseColor = () => '#112233';

    const result = getNodeBasedRgba(node, 0.5, cached, helpers);

    expect(result).to.deep.equal([17, 34, 51, 128]); // 0.5 * 255 rounded
  });

  it('applies dimming when active change edges are present and node is unrelated', () => {
    cached.dimmingEnabled = true;
    cached.dimmingOpacity = 0.3;
    colorManager.hasActiveChangeEdges = () => true;
    colorManager.isNodeDownstreamOfAnyActiveChangeEdge = () => false;

    const result = getNodeBasedRgba(node, 1, cached, helpers);

    // 255 * 0.3 = 76.5 -> rounded to 77 by applyDimmingWithCache
    expect(result[3]).to.equal(77);
    expect(result.slice(0, 3)).to.deep.equal([0, 0, 0]);
  });
});
