// Ignore style imports that downstream modules may pull in
require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require.extensions['.sass'] = () => {};

const { expect } = require('chai');
const { resetPerf, getPerfSnapshot } = require('../src/js/treeVisualisation/deckgl/layers/factory/index.js');
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
} = require('../src/js/treeVisualisation/deckgl/layers/factory/index.js');
const { LayerStyles } = require('../src/js/treeVisualisation/deckgl/layers/LayerStyles.js');
const { useAppStore } = require('../src/js/core/store.js');

describe('Layer factory strategies comparison', function () {
  it('measures instantiation count for instantiate-each-render vs base+clone', function () {
    const state = useAppStore.getState();
    const ls = new LayerStyles();

    // Sample data
    const nodes = new Array(100).fill(0).map((_, i) => ({ position: [i, 0, 0] }));
    const links = new Array(80).fill(0).map((_, i) => ({ path: [[i, 0, 0], [i + 1, 0, 0]] }));
    const labels = new Array(100).fill(0).map((_, i) => ({ position: [i, 0, 0], text: 'x', rotation: 0, textAnchor: 'start' }));

    // Strategy A: instantiate each render
    resetPerf();
    for (let r = 0; r < 3; r++) {
      createLinkOutlinesLayer(links, state, ls);
      createLinksLayer(links, state, ls);
      createExtensionsLayer([], state, ls);
      createConnectorsLayer([], state);
      createNodesLayer(nodes, state, ls);
      createLabelsLayer(labels, state, ls);
    }
    const instCountA = getPerfSnapshot().layerCreations;

    // Strategy B: base + clone
    resetPerf();
    const baseLinkOutlines = createLinkOutlinesLayer([], state, ls);
    const baseLinks = createLinksLayer([], state, ls);
    const baseExtensions = createExtensionsLayer([], state, ls);
    const baseConnectors = createConnectorsLayer([], state);
    const baseNodes = createNodesLayer([], state, ls);
    const baseLabels = createLabelsLayer([], state, ls);

    for (let r = 0; r < 3; r++) {
      baseLinkOutlines.clone(getLinkOutlinesLayerProps(links, state, ls));
      baseLinks.clone(getLinksLayerProps(links, state, ls));
      baseExtensions.clone(getExtensionsLayerProps([], state, ls));
      baseConnectors.clone(getConnectorsLayerProps([], state));
      baseNodes.clone(getNodesLayerProps(nodes, state, ls));
      baseLabels.clone(getLabelsLayerProps(labels, state, ls));
    }
    const instCountB = getPerfSnapshot().layerCreations;

    console.log('[PERF STRATEGY] A:', instCountA, 'B:', instCountB);

    // A should be > B and B should equal number of base layers (6)
    expect(instCountA).to.be.greaterThan(instCountB);
    expect(instCountB).to.equal(6);
  });
});
