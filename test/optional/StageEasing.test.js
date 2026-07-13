const { expect } = require('chai');
const {
  applyRenderProgressEasing,
} = require('../../src/treeVisualisation/deckgl/interpolation/stages/stageEasing.js');

describe('StageEasing', () => {
  it('clamps geometry progress to the animation interval', () => {
    expect(applyRenderProgressEasing(-0.5)).to.equal(0);
    expect(applyRenderProgressEasing(0)).to.equal(0);
    expect(applyRenderProgressEasing(1)).to.equal(1);
    expect(applyRenderProgressEasing(1.5)).to.equal(1);
  });

  it('uses one monotonic easing clock across lifecycle phase boundaries', () => {
    const values = [0, 0.25, 0.39, 0.4, 0.5, 0.55, 0.56, 0.75, 1].map(applyRenderProgressEasing);

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).to.be.at.least(values[index - 1]);
    }
  });

  it('is symmetric around the midpoint', () => {
    expect(applyRenderProgressEasing(0.3) + applyRenderProgressEasing(0.7)).to.be.closeTo(
      1,
      0.0001
    );
    expect(applyRenderProgressEasing(0.5)).to.equal(0.5);
  });
});
