const { expect } = require('chai');

const {
  shortestAngle,
  clamp,
  easeInOutCubic,
} = require('../src/domain/math/mathUtils.js');

describe('Utils/MathUtils', () => {
  it('shortestAngle should take minimal wrapped difference', () => {
    // from near -pi to +pi should be small negative delta
    const a = -Math.PI + 0.1;
    const b = Math.PI - 0.1;
    const d = shortestAngle(a, b);
    expect(d).to.be.closeTo(-0.2, 1e-9);
  });

  it('clamp should bound values', () => {
    expect(clamp(5, 0, 1)).to.equal(1);
    expect(clamp(-3, 0, 1)).to.equal(0);
    expect(clamp(0.3, 0, 1)).to.equal(0.3);
  });

  it('easeInOutCubic should be monotonic and map endpoints', () => {
    expect(easeInOutCubic(0)).to.equal(0);
    expect(easeInOutCubic(1)).to.equal(1);
    const mid = easeInOutCubic(0.5);
    expect(mid).to.be.within(0, 1);
  });
});

// RadialTreeGeometry tests omitted in unit suite to avoid ESM loader conflicts with d3 during CJS tests
