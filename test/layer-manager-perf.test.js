// Ignore style imports required by downstream modules
require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require.extensions['.sass'] = () => {};

const { expect } = require('chai');
const { resetPerf, getPerfSnapshot } = require('../src/js/treeVisualisation/deckgl/layers/layerFactories/index.js');
const { LayerManager } = require('../src/js/treeVisualisation/deckgl/layers/LayerManager.js');

describe('LayerManager perf (direct creation)', function () {
  it('creates layers directly for reliable updates', function () {
    // reset counters
    resetPerf();

    const manager = new LayerManager();

    // baseline creations should be 0 (no pre-created base layers)
    const afterCtor = getPerfSnapshot().layerCreations;

    // Simulate a couple of render cycles
    const data = { nodes: new Array(100).fill(0).map((_, i) => ({ position: [i, 0, 0] })), links: new Array(80).fill(0).map((_, i) => ({ path: [[i,0,0],[i+1,0,0]] })), labels: [], extensions: [], connectors: [] };

    manager.createTreeLayers(data);
    manager.createTreeLayers(data);

    const afterRenders = getPerfSnapshot().layerCreations;

    console.log('[PERF TEST] creations after ctor:', afterCtor, 'after renders:', afterRenders);

    // Expect 6 layers created per render cycle (6 layer types)
    expect(afterRenders).to.equal(afterCtor + 12); // 6 layers × 2 render cycles
  });
});
