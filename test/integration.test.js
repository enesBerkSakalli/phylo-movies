const { expect } = require('chai');

const {
  computeExtensionChangeMetrics,
  classifyExtensionChanges,
} = require('../src/js/treeVisualisation/utils/ChangeMetricUtils.js');

// Include DeckTimelineRenderer tests (mocked deck.gl)
require('./deck-timeline-renderer.test.js');


describe('ChangeMetricUtils – extension deltas & classification', () => {
  const mkLeaf = (id, angle, radius) => ({
    data: { split_indices: [id] },
    angle,
    radius,
  });

  const mkLayout = (leaves) => ({
    max_radius: Math.max(...leaves.map(l => l.radius)),
    tree: {
      leaves: () => leaves,
    },
  });

  it('computes average weighted change between two layouts', () => {
    const layoutA = mkLayout([
      mkLeaf(1, 0.0, 10),
      mkLeaf(2, Math.PI / 2, 15),
    ]);
    const layoutB = mkLayout([
      mkLeaf(1, 0.1, 12),
      mkLeaf(2, Math.PI / 2 + 0.2, 14),
    ]);
    const m = computeExtensionChangeMetrics(layoutA, layoutB);
    expect(m.compared).to.equal(2);
    expect(m.averageChange).to.be.greaterThan(0);
  });

  it('classifies enter/update/exit between layouts', () => {
    const layoutA = mkLayout([
      mkLeaf(1, 0.0, 10),
      mkLeaf(2, Math.PI / 2, 15),
    ]);
    const layoutB = mkLayout([
      mkLeaf(1, 0.1, 12),
      mkLeaf(3, 1.0, 9),
    ]);
    const { enter, update, exit } = classifyExtensionChanges(layoutA, layoutB);
    // id 1 updates; id 2 exits; id 3 enters
    expect(update).to.have.length(1);
    expect(exit).to.have.length(1);
    expect(enter).to.have.length(1);
  });
});

// TreeInterpolator integration omitted here to avoid ESM imports pulled via PathInterpolator
