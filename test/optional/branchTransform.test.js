const { expect } = require('chai');
const {
  getMetricBranchLength,
  getVisualBranchLength,
  transformBranchLengths,
} = require('../../src/domain/tree/branchTransform.js');

describe('Domain/Tree/BranchTransform', () => {
  const sampleTree = {
    name: 'root',
    length: 0.1,
    children: [
      {
        name: 'child1',
        length: 0.0,
        children: [],
      },
      {
        name: 'child2',
        length: 0.5,
        children: [],
      },
      {
        name: 'child3',
        length: -0.1,
        children: [],
      },
    ],
  };

  function expectMetricAndVisual(node, metricLength, visualBranchLength) {
    expect(node.length).to.equal(metricLength);
    expect(node.metricBranchLength).to.equal(metricLength);
    expect(node.visualBranchLength).to.equal(visualBranchLength);
  }

  describe('transformType: none', () => {
    it('should preserve 0.0 value', () => {
      const result = transformBranchLengths(sampleTree, 'none');
      expectMetricAndVisual(result.children[0], 0, 0);
    });

    it('should preserve positive values', () => {
      const result = transformBranchLengths(sampleTree, 'none');
      expectMetricAndVisual(result, 0.1, 0.1);
      expectMetricAndVisual(result.children[1], 0.5, 0.5);
    });
  });

  describe('transformType: linear-scale', () => {
    it('should preserve metric lengths and scale visual positives', () => {
      const result = transformBranchLengths(sampleTree, 'linear-scale');
      expectMetricAndVisual(result.children[0], 0, 0);
      expectMetricAndVisual(result, 0.1, 0.2); // 0.1 * 2
      expectMetricAndVisual(result.children[1], 0.5, 1.0); // 0.5 * 2
    });

    it('should keep negative metric values while clamping visual values', () => {
      const result = transformBranchLengths(sampleTree, 'linear-scale');
      expectMetricAndVisual(result.children[2], -0.1, 0.001);
    });
  });

  describe('transformType: log', () => {
    it('should force visual 0.0 to 0.001', () => {
      const result = transformBranchLengths(sampleTree, 'log');
      expectMetricAndVisual(result.children[0], 0, 0.001);
    });

    it('should preserve metric values and transform visual positive values', () => {
      const result = transformBranchLengths(sampleTree, 'log');
      // result = Math.log10(value * 1000 + 1) * 0.1
      const expected = Math.log10(0.1 * 1000 + 1) * 0.1;
      expect(result.length).to.equal(0.1);
      expect(result.metricBranchLength).to.equal(0.1);
      expect(result.visualBranchLength).to.be.closeTo(expected, 1e-9);
    });
  });

  describe('transformType: sqrt', () => {
    it('should preserve 0.0', () => {
      const result = transformBranchLengths(sampleTree, 'sqrt');
      expectMetricAndVisual(result.children[0], 0, 0);
    });

    it('should preserve metric values and transform visual positive values', () => {
      const result = transformBranchLengths(sampleTree, 'sqrt');
      expectMetricAndVisual(result.children[1], 0.5, Math.sqrt(0.5));
    });
  });

  describe('transformType: ignore', () => {
    it('should preserve metric values while setting non-zero visual lengths to 1', () => {
      const result = transformBranchLengths(sampleTree, 'ignore');
      expectMetricAndVisual(result.children[0], 0, 0);
      expectMetricAndVisual(result, 0.1, 1);
      expectMetricAndVisual(result.children[1], 0.5, 1);
      expectMetricAndVisual(result.children[2], -0.1, 1);
    });
  });

  describe('tree-normalized transforms', () => {
    const asymmetricTree = {
      name: 'root',
      length: 10,
      children: [
        {
          name: 'short',
          length: 1,
          children: [],
        },
        {
          name: 'long-parent',
          length: 2,
          children: [
            {
              name: 'long-child',
              length: 2,
              children: [],
            },
          ],
        },
      ],
    };

    it('normalizes visual lengths to the tree root-to-tip maximum without changing metrics', () => {
      const result = transformBranchLengths(asymmetricTree, 'normalized');

      expectMetricAndVisual(result.children[0], 1, 0.25);
      expectMetricAndVisual(result.children[1], 2, 0.5);
      expectMetricAndVisual(result.children[1].children[0], 2, 0.5);
    });

    it('can normalize after square-root compression for readable relative geometry', () => {
      const result = transformBranchLengths(asymmetricTree, 'normalized-sqrt');
      const maxPath = Math.sqrt(2) + Math.sqrt(2);

      expect(result.children[0].length).to.equal(1);
      expect(result.children[0].metricBranchLength).to.equal(1);
      expect(result.children[0].visualBranchLength).to.be.closeTo(1 / maxPath, 1e-9);
      expect(result.children[1].visualBranchLength).to.be.closeTo(Math.sqrt(2) / maxPath, 1e-9);
      expect(result.children[1].children[0].visualBranchLength).to.be.closeTo(
        Math.sqrt(2) / maxPath,
        1e-9
      );
    });

    it('keeps exact zero visual lengths at zero during normalization', () => {
      const result = transformBranchLengths(sampleTree, 'normalized-sqrt');

      expectMetricAndVisual(result.children[0], 0, 0);
    });
  });

  describe('branch length accessors', () => {
    it('falls back to metric length when visual length is explicitly null', () => {
      const node = { length: 2, visualBranchLength: null };

      expect(getMetricBranchLength(node)).to.equal(2);
      expect(getVisualBranchLength(node)).to.equal(2);
    });
  });
});
