const { expect } = require('chai');

/**
 * Tests for ComparisonModeRenderer connector building logic.
 * Verifies that connectors use the same subset logic as TreeColorManager._isComponentMarked
 *
 * Key distinction:
 * - currentActiveChangeEdges (blue) = entire subtree being animated
 * - marked (red) = specific jumping/moving subtrees - THIS is what connectors use
 */

/**
 * Extracted connector filtering logic for testing.
 * This mirrors the subset check in ComparisonModeRenderer._buildConnectors
 *
 * @param {Map} leftPositions - Position map with leaf info
 * @param {Array} markedComponents - Array of Sets representing marked subtrees
 * @returns {Array} Leaves that are part of any marked component
 */
function filterLeavesInMarkedComponents(leftPositions, markedComponents) {
  const matchingLeaves = [];

  for (const [key, leftInfo] of leftPositions) {
    if (!leftInfo?.isLeaf || !leftInfo.name) continue;

    // Parse split indices from key (format: "10" or "10-11-12")
    const splitIndices = key.split('-').map(Number).filter(n => !isNaN(n));
    if (splitIndices.length === 0) continue;

    // Check if this leaf's split is a subset of ANY marked component
    let isMarked = false;
    for (const component of markedComponents) {
      const markedSet = component instanceof Set ? component : new Set(component);
      const isSubset = splitIndices.every(leaf => markedSet.has(leaf));
      const isProperSubset = splitIndices.length <= markedSet.size && isSubset;
      if (isProperSubset) {
        isMarked = true;
        break;
      }
    }
    if (!isMarked) continue;

    matchingLeaves.push({ key, ...leftInfo });
  }

  return matchingLeaves;
}

/**
 * Mirrors TreeColorManager._isComponentMarked subset logic
 */
function isComponentMarkedSubset(splitIndices, markedSet) {
  if (!Array.isArray(splitIndices) || !(markedSet instanceof Set)) return false;
  if (splitIndices.length === 0) return false;

  // Check if splitIndices is a subset of markedSet
  const isSubset = splitIndices.every(leaf => markedSet.has(leaf));
  const isProperSubset = splitIndices.length <= markedSet.size && isSubset;
  return isProperSubset;
}

