const { expect } = require('chai');

const {
  computeExtensionChangeMetrics,
  classifyExtensionChanges,
} = require('./helpers/extensionChangeMetrics.js');

describe('extension change metrics – deltas and classification', () => {
  const mkLeaf = (id, angle, radius) => ({
    split_indices: [id],
    angle,
    radius,
  });

  const mkLayout = (leaves) => ({
    max_radius: Math.max(...leaves.map((l) => l.radius)),
    leaves,
  });

  it('computes average weighted change between two layouts', () => {
    const layoutA = mkLayout([mkLeaf(1, 0.0, 10), mkLeaf(2, Math.PI / 2, 15)]);
    const layoutB = mkLayout([mkLeaf(1, 0.1, 12), mkLeaf(2, Math.PI / 2 + 0.2, 14)]);
    const m = computeExtensionChangeMetrics(layoutA, layoutB);
    expect(m.compared).to.equal(2);
    expect(m.averageChange).to.be.greaterThan(0);
  });

  it('classifies enter/update/exit between layouts', () => {
    const layoutA = mkLayout([mkLeaf(1, 0.0, 10), mkLeaf(2, Math.PI / 2, 15)]);
    const layoutB = mkLayout([mkLeaf(1, 0.1, 12), mkLeaf(3, 1.0, 9)]);
    const { enter, update, exit } = classifyExtensionChanges(layoutA, layoutB);
    // id 1 updates; id 2 exits; id 3 enters
    expect(update).to.have.length(1);
    expect(exit).to.have.length(1);
    expect(enter).to.have.length(1);
  });

  it('does not match leaves by legacy name/id fallback', () => {
    const leafWithoutSplit = (name, angle, radius) => ({
      name,
      id: name,
      angle,
      radius,
    });

    const layoutA = mkLayout([leafWithoutSplit('same-name', 0.0, 10)]);
    const layoutB = mkLayout([leafWithoutSplit('same-name', 0.5, 20)]);

    const metrics = computeExtensionChangeMetrics(layoutA, layoutB);
    const classes = classifyExtensionChanges(layoutA, layoutB);

    expect(metrics.compared).to.equal(0);
    expect(classes.enter).to.have.length(0);
    expect(classes.update).to.have.length(0);
    expect(classes.exit).to.have.length(0);
  });
});

// TreeInterpolator integration omitted here to avoid ESM imports pulled via PathInterpolator
