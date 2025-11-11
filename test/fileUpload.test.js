const { expect } = require('chai');

const {
  getNodeKey,
  getLabelKey,
  getLinkKey,
  getExtensionKey,
} = require('../src/js/treeVisualisation/utils/KeyGenerator.js');

describe('KeyGenerator', () => {
  it('generates node keys from split_indices and falls back to name', () => {
    const nodeA = { data: { split_indices: [1, 2, 3] } };
    expect(getNodeKey(nodeA)).to.equal('node-1-2-3');

    const nodeB = { data: { name: 'A B/C' } };
    expect(getNodeKey(nodeB)).to.equal('node-A_B_C');
  });

  it('generates label/extension keys and link keys with root handling', () => {
    const leaf = { data: { split_indices: [7] } };
    expect(getLabelKey(leaf)).to.equal('label-7');
    expect(getExtensionKey(leaf)).to.equal('ext-7');

    const link = {
      source: { data: { split_indices: [0] }, parent: null },
      target: { data: { split_indices: [7] } },
    };
    expect(getLinkKey(link)).to.equal('link-root-7');
  });
});