describe('View Link Connectors - Subset Logic', () => {
  describe('filterLeavesInMarkedComponents', () => {
    it('returns leaves whose split is a subset of any marked component', () => {
      // Marked components represent the specific moving subtrees (red highlighting)
      // In this example, leaves 10,11 are one mover, leaves 12,13 are another mover
      const markedComponents = [
        new Set([10, 11]),  // First mover
        new Set([12, 13]),  // Second mover
      ];

      // Position map with various leaves
      const leftPositions = new Map([
        ['10', { isLeaf: true, name: 'Leaf10', position: [0, 0] }],
        ['11', { isLeaf: true, name: 'Leaf11', position: [0, 10] }],
        ['12', { isLeaf: true, name: 'Leaf12', position: [0, 20] }],
        ['13', { isLeaf: true, name: 'Leaf13', position: [0, 30] }],
        ['5', { isLeaf: true, name: 'Leaf5', position: [0, 40] }],   // NOT in any marked
        ['6', { isLeaf: true, name: 'Leaf6', position: [0, 50] }],   // NOT in any marked
        ['10-11', { isLeaf: false, name: null, position: [0, 60] }], // Internal node
      ]);

      const result = filterLeavesInMarkedComponents(leftPositions, markedComponents);

      expect(result).to.have.lengthOf(4);
      expect(result.map(r => r.name)).to.include.members(['Leaf10', 'Leaf11', 'Leaf12', 'Leaf13']);
      expect(result.map(r => r.name)).to.not.include('Leaf5');
      expect(result.map(r => r.name)).to.not.include('Leaf6');
    });

    it('only connects leaves within marked components, not entire active subtree', () => {
      // Active change edge might be [10,11,12,13,14,15] (whole subtree)
      // But marked is only [10,11] (the specific mover)
      // Connectors should only show for 10,11
      const markedComponents = [
        new Set([10, 11]),  // Only this subtree is the "mover"
      ];

      const leftPositions = new Map([
        ['10', { isLeaf: true, name: 'Leaf10', position: [0, 0] }],
        ['11', { isLeaf: true, name: 'Leaf11', position: [0, 10] }],
        ['12', { isLeaf: true, name: 'Leaf12', position: [0, 20] }],  // In active edge but NOT marked
        ['13', { isLeaf: true, name: 'Leaf13', position: [0, 30] }],  // In active edge but NOT marked
      ]);

      const result = filterLeavesInMarkedComponents(leftPositions, markedComponents);

      expect(result).to.have.lengthOf(2);
      expect(result.map(r => r.name)).to.deep.equal(['Leaf10', 'Leaf11']);
    });

    it('returns empty array when no marked components', () => {
      const markedComponents = [];

      const leftPositions = new Map([
        ['10', { isLeaf: true, name: 'Leaf10', position: [0, 0] }],
      ]);

      const result = filterLeavesInMarkedComponents(leftPositions, markedComponents);
      expect(result).to.have.lengthOf(0);
    });

    it('returns empty array when no leaves match', () => {
      const markedComponents = [new Set([100, 101, 102])];

      const leftPositions = new Map([
        ['10', { isLeaf: true, name: 'Leaf10', position: [0, 0] }],
        ['11', { isLeaf: true, name: 'Leaf11', position: [0, 10] }],
      ]);

      const result = filterLeavesInMarkedComponents(leftPositions, markedComponents);
      expect(result).to.have.lengthOf(0);
    });

    it('skips internal nodes (isLeaf=false)', () => {
      const markedComponents = [new Set([10, 11, 12])];

      const leftPositions = new Map([
        ['10', { isLeaf: true, name: 'Leaf10', position: [0, 0] }],
        ['10-11', { isLeaf: false, name: null, position: [0, 10] }],   // Internal
        ['10-11-12', { isLeaf: false, name: null, position: [0, 20] }], // Internal
      ]);

      const result = filterLeavesInMarkedComponents(leftPositions, markedComponents);
      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('Leaf10');
    });
  });

  describe('isComponentMarkedSubset (TreeColorManager logic)', () => {
    it('returns true when split is exact match', () => {
      const split = [10, 11, 12, 13];
      const markedSet = new Set([10, 11, 12, 13]);

      expect(isComponentMarkedSubset(split, markedSet)).to.be.true;
    });

    it('returns true when split is proper subset', () => {
      const split = [10];  // Single leaf
      const markedSet = new Set([10, 11, 12, 13]);

      expect(isComponentMarkedSubset(split, markedSet)).to.be.true;
    });

    it('returns false when split has elements not in marked set', () => {
      const split = [10, 11, 99];  // 99 is not in marked set
      const markedSet = new Set([10, 11, 12, 13]);

      expect(isComponentMarkedSubset(split, markedSet)).to.be.false;
    });

    it('returns false for empty split', () => {
      const split = [];
      const markedSet = new Set([10, 11, 12, 13]);

      expect(isComponentMarkedSubset(split, markedSet)).to.be.false;
    });

    it('returns false when marked set is empty', () => {
      const split = [10];
      const markedSet = new Set();

      expect(isComponentMarkedSubset(split, markedSet)).to.be.false;
    });
  });

  describe('consistency with TreeColorManager', () => {
    it('connector filtering should match TreeColorManager subset logic', () => {
      // This test verifies that our connector filtering matches
      // the TreeColorManager._isComponentMarked behavior

      // Simulated marked component (the specific moving subtree)
      const markedSet = new Set([10, 11, 12, 13]);

      // Test cases: [split_indices, expected_result]
      const testCases = [
        [[10], true],              // Single leaf in mover
        [[11], true],              // Single leaf in mover
        [[10, 11], true],          // Internal node split - subset
        [[10, 11, 12, 13], true],  // Exact match (root of moving subtree)
        [[5], false],              // Leaf outside mover
        [[5, 6], false],           // Internal node outside mover
        [[10, 99], false],         // Partial overlap - NOT a subset
        [[], false],               // Empty split
      ];

      testCases.forEach(([split, expected]) => {
        const result = isComponentMarkedSubset(split, markedSet);
        expect(result).to.equal(expected,
          `Split [${split.join(',')}] should ${expected ? '' : 'NOT '}be subset of marked`);
      });
    });
  });
});

