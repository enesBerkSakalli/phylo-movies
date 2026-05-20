
import { expect } from 'chai';
import * as changeTrackingHelpers from '../../src/state/phyloStore/internal/changeTracking.helpers.js';

const {
  resolveSubtreeHighlights,
  calculateChangePreviews,
  renderTreeControllers,
} = changeTrackingHelpers;

describe('Tree Visualisation - State Update Logic', () => {
  const createTimelineFrames = (inputFrameIndices = [0, 10, 20], frameIndex = 10, pairId = null) => {
    const maxIndex = Math.max(frameIndex, ...inputFrameIndices);
    return Array.from({ length: maxIndex + 1 }, (_, index) => {
      const inputTreeIndex = inputFrameIndices.indexOf(index);
      if (inputTreeIndex >= 0) {
        return {
          frame_index: index,
          frame_type: 'input_tree',
          is_observed_input: true,
          input_tree_index: inputTreeIndex,
          pair_id: null,
        };
      }
      return {
        frame_index: index,
        frame_type: 'interpolation_frame',
        is_observed_input: false,
        input_tree_index: null,
        pair_id: index === frameIndex ? pairId : null,
      };
    });
  };

  const createMockState = (overrides = {}) => {
    const {
      inputFrameIndices = [0, 10, 20],
      frameIndex = 5,
      ...stateOverrides
    } = overrides;

    return {
      frameIndex,
      subtreeHighlightScope: 'current',
      subtreeHighlightTracking: [],
      timelineFrames: createTimelineFrames(inputFrameIndices, frameIndex),
      upcomingChangesEnabled: true,
      pivotEdgeTracking: [],
      ...stateOverrides
    };
  };

  describe('resolveSubtreeHighlights (subtree highlight detection)', () => {

    it('should return empty array if current frame is an input tree', () => {
      const state = createMockState({
        frameIndex: 10,
      });
      const result = resolveSubtreeHighlights(state);
      expect(result).to.deep.equal([]);
    });

    it('should resolve subtrees from current index in "current" mode', () => {
      const index = 5;
      const subtrees = [[1, 2], [3]];
      const state = createMockState({
        frameIndex: index,
        subtreeHighlightTracking: { [index]: subtrees },
        subtreeHighlightScope: 'current'
      });

      const result = resolveSubtreeHighlights(state);
      // Expected: [[1, 2], [3]] (Normalized)
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal([1, 2]);
      expect(result[1]).to.deep.equal([3]);
    });

    it('should switch logic when mode is "all" (active edge history)', () => {
        // This relies on getAllSubtreesForActiveEdge logic which we test implicitly here via the switch
        // Mock state to support getAllSubtreesForActiveEdge
        const index = 5;
        const activeEdge = [1, 2];
        const pairId = 'pair_1';
        const state = createMockState({
            frameIndex: index,
            subtreeHighlightScope: 'all', // CAUSES SWITCH
            pivotEdgeTracking: { [index]: activeEdge },
            timelineFrames: createTimelineFrames([0, 10, 20], index, pairId),
            pairs: [{
                pair_id: pairId,
                solution: {
                    affected_subtrees_by_split: {
                        "[1, 2]": [[[10, 11], [12]]] // The history/all solutions
                    }
                }
            }]
        });

        const result = resolveSubtreeHighlights(state);
        // Expected: [[10, 11], [12]]
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.deep.equal([10, 11]);
        expect(result[1]).to.deep.equal([12]);
    });

    it('should resolve all-mode active edge history by canonical backend split key', () => {
        const index = 5;
        const activeEdge = [2, 1];
        const pairId = 'pair_1';
        const state = createMockState({
            frameIndex: index,
            subtreeHighlightScope: 'all',
            pivotEdgeTracking: { [index]: activeEdge },
            timelineFrames: createTimelineFrames([0, 10, 20], index, pairId),
            pairs: [{
                pair_id: pairId,
                solution: {
                    affected_subtrees_by_split: {
                        "[1, 2]": [[[10]]]
                    }
                }
            }]
        });

        const result = resolveSubtreeHighlights(state);

        expect(result).to.deep.equal([[10]]);
    });

    it('exposes affected-subtree resolution without the old all-subtrees helper name', () => {
        expect(changeTrackingHelpers.getAffectedSubtreesForPivotEdge).to.be.a('function');
        expect(changeTrackingHelpers).not.to.have.property('getAllSubtreesForPivotEdge');
    });

    it('should use timeline frames without a timeline manager', () => {
        const index = 5;
        const state = createMockState({
          frameIndex: index,
          subtreeHighlightTracking: { [index]: [[1, 2]] },
          subtreeHighlightScope: 'current'
        });
        const result = resolveSubtreeHighlights(state);
        expect(result).to.deep.equal([[1, 2]]);
    });

  });

  describe('calculateChangePreviews (Upcoming/Completed Edges)', () => {

    it('should return empty arrays if upcoming changes disabled', () => {
      const state = createMockState({ upcomingChangesEnabled: false });
      const result = calculateChangePreviews(state);
      expect(result.upcoming).to.deep.equal([]);
      expect(result.completed).to.deep.equal([]);
    });

    it('should return empty arrays if no input-tree data', () => {
        const state = createMockState({ inputFrameIndices: [] });
        const result = calculateChangePreviews(state);
        expect(result.upcoming).to.deep.equal([]);
        expect(result.completed).to.deep.equal([]);
    });

    it('should calculate completed edges from previous input tree to current', () => {
        // Range: previous input tree (0) -> current (5). Completed: 1, 2, 3, 4
        // Logic: collectUniqueEdges(start=1, end=5)
        const edges = [
            null,
            [1, 2], // 1
            [3, 4], // 2
            null,   // 3
            [1, 2], // 4 (Duplicate of 1)
            [5, 6]  // 5 (Current)
        ];

        const state = createMockState({
            frameIndex: 5,
            pivotEdgeTracking: edges,
            inputFrameIndices: [0, 10]
        });

        const result = calculateChangePreviews(state);

        expect(result.completed).to.have.lengthOf(2);
        const keys = result.completed.map(e => e.join(','));
        expect(keys).to.include('1,2');
        expect(keys).to.include('3,4');
    });

    it('should calculate upcoming edges from current to next input tree', () => {
         // Range: current (5) -> next input tree (10). Upcoming: 6, 7, 8, 9
         const edges = [];
         for(let i=0; i<15; i++) edges.push(null);

         edges[6] = [7, 8];
         edges[8] = [9, 10];

         const state = createMockState({
             frameIndex: 5,
             pivotEdgeTracking: edges,
             inputFrameIndices: [0, 10]
         });

         const result = calculateChangePreviews(state);

         expect(result.upcoming).to.have.lengthOf(2);
         const keys = result.upcoming.map(e => e.join(','));
         expect(keys).to.include('7,8');
         expect(keys).to.include('9,10');
    });

    it('should exclude current edge from previews', () => {
        const edges = [
            null,
            [1, 2], // 1: Same as current
            null,
            null,
            null,
            [1, 2], // 5: Current
            [1, 2]  // 6: Same as current
        ];

        const state = createMockState({
            frameIndex: 5,
            pivotEdgeTracking: edges,
            inputFrameIndices: [0, 10]
        });

        const result = calculateChangePreviews(state);

        expect(result.completed).to.be.empty;
        expect(result.upcoming).to.be.empty;
    });

  });

  describe('renderTreeControllers (Playback Render Ownership)', () => {
    it('renders registered controllers when playback is paused', () => {
      let renderCount = 0;

      renderTreeControllers({
        playing: false,
        treeControllers: [
          { renderAllElements: () => { renderCount += 1; } }
        ]
      });

      expect(renderCount).to.equal(1);
    });

    it('does not render registered controllers while playback owns frames', () => {
      let renderCount = 0;

      renderTreeControllers({
        playing: true,
        treeControllers: [
          { renderAllElements: () => { renderCount += 1; } }
        ]
      });

      expect(renderCount).to.equal(0);
    });
  });

});
