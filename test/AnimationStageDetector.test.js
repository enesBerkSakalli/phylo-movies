const { expect } = require('chai');
const { detectAnimationStage, ANIMATION_STAGES } = require('../src/js/treeVisualisation/deckgl/interpolation/AnimationStageDetector.js');

describe('AnimationStageDetector', () => {
  describe('detectAnimationStage()', () => {
    it('should detect COLLAPSE when nodes are exiting (in from but not in to)', () => {
      const dataFrom = { nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
      const dataTo = { nodes: [{ id: 'a' }, { id: 'b' }] }; // 'c' exits

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.COLLAPSE);
    });

    it('should detect EXPAND when nodes are entering (in to but not in from)', () => {
      const dataFrom = { nodes: [{ id: 'a' }] };
      const dataTo = { nodes: [{ id: 'a' }, { id: 'b' }] }; // 'b' enters

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.EXPAND);
    });

    it('should detect REORDER when no nodes enter or exit', () => {
      const dataFrom = { nodes: [{ id: 'a' }, { id: 'b' }] };
      const dataTo = { nodes: [{ id: 'b' }, { id: 'a' }] }; // same nodes, reordered

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.REORDER);
    });

    it('should prioritize COLLAPSE over EXPAND when both conditions exist', () => {
      // This case shouldn't normally happen, but COLLAPSE is prioritized
      const dataFrom = { nodes: [{ id: 'a' }, { id: 'b' }] };
      const dataTo = { nodes: [{ id: 'a' }, { id: 'c' }] }; // 'b' exits, 'c' enters

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.COLLAPSE);
    });

    it('should handle empty nodes arrays', () => {
      const dataFrom = { nodes: [] };
      const dataTo = { nodes: [] };

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.REORDER);
    });

    it('should handle null/undefined data gracefully', () => {
      expect(detectAnimationStage(null, null)).to.equal(ANIMATION_STAGES.REORDER);
      expect(detectAnimationStage({}, {})).to.equal(ANIMATION_STAGES.REORDER);
      expect(detectAnimationStage({ nodes: null }, { nodes: null })).to.equal(ANIMATION_STAGES.REORDER);
    });

    it('should handle single node trees', () => {
      const dataFrom = { nodes: [{ id: 'root' }] };
      const dataTo = { nodes: [{ id: 'root' }] };

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.REORDER);
    });
  });

  describe('ANIMATION_STAGES constant', () => {
    it('should export all expected stage values', () => {
      expect(ANIMATION_STAGES.COLLAPSE).to.equal('COLLAPSE');
      expect(ANIMATION_STAGES.EXPAND).to.equal('EXPAND');
      expect(ANIMATION_STAGES.REORDER).to.equal('REORDER');
    });
  });
});
