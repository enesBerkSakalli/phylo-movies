const { expect } = require('chai');
const { resetPerf, getPerfSnapshot } = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');
const {
  createLinksLayer,
  createLinkOutlinesLayer,
  createExtensionsLayer,
  createNodesLayer,
  createLabelsLayer,
  createConnectorsLayer,
  getLinkOutlinesLayerProps,
  getLinksLayerProps,
  getExtensionsLayerProps,
  getNodesLayerProps,
  getLabelsLayerProps,
  getConnectorsLayerProps
} = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');

describe('Layer factory perf (isolated, fake LayerStyles)', function () {
  it('verifies cloning strategy prevents repeated instantiation', function () {
    const fakeLayerStyles = {
      getCachedState: () => ({
        colorManager: { hasActiveChangeEdges: () => false, sharedMarkedJumpingSubtrees: [] },
        dimmingEnabled: false,
        subtreeDimmingEnabled: false,
        pulseOpacity: 1.0,
        dashingEnabled: false,
        upcomingChangesEnabled: false
      }),
      getLinkOutlineColor: () => [0, 0, 0, 255],
      getLinkOutlineWidth: () => 1,
      getLinkOutlineDashArray: () => null,
      getLinkColor: () => [0, 0, 0, 255],
      getLinkWidth: () => 1,
      getLinkDashArray: () => null,
      getExtensionColor: () => [0, 0, 0, 255],
      getExtensionWidth: () => 1,
      getNodeRadius: () => 3,
      getNodeColor: () => [0, 0, 0, 255],
      getNodeBorderColor: () => [0, 0, 0, 255],
      getLabelSize: () => 10,
      getLabelColor: () => [0, 0, 0, 255]
    };

    const fakeState = { colorVersion: 0, strokeWidth: 2, changePulsePhase: 0, activeEdgeDashingEnabled: false, changePulseEnabled: false, upcomingChangesEnabled: false, taxaColorVersion: 0, nodeSize: 1, linkConnectionOpacity: 0.6 };

    const nodes = new Array(100).fill(0).map((_, i) => ({ position: [i, 0, 0] }));
    const links = new Array(80).fill(0).map((_, i) => ({ path: [[i, 0, 0], [i + 1, 0, 0]] }));
    const labels = new Array(100).fill(0).map((_, i) => ({ position: [i, 0, 0], text: 'x', rotation: 0, textAnchor: 'start' }));

    // Strategy A
    resetPerf();
    for (let r = 0; r < 5; r++) {
      createLinkOutlinesLayer(links, fakeState, fakeLayerStyles);
      createLinksLayer(links, fakeState, fakeLayerStyles);
      createExtensionsLayer([], fakeState, fakeLayerStyles);
      createConnectorsLayer([], fakeState);
      createNodesLayer(nodes, fakeState, fakeLayerStyles);
      createLabelsLayer(labels, fakeState, fakeLayerStyles);
    }
    const instA = getPerfSnapshot().layerCreations;

    // Strategy B
    resetPerf();
    const baseLinkOutlines = createLinkOutlinesLayer([], fakeState, fakeLayerStyles);
    const baseLinks = createLinksLayer([], fakeState, fakeLayerStyles);
    const baseExtensions = createExtensionsLayer([], fakeState, fakeLayerStyles);
    const baseConnectors = createConnectorsLayer([], fakeState);
    const baseNodes = createNodesLayer([], fakeState, fakeLayerStyles);
    const baseLabels = createLabelsLayer([], fakeState, fakeLayerStyles);

    for (let r = 0; r < 5; r++) {
      baseLinkOutlines.clone(getLinkOutlinesLayerProps(links, fakeState, fakeLayerStyles));
      baseLinks.clone(getLinksLayerProps(links, fakeState, fakeLayerStyles));
      baseExtensions.clone(getExtensionsLayerProps([], fakeState, fakeLayerStyles));
      baseConnectors.clone(getConnectorsLayerProps([], fakeState));
      baseNodes.clone(getNodesLayerProps(nodes, fakeState, fakeLayerStyles));
      baseLabels.clone(getLabelsLayerProps(labels, fakeState, fakeLayerStyles));
    }
    const instB = getPerfSnapshot().layerCreations;

    console.log('[PERF ISOLATED] A:', instA, 'B:', instB);

    expect(instA).to.be.greaterThan(instB);
    expect(instB).to.equal(6);
  });
});
