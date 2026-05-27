// test/subtree-highlight-parsing.test.js
import { expect } from 'chai';
import {
  parseSubtreeHighlightEntry,
  collectUniqueSubtrees,
  toSubtreeKey,
} from '../../src/domain/tree/splits.js';
import { getSourceDestinationEdgesAtIndex } from '../../src/state/phyloStore/internal/changeTracking.helpers.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const focusTreesData = require('../data/test-data/focus_trees.json');

describe('Tree Visualisation - Subtree Highlight Parsing', () => {
  describe('parseSubtreeHighlightEntry', () => {
    it('should reject a flat array entry', () => {
      const entry = [1, 2, 3];
      const result = parseSubtreeHighlightEntry(entry);
      expect(result).to.be.empty;
    });

    it('should parse a nested array as multiple subtrees', () => {
      const entry = [
        [1, 2],
        [3, 4],
      ];
      const result = parseSubtreeHighlightEntry(entry);
      // Expected: [[1, 2], [3, 4]]
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal([1, 2]);
      expect(result[1]).to.deep.equal([3, 4]);
    });

    it('should reject mixed number and array entries', () => {
      const entry = [1, [2, 3], 4];
      const result = parseSubtreeHighlightEntry(entry);
      expect(result).to.be.empty;
    });

    it('should handle Sets correctly', () => {
      const entry = [new Set([1, 2]), [3]];
      const result = parseSubtreeHighlightEntry(entry);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal([1, 2]);
      expect(result[1]).to.deep.equal([3]);
    });
  });

  describe('collectUniqueSubtrees (Highlight History)', () => {
    it('should collect unique subtrees across a time range', () => {
      // Mock highlight data: array of per-frame entries.
      const tracking = [
        [[1, 2]], // Frame 0: Single subtree {1,2}
        [[1, 2], [3]], // Frame 1: Two subtrees {1,2}, {3}
        [[3, 4]], // Frame 2: Single subtree {3,4}
      ];

      // Collect from 0 to 3
      const result = collectUniqueSubtrees(tracking, 0, 3);

      // Unique subtrees: {1,2}, {3}, {3,4}
      // Frame 0: [[1,2]] -> [[1,2]] key "1,2"
      // Frame 1: [[1,2], [3]] -> [[1,2], [3]] keys "1,2", "3"
      // Frame 2: [[3,4]] -> [[3,4]] key "3,4"

      const keys = result.map((s) => toSubtreeKey(s));
      // Used to be hashed 32-bit, now 64-bit Zobrist style
      // [1,2] -> 157d0fc257828940
      // [3]   -> 1c857e452049d242
      // [3,4] -> 1c4f647012f9f78d
      const k12 = toSubtreeKey([1, 2]);
      const k3 = toSubtreeKey([3]);
      const k34 = toSubtreeKey([3, 4]);

      expect(keys).to.include(k12);
      expect(keys).to.include(k3);
      expect(keys).to.include(k34);
      expect(result).to.have.lengthOf(3);
    });

    it('should exclude specified keys', () => {
      const tracking = [[[1, 2]], [[3]]];
      // Must exclude using the hash key
      const k12 = toSubtreeKey([1, 2]);
      const k3 = toSubtreeKey([3]);

      const exclude = new Set([k12]);
      const result = collectUniqueSubtrees(tracking, 0, 2, exclude);

      const keys = result.map((s) => toSubtreeKey(s));
      expect(keys).to.not.include(k12);
      expect(keys).to.include(k3);
    });
  });

  describe('activeChangeEdgeTracking (Source/Destination Parsing)', () => {
    // Mock State Construction for getSourceDestinationEdgesAtIndex
    const mockStructure = {
      subtreeHighlightTracking: [],
      temporalEvents: [],
      pairs: [],
      timelineFrames: [
        {
          frame_index: 0,
          frame_type: 'interpolation_frame',
          is_observed_input: false,
          pair_id: null,
        },
      ],
    };

    it('should return empty if no active edge', () => {
      const state = { ...mockStructure };
      const result = getSourceDestinationEdgesAtIndex(state, 0);
      expect(result.source).to.be.empty;
      expect(result.dest).to.be.empty;
    });

    it('should resolve source and destination edges correctly', () => {
      // Setup:
      // Active Edge: [1, 2]
      // Subtree: [[1, 2]] (The subtree currently moving)
      // Attachment edges map [1, 2] -> source/destination edges.

      const index = 0;
      const activeEdge = [1, 2];
      const pairId = 'pair_1';

      // Mock State
      const state = {
        subtreeHighlightTracking: [[[1, 2]]], // The moving subtree is {1,2}
        temporalEvents: [makeSplitChangeEvent(pairId, index, activeEdge)],
        timelineFrames: [
          { frame_type: 'interpolation_frame', is_observed_input: false, pair_id: pairId },
        ],
        pairs: [
          {
            pair_id: pairId,
            solution: {
              // Map active activeEdge to attachment edges.
              attachment_edges_by_split: {
                '[1, 2]': {
                  '[1, 2]': {
                    source: [1, 2, 5],
                    destination: [1, 2, 6],
                  },
                },
              },
            },
          },
        ],
      };

      const result = getSourceDestinationEdgesAtIndex(state, index);

      // Expectation:
      // The function should filter out the moving nodes ({1, 2}) from the edges.
      // Source Edge: [1, 2, 5] without {1, 2} -> [5]
      // Dest Edge: [1, 2, 6] without {1, 2} -> [6]

      expect(result.source).to.have.lengthOf(1);
      expect(result.source[0]).to.deep.equal([5]);

      expect(result.dest).to.have.lengthOf(1);
      expect(result.dest[0]).to.deep.equal([6]);
    });

    it('should handle multiple subtrees moving simultaneously', () => {
      // Scenario: Multiple subtrees active [ [1], [2] ]
      const index = 0;
      const subtrees = [[1], [2]]; // Two distinct moving subtrees
      const pairId = 'pair_multi';

      const state = {
        subtreeHighlightTracking: [subtrees],
        temporalEvents: [makeSplitChangeEvent(pairId, index, [1, 2])],
        timelineFrames: [
          { frame_type: 'interpolation_frame', is_observed_input: false, pair_id: pairId },
        ],
        pairs: [
          {
            pair_id: pairId,
            solution: {
              attachment_edges_by_split: {
                '[1, 2]': {
                  '[1]': {
                    source: [1, 5],
                    destination: [1, 7],
                  },
                  '[2]': {
                    source: [2, 6],
                    destination: [2, 8],
                  },
                },
              },
            },
          },
        ],
      };

      const result = getSourceDestinationEdgesAtIndex(state, index);

      // Moving set = {1, 2}
      // Source edges: [1, 5] -> [5], [2, 6] -> [6]
      // Dest edges: [1, 7] -> [7], [2, 8] -> [8]

      expect(result.source).to.have.lengthOf(2);
      expect(result.dest).to.have.lengthOf(2);

      // Verify contents (order depends on subtree iteration order)
      const flatSource = result.source.flat();
      expect(flatSource).to.include(5);
      expect(flatSource).to.include(6);
    });
  });

  function makeSplitChangeEvent(pairId, frameIndex, split) {
    return {
      event_type: 'split_change',
      pair_id: pairId,
      frame_range: [frameIndex, frameIndex],
      split,
    };
  }

  describe('Focus Trees Data Integrity', () => {
    it('should have loaded the focus trees json', () => {
      expect(focusTreesData).to.exist;
      expect(focusTreesData.trees).to.be.an('array');
      expect(focusTreesData.trees.length).to.be.greaterThan(0);
      // Check first tree string
      expect(focusTreesData.trees[0]).to.be.a('string');
      expect(focusTreesData.trees[0]).to.contain('Emu');
    });
  });
});
