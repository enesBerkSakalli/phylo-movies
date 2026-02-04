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
    // Hash for [1,2,3] is '09f8718777cb5b02'
    expect(getNodeKey(nodeA)).to.equal('node-09f8718777cb5b02');

    const nodeB = { data: { name: 'A B/C' } };
    expect(getNodeKey(nodeB)).to.equal('node-A_B_C');
  });

  it('generates label/extension keys and link keys', () => {
    const leaf = { data: { split_indices: [7] } };
    // Hash for [7] is '78c951c908d5d6fd'
    expect(getLabelKey(leaf)).to.equal('label-78c951c908d5d6fd');
    expect(getExtensionKey(leaf)).to.equal('ext-78c951c908d5d6fd');

    const link = {
      source: { data: { split_indices: [0] }, parent: null },
      target: { data: { split_indices: [7] } },
    };
    expect(getLinkKey(link)).to.equal('link-78c951c908d5d6fd');
  });
});

