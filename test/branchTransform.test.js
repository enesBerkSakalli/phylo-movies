const { expect } = require('chai');
const { transformBranchLengths } = require('../src/js/domain/tree/branchTransform.js');

describe('Domain/Tree/BranchTransform', () => {
  const sampleTree = {
    name: 'root',
    branch_length: 0.1,
    length: 0.1,
    children: [
      {
        name: 'child1',
        branch_length: 0.0,
        length: 0.0,
        children: []
      },
      {
        name: 'child2',
        branch_length: 0.5,
        length: 0.5,
        children: []
      },
      {
        name: 'child3',
        branch_length: -0.1, // Negative test case
        length: -0.1,
        children: []
      }
    ]
  };

  describe('transformType: none', () => {
    it('should preserve 0.0 value', () => {
      const result = transformBranchLengths(sampleTree, 'none');
      expect(result.children[0].length).to.equal(0);
      expect(result.children[0].branch_length).to.equal(0);
    });

    it('should preserve positive values', () => {
      const result = transformBranchLengths(sampleTree, 'none');
      expect(result.length).to.equal(0.1);
      expect(result.children[1].length).to.equal(0.5);
    });
  });

  describe('transformType: linear-scale', () => {
    it('should preserve 0.0 value and scale positives', () => {
      const result = transformBranchLengths(sampleTree, 'linear-scale');
      expect(result.children[0].length).to.equal(0);
      expect(result.length).to.equal(0.2); // 0.1 * 2
      expect(result.children[1].length).to.equal(1.0); // 0.5 * 2
    });

    it('should force negative values to 0.001', () => {
      const result = transformBranchLengths(sampleTree, 'linear-scale');
      expect(result.children[2].length).to.equal(0.001);
    });
  });

  describe('transformType: log', () => {
    it('should force 0.0 to 0.001', () => {
      const result = transformBranchLengths(sampleTree, 'log');
      expect(result.children[0].length).to.equal(0.001);
    });

    it('should transform positive values', () => {
      const result = transformBranchLengths(sampleTree, 'log');
      // result = Math.log10(value * 1000 + 1) * 0.1
      const expected = Math.log10(0.1 * 1000 + 1) * 0.1;
      expect(result.length).to.be.closeTo(expected, 1e-9);
    });
  });

  describe('transformType: sqrt', () => {
    it('should preserve 0.0', () => {
      const result = transformBranchLengths(sampleTree, 'sqrt');
      expect(result.children[0].length).to.equal(0);
    });

    it('should transform positive values', () => {
      const result = transformBranchLengths(sampleTree, 'sqrt');
      expect(result.children[1].length).to.equal(Math.sqrt(0.5));
    });
  });

  describe('transformType: ignore', () => {
    it('should preserve 0.0 and set others to 1', () => {
      const result = transformBranchLengths(sampleTree, 'ignore');
      expect(result.children[0].length).to.equal(0);
      expect(result.length).to.equal(1);
      expect(result.children[1].length).to.equal(1);
    });
  });
});
