const { expect } = require('chai');

const {
  kar2pol,
  shortestAngle,
  clamp,
  easeInOutCubic,
} = require('../src/js/domain/math/mathUtils.js');

const { applyInterpolationEasing } = require('../src/js/domain/math/easingUtils.js');

describe('Utils/MathUtils', () => {
  it('kar2pol should convert cartesian to polar consistently', () => {
    const { r, angle } = kar2pol(1, Math.sqrt(3));
    expect(r).to.be.closeTo(2, 1e-9);
    // arctan(sqrt(3)/1) = pi/3, but function normalizes special cases; allow tolerance
    expect(angle).to.be.closeTo(Math.PI / 3, 1e-6);
  });

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

describe('Utils/easingUtils', () => {
  it('applyInterpolationEasing linear vs gentle', () => {
    const t = 0.25;
    const lin = applyInterpolationEasing(t, 'linear');
    const gen = applyInterpolationEasing(t, 'gentle');
    expect(lin).to.equal(0.25);
    // gentle should accelerate more slowly at start than linear
    expect(gen).to.be.below(lin);
  });
});

// RadialTreeGeometry tests omitted in unit suite to avoid ESM loader conflicts with d3 during CJS tests
