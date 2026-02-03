
import { expect } from 'chai';
import { resolveMarkedSubtrees, calculateChangePreviews } from '../src/js/core/slices/sliceHelpers.js';

describe('Tree Visualisation - State Update Logic', () => {

  // Mock State Factory
  const createMockState = (overrides = {}) => ({
    currentTreeIndex: 10,
    markedSubtreeMode: 'current',
    subtreeTracking: [],
    transitionResolver: {
      isFullTree: () => false,
      getSourceTreeIndex: (idx) => idx // Default mapping
    },
    upcomingChangesEnabled: true,
    pivotEdgeTracking: [],
    movieData: { fullTreeIndices: [0, 10, 20] },
    ...overrides
  });

  describe('resolveMarkedSubtrees (Marked Subtree Detection)', () => {

    it('should return empty array if current frame is a Full Tree', () => {
      const state = createMockState({
        transitionResolver: { isFullTree: () => true }
      });
      const result = resolveMarkedSubtrees(state);
      expect(result).to.deep.equal([]);
    });

    it('should resolve subtrees from current index in "current" mode', () => {
      const index = 10;
      const subtrees = [[1, 2], [3]];
      const state = createMockState({
        currentTreeIndex: index,
        subtreeTracking: { [index]: subtrees },
        markedSubtreeMode: 'current'
      });

      const result = resolveMarkedSubtrees(state);
      // Expected: [[1, 2], [3]] (Normalized)
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal([1, 2]);
      expect(result[1]).to.deep.equal([3]);
    });

    it('should fallback to source tree index if current index has no data', () => {
      const index = 10;
      const sourceIndex = 5;
      const subtrees = [1, 2, 3]; // Mixed flat array
      const state = createMockState({
        currentTreeIndex: index,
        subtreeTracking: { [sourceIndex]: subtrees }, // Data at source only
        transitionResolver: {
          isFullTree: () => false,
          getSourceTreeIndex: (idx) => (idx === index ? sourceIndex : idx)
        },
        markedSubtreeMode: 'current'
      });

      const result = resolveMarkedSubtrees(state);
      // Expected: [[1, 2, 3]] (Normalized from flat)
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.equal([1, 2, 3]);
    });

    it('should switch logic when mode is "all" (active edge history)', () => {
        // This relies on getAllSubtreesForActiveEdge logic which we test implicitly here via the switch
        // Mock state to support getAllSubtreesForActiveEdge
        const index = 10;
        const activeEdge = [1, 2];
        const pairKey = 'pair_1';
        const state = createMockState({
            currentTreeIndex: index,
            markedSubtreeMode: 'all', // CAUSES SWITCH
            pivotEdgeTracking: { [index]: activeEdge },
            movieData: { tree_metadata: { [index]: { tree_pair_key: pairKey } } },
            pairSolutions: {
                [pairKey]: {
                    jumping_subtree_solutions: {
                        "[1, 2]": [[10, 11], [12]] // The history/all solutions
                    }
                }
            }
        });

        const result = resolveMarkedSubtrees(state);
        // Expected: [[10, 11], [12]]
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.deep.equal([10, 11]);
        expect(result[1]).to.deep.equal([12]);
    });

    it('should handle missing transitionResolver gracefully', () => {
        const state = { currentTreeIndex: 0 }; // No resolver
        const result = resolveMarkedSubtrees(state);
        expect(result).to.deep.equal([]);
    });

  });

  describe('calculateChangePreviews (Upcoming/Completed Edges)', () => {

    it('should return empty arrays if upcoming changes disabled', () => {
      const state = createMockState({ upcomingChangesEnabled: false });
      const result = calculateChangePreviews(state);
      expect(result.upcoming).to.deep.equal([]);
      expect(result.completed).to.deep.equal([]);
    });

    it('should return empty arrays if no anchor data', () => {
        const state = createMockState({ movieData: null });
        const result = calculateChangePreviews(state);
        expect(result.upcoming).to.deep.equal([]);
        expect(result.completed).to.deep.equal([]);
    });

    it('should calculate completed edges from previous anchor to current', () => {
        // Range: Prev Anchor (0) -> Current (5). Completed: 1, 2, 3, 4
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
            currentTreeIndex: 5,
            pivotEdgeTracking: edges,
            movieData: { fullTreeIndices: [0, 10] }
        });

        const result = calculateChangePreviews(state);

        expect(result.completed).to.have.lengthOf(2);
        const keys = result.completed.map(e => e.join(','));
        expect(keys).to.include('1,2');
        expect(keys).to.include('3,4');
    });

    it('should calculate upcoming edges from current to next anchor', () => {
         // Range: Current (5) -> Next Anchor (10). Upcoming: 6, 7, 8, 9
         const edges = [];
         for(let i=0; i<15; i++) edges.push(null);

         edges[6] = [7, 8];
         edges[8] = [9, 10];

         const state = createMockState({
             currentTreeIndex: 5,
             pivotEdgeTracking: edges,
             movieData: { fullTreeIndices: [0, 10] }
         });

         const result = calculateChangePreviews(state);

         expect(result.upcoming).to.have.lengthOf(2);
         const keys = result.upcoming.map(e => e.join(','));
         expect(keys).to.include('7,8');
         expect(keys).to.include('9,10');
    });

    it('should exclude current edge from previews', () => {
        const currentEdge = [1, 2];
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
            currentTreeIndex: 5,
            pivotEdgeTracking: edges,
            movieData: { fullTreeIndices: [0, 10] }
        });

        const result = calculateChangePreviews(state);

        expect(result.completed).to.be.empty;
        expect(result.upcoming).to.be.empty;
    });

  });

});
