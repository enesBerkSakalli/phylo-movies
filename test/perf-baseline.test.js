/* Perf baseline measurement for layer instantiation
   Runs a simple simulation that creates several layers to capture baseline
   layer instantiation counts and timings (when PERF_DEBUG=1).
*/
// Ignore style imports required by downstream modules
require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require.extensions['.sass'] = () => {};

const { expect } = require('chai');
const { getPerfSnapshot, resetPerf } = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');
const { createLinksLayer, createLinkOutlinesLayer, createExtensionsLayer, createNodesLayer, createLabelsLayer, createConnectorsLayer } = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');
const { LayerStyles } = require('../src/js/treeVisualisation/deckgl/layers/LayerStyles.js');
const { useAppStore } = require('../src/js/core/store.js');

describe('Perf Baseline - Layer Instantiation', function () {
  it('collects layer creation metrics for representative tree sizes', function () {
    // Enable debug timings via environment variable externally (PERF_DEBUG=1)
    const state = useAppStore.getState();
    const ls = new LayerStyles();

    resetPerf();

    // Simulate medium-sized dataset
    const nodes = new Array(500).fill(0).map((_, i) => ({ position: [i, 0, 0] }));
    const links = new Array(400).fill(0).map((_, i) => ({ path: [[i, 0, 0], [i + 1, 0, 0]] }));
    const labels = new Array(500).fill(0).map((_, i) => ({ position: [i, 0, 0], text: 'x', rotation: 0, textAnchor: 'start' }));

    createLinkOutlinesLayer(links, state, ls);
    createLinksLayer(links, state, ls);
    createExtensionsLayer([], state, ls);
    createConnectorsLayer([], state);
    createNodesLayer(nodes, state, ls);
    createLabelsLayer(labels, state, ls);

    const snapshot = getPerfSnapshot();
    console.log('[PERF BASELINE] Layer creations:', snapshot.layerCreations, 'times sample (ms):', snapshot.creationTimes.slice(0, 10));

    // Basic sanity: should have created at least one layer
    expect(snapshot.layerCreations).to.be.greaterThan(0);
  });
});
