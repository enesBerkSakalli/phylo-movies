const { expect } = require('chai');

const { getNodeKey } = require('../src/domain/tree/splits.js');

describe('render split keys', () => {
  it('generates node keys from split_indices only', () => {
    const nodeA = { split_indices: [1, 2, 3] };
    // Hash for [1,2,3] is '09f8718777cb5b02'
    expect(getNodeKey(nodeA)).to.equal('node-09f8718777cb5b02');

    const nodeB = { data: { name: 'A B/C' } };
    expect(getNodeKey(nodeB)).to.equal(null);
  });
});
