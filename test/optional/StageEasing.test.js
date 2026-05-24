const { expect } = require('chai');
const {
  applyRenderProgressEasing,
  applyStageEasing,
  easeIn,
  easeOut,
  easeInOut
} = require('../../src/treeVisualisation/deckgl/interpolation/stages/stageEasing.js');
const { ANIMATION_STAGES } = require('../../src/treeVisualisation/deckgl/interpolation/stages/animationStageDetector.js');

describe('StageEasing', () => {
  describe('applyStageEasing()', () => {
    it('should apply easeOut for COLLAPSE (fast start, slow end)', () => {
      const earlyT = applyStageEasing(0.2, ANIMATION_STAGES.COLLAPSE);
      // easeOut: early progress > linear (decelerating)
      expect(earlyT).to.be.greaterThan(0.2);
    });

    it('should apply easeIn for EXPAND (slow start, fast end)', () => {
      const earlyT = applyStageEasing(0.2, ANIMATION_STAGES.EXPAND);
      // easeIn: early progress < linear (accelerating)
      expect(earlyT).to.be.lessThan(0.2);
    });

    it('should apply easeInOut for REORDER (S-curve)', () => {
      const midT = applyStageEasing(0.5, ANIMATION_STAGES.REORDER);
      // easeInOut: symmetric around midpoint
      expect(midT).to.be.closeTo(0.5, 0.1);
    });

    it('should return t=0 unchanged for all stages', () => {
      expect(applyStageEasing(0, ANIMATION_STAGES.COLLAPSE)).to.equal(0);
      expect(applyStageEasing(0, ANIMATION_STAGES.EXPAND)).to.equal(0);
      expect(applyStageEasing(0, ANIMATION_STAGES.REORDER)).to.equal(0);
    });

    it('should return t=1 unchanged for all stages', () => {
      expect(applyStageEasing(1, ANIMATION_STAGES.COLLAPSE)).to.equal(1);
      expect(applyStageEasing(1, ANIMATION_STAGES.EXPAND)).to.equal(1);
      expect(applyStageEasing(1, ANIMATION_STAGES.REORDER)).to.equal(1);
    });

    it('should clamp t values outside [0, 1]', () => {
      expect(applyStageEasing(-0.5, ANIMATION_STAGES.REORDER)).to.equal(0);
      expect(applyStageEasing(1.5, ANIMATION_STAGES.REORDER)).to.equal(1);
    });

    it('should return t unchanged for unknown stage', () => {
      expect(applyStageEasing(0.5, 'UNKNOWN')).to.equal(0.5);
      expect(applyStageEasing(0.3, null)).to.equal(0.3);
    });
  });

  describe('easeOut()', () => {
    it('should produce values > linear for t < 0.5', () => {
      expect(easeOut(0.25)).to.be.greaterThan(0.25);
      expect(easeOut(0.4)).to.be.greaterThan(0.4);
    });

    it('should produce values approaching 1 at t=1', () => {
      expect(easeOut(1)).to.equal(1);
    });
  });

  describe('easeIn()', () => {
    it('should produce values < linear for t < 0.5', () => {
      expect(easeIn(0.25)).to.be.lessThan(0.25);
      expect(easeIn(0.4)).to.be.lessThan(0.4);
    });

    it('should produce values approaching 1 at t=1', () => {
      expect(easeIn(1)).to.equal(1);
    });
  });

  describe('easeInOut()', () => {
    it('should produce values < linear for t < 0.5', () => {
      expect(easeInOut(0.25)).to.be.lessThan(0.25);
    });

    it('should produce values > linear for t > 0.5', () => {
      expect(easeInOut(0.75)).to.be.greaterThan(0.75);
    });

    it('should be symmetric around t=0.5', () => {
      const before = easeInOut(0.3);
      const after = easeInOut(0.7);
      expect(before + after).to.be.closeTo(1, 0.0001);
    });
  });

  describe('applyRenderProgressEasing()', () => {
    it('uses one continuous easing curve independent of animation stage labels', () => {
      const values = [0.39, 0.4, 0.55, 0.56].map(applyRenderProgressEasing);

      for (let index = 1; index < values.length; index += 1) {
        expect(values[index]).to.be.at.least(values[index - 1]);
      }
    });

    it('matches reorder easing for the shared geometry clock', () => {
      expect(applyRenderProgressEasing(0.25)).to.equal(easeInOut(0.25));
      expect(applyRenderProgressEasing(0.75)).to.equal(easeInOut(0.75));
    });
  });
});
