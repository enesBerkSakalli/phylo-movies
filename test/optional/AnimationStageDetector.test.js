const { expect } = require('chai');
const {
  detectAnimationStage,
  detectCurrentAnimationStage,
  ANIMATION_STAGES,
} = require('../../src/treeVisualisation/deckgl/interpolation/stages/animationStageDetector.js');
const {
  buildTransitionChangeModel,
} = require('../../src/treeVisualisation/deckgl/interpolation/TransitionChangeModel.js');

function link(id, sourceRadius, targetRadius) {
  return {
    id,
    splitKey: id,
    radialLength: Math.max(0, targetRadius - sourceRadius),
    polarData: {
      source: { angle: 0, radius: sourceRadius },
      target: { angle: 0, radius: targetRadius },
    },
  };
}

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

    it('detects COLLAPSE from branch zeroing even when node ids are unchanged', () => {
      const dataFrom = {
        nodes: [{ id: 'a' }],
        links: [link('stable-node-zeroing-1', 10, 30)],
      };
      const dataTo = {
        nodes: [{ id: 'a' }],
        links: [link('stable-node-zeroing-1', 10, 10)],
      };
      const transitionChangeModel = buildTransitionChangeModel(dataFrom, dataTo);

      expect(detectAnimationStage(dataFrom, dataTo, transitionChangeModel)).to.equal(
        ANIMATION_STAGES.COLLAPSE
      );
    });

    it('detects EXPAND from branch revival even when node ids are unchanged', () => {
      const dataFrom = {
        nodes: [{ id: 'a' }],
        links: [link('stable-node-reviving-1', 10, 10)],
      };
      const dataTo = {
        nodes: [{ id: 'a' }],
        links: [link('stable-node-reviving-1', 10, 30)],
      };
      const transitionChangeModel = buildTransitionChangeModel(dataFrom, dataTo);

      expect(detectAnimationStage(dataFrom, dataTo, transitionChangeModel)).to.equal(
        ANIMATION_STAGES.EXPAND
      );
    });

    it('should prioritize COLLAPSE over EXPAND when both conditions exist', () => {
      // This case shouldn't normally happen, but COLLAPSE is prioritized
      const dataFrom = { nodes: [{ id: 'a' }, { id: 'b' }] };
      const dataTo = { nodes: [{ id: 'a' }, { id: 'c' }] }; // 'b' exits, 'c' enters

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.COLLAPSE);
    });

    it('prioritizes lifecycle COLLAPSE before lifecycle EXPAND', () => {
      const dataFrom = {
        nodes: [{ id: 'a' }],
        links: [link('zeroing-1', 10, 30), link('reviving-2', 10, 10)],
      };
      const dataTo = {
        nodes: [{ id: 'a' }],
        links: [link('zeroing-1', 10, 10), link('reviving-2', 10, 30)],
      };
      const transitionChangeModel = buildTransitionChangeModel(dataFrom, dataTo);

      expect(detectAnimationStage(dataFrom, dataTo, transitionChangeModel)).to.equal(
        ANIMATION_STAGES.COLLAPSE
      );
    });

    it('reports the current lifecycle phase for mixed collapse and expand transitions', () => {
      const dataFrom = {
        nodes: [{ id: 'a' }],
        links: [link('zeroing-1', 10, 30), link('reviving-2', 10, 10)],
      };
      const dataTo = {
        nodes: [{ id: 'a' }],
        links: [link('zeroing-1', 10, 10), link('reviving-2', 10, 30)],
      };
      const transitionChangeModel = buildTransitionChangeModel(dataFrom, dataTo);

      expect(detectCurrentAnimationStage(dataFrom, dataTo, transitionChangeModel, 0.2)).to.equal(
        ANIMATION_STAGES.COLLAPSE
      );
      expect(detectCurrentAnimationStage(dataFrom, dataTo, transitionChangeModel, 0.5)).to.equal(
        ANIMATION_STAGES.REORDER
      );
      expect(detectCurrentAnimationStage(dataFrom, dataTo, transitionChangeModel, 0.8)).to.equal(
        ANIMATION_STAGES.EXPAND
      );
      expect(detectCurrentAnimationStage(dataFrom, dataTo, transitionChangeModel, 0.95)).to.equal(
        ANIMATION_STAGES.REORDER
      );
    });

    it('should handle empty nodes arrays', () => {
      const dataFrom = { nodes: [] };
      const dataTo = { nodes: [] };

      expect(detectAnimationStage(dataFrom, dataTo)).to.equal(ANIMATION_STAGES.REORDER);
    });

    it('should handle null/undefined data gracefully', () => {
      expect(detectAnimationStage(null, null)).to.equal(ANIMATION_STAGES.REORDER);
      expect(detectAnimationStage({}, {})).to.equal(ANIMATION_STAGES.REORDER);
      expect(detectAnimationStage({ nodes: null }, { nodes: null })).to.equal(
        ANIMATION_STAGES.REORDER
      );
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
