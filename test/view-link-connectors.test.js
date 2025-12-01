const { expect } = require('chai');
const { ComparisonModeRenderer } = require('../src/js/treeVisualisation/comparison/ComparisonModeRenderer.js');

// Helper to make a position map entry
function makePos(key, x, y, isLeaf = true) {
  return [key, { position: [x, y, 0], isLeaf, node: { data: { split_indices: key.split('-').map(Number) } } }];
}

describe('ComparisonModeRenderer connector building', () => {
  let renderer;

  beforeEach(() => {
    renderer = new ComparisonModeRenderer({ _getState: () => ({}) });
  });

  it('connects matching leaves for group mappings (exact split-index keys)', () => {
    const mapping = { '10-11-12-13': ['13'] };
    const leftPositions = new Map([makePos('13', 0, 0)]);
    const rightPositions = new Map([makePos('13', 10, 0)]);

    const connectors = renderer._buildConnectorSegments(mapping, leftPositions, rightPositions);
    expect(connectors).to.have.length(1);
    expect(connectors[0].sourceKey).to.equal('10-11-12-13');
    expect(connectors[0].targetKey).to.equal('13');
    expect(connectors[0].path[0]).to.deep.equal([0, 0, 0]);
    expect(connectors[0].path[connectors[0].path.length - 1]).to.deep.equal([10, 0, 0]);
  });

  it('does not connect when no leaf IDs intersect', () => {
    const mapping = { '2-3-4': ['9-10'] };
    const leftPositions = new Map([makePos('7', 0, 0)]);
    const rightPositions = new Map([makePos('8', 10, 0)]);

    const connectors = renderer._buildConnectorSegments(mapping, leftPositions, rightPositions);
    expect(connectors).to.have.length(0);
  });
});

/**
 * Note on potential mismatches:
 * - We match leaves by the exact split-index keys coming from the backend (e.g., "13").
 * - If the backend mapping points to internal groups (e.g., "2-3-4-5-6-...") but the leaves on each tree
 *   do not share the same split-index parts, connectors will not be built (as seen with small_example.newick).
 * - To improve robustness on such data, mappings would need to expand to descendant leaves or match by taxon name,
 *   not just exact split-index strings.
 */
