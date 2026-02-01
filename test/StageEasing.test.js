const { expect } = require('chai');
const { applyStageEasing, easeIn, easeOut, easeInOut } = require('../src/js/treeVisualisation/deckgl/interpolation/StageEasing.js');
const { ANIMATION_STAGES } = require('../src/js/treeVisualisation/deckgl/interpolation/AnimationStageDetector.js');

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
});
