const { expect } = require('chai');
const { ElementMatcher } = require('../src/js/treeVisualisation/deckgl/interpolation/ElementMatcher.js');

describe('TreeVisualisation/DeckGL/Interpolation/ElementMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new ElementMatcher();
  });

  describe('interpolateElements', () => {
    // Helper to create simple elements
    const createEl = (id, val) => ({ id, val });

    // Mock interpolation function
    const interpolateFn = (from, to, t) => ({
      id: to.id,
      val: from.val + (to.val - from.val) * t,
      type: 'update'
    });

    it('should handle matching elements (Update)', () => {
      const from = [createEl('A', 0)];
      const to = [createEl('A', 10)];
      const t = 0.5;

      const result = matcher.interpolateElements(from, to, t, interpolateFn);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.include({
        id: 'A',
        val: 5, // 0 + (10 - 0) * 0.5
        type: 'update'
      });
    });

    it('should handle entering elements (Enter)', () => {
      const from = [];
      const to = [createEl('B', 10)];
      const t = 0.5;

      const result = matcher.interpolateElements(from, to, t, interpolateFn);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.include({
        id: 'B',
        opacity: 1,
        isEntering: true
      });
    });

    it('should handle exiting elements (Exit)', () => {
      const from = [createEl('C', 5)];
      const to = [];
      const t = 0.5;

      const result = matcher.interpolateElements(from, to, t, interpolateFn);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.include({
        id: 'C',
        opacity: 1,
        isExiting: true
      });
    });

    it('should handle complex mixed case', () => {
      // A: Update (0 -> 10)
      // B: Enter
      // C: Exit
      const from = [createEl('A', 0), createEl('C', 5)];
      const to = [createEl('A', 10), createEl('B', 20)];
      const t = 0.5;

      const result = matcher.interpolateElements(from, to, t, interpolateFn);

      const a = result.find(r => r.id === 'A');
      const b = result.find(r => r.id === 'B');
      const c = result.find(r => r.id === 'C');

      expect(a).to.exist;
      expect(a.type).to.equal('update');
      expect(a.val).to.equal(5);

      expect(b).to.exist;
      expect(b.isEntering).to.be.true;

      expect(c).to.exist;
      expect(c.isExiting).to.be.true;
    });

    it('should preserve order of output relative to target input', () => {
      const from = [createEl('A', 1)];
      const to = [createEl('B', 2), createEl('A', 3)];

      const result = matcher.interpolateElements(from, to, 0.5, interpolateFn);

      expect(result[0].id).to.equal('B');
      expect(result[1].id).to.equal('A');
    });

    it('should correctly match Nodes (mocked structure)', () => {
      // Structure based on NodeDataBuilder
      const fromNode = {
        id: 'node_1',
        position: [10, 0, 0],
        radius: 5,
        split_indices: [1]
      };
      const toNode = {
        id: 'node_1',
        position: [20, 0, 0],
        radius: 10,
        split_indices: [1]
      };

      const interpolateNodeFn = (from, to, t) => ({
        id: to.id,
        position: [
          from.position[0] + (to.position[0] - from.position[0]) * t,
          0, 0
        ],
        radius: from.radius + (to.radius - from.radius) * t,
        type: 'update'
      });

      const result = matcher.interpolateElements([fromNode], [toNode], 0.5, interpolateNodeFn);

      expect(result).to.have.lengthOf(1);
      const matched = result[0];
      expect(matched.id).to.equal('node_1');
      expect(matched.radius).to.equal(7.5);
      expect(matched.position).to.deep.equal([15, 0, 0]);
      expect(matched.type).to.equal('update');
    });

    it('should correctly match Links (mocked structure)', () => {
      // Structure based on LinkDataBuilder
      const fromLink = {
        id: 'link_A_B',
        sourcePosition: [0, 0, 0],
        targetPosition: [10, 0, 0],
        polarData: { source: { angle: 0 }, target: { angle: 0 } }
      };
      const toLink = {
        id: 'link_A_B',
        sourcePosition: [0, 0, 0],
        targetPosition: [20, 0, 0],
        polarData: { source: { angle: 0 }, target: { angle: 0 } }
      };

      // Simple linear interpolator for test
      const interpolateLinkFn = (from, to, t) => ({
        id: to.id,
        targetPosition: [
          from.targetPosition[0] + (to.targetPosition[0] - from.targetPosition[0]) * t,
          0, 0
        ],
        polarData: to.polarData, // Preserve metadata
        type: 'update',
        isLink: true
      });

      const result = matcher.interpolateElements([fromLink], [toLink], 0.5, interpolateLinkFn);

      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal('link_A_B');
      expect(result[0].targetPosition).to.deep.equal([15, 0, 0]);
      expect(result[0].polarData).to.exist;
    });

    it('should correctly match Extensions (mocked structure)', () => {
      // Structure based on ExtensionDataBuilder
      const fromExt = { id: 'ext_leaf_1', targetPosition: [100, 0, 0] };
      const toExt = { id: 'ext_leaf_1', targetPosition: [120, 0, 0] };

      const interpolateExtFn = (from, to, t) => ({
        id: to.id,
        targetPosition: [110, 0, 0], // manually solved for t=0.5
        type: 'update'
      });

      const result = matcher.interpolateElements([fromExt], [toExt], 0.5, interpolateExtFn);

      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal('ext_leaf_1');
      expect(result[0].targetPosition).to.deep.equal([110, 0, 0]);
    });
  });
});
