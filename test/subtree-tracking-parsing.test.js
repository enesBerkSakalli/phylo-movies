// test/subtree-tracking-parsing.test.js
import { expect } from 'chai';
import {
  parseSubtreeTrackingEntry,
  collectUniqueSubtrees,
  toSubtreeKey
} from '../src/js/treeVisualisation/utils/splitMatching.js';
import { getSourceDestinationEdgesAtIndex } from '../src/js/core/slices/sliceHelpers.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const focusTreesData = require('../data/test-data/focus_trees.json');

describe('Tree Visualisation - Subtree Tracking & Parsing', () => {

  describe('parseSubtreeTrackingEntry', () => {
    it('should parse a simple flat array as a single subtree', () => {
      const entry = [1, 2, 3];
      const result = parseSubtreeTrackingEntry(entry);
      // Expected: [[1, 2, 3]]
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.equal([1, 2, 3]);
    });

    it('should parse a nested array as multiple subtrees', () => {
      const entry = [[1, 2], [3, 4]];
      const result = parseSubtreeTrackingEntry(entry);
      // Expected: [[1, 2], [3, 4]]
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal([1, 2]);
      expect(result[1]).to.deep.equal([3, 4]);
    });

    it('should parse mixed format (numbers and arrays) as independent subtrees', () => { // Rule 3
        const entry = [1, [2, 3], 4];
        const result = parseSubtreeTrackingEntry(entry);
        // Expected: [[1], [2, 3], [4]] where single numbers are wrapped
        expect(result).to.have.lengthOf(3);
        // Order matters as per map
        expect(result[0]).to.deep.equal([1]);
        expect(result[1]).to.deep.equal([2, 3]);
        expect(result[2]).to.deep.equal([4]);
    });

    it('should handle Sets correctly', () => {
        const entry = [new Set([1, 2]), [3]];
        const result = parseSubtreeTrackingEntry(entry);
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.deep.equal([1, 2]);
        expect(result[1]).to.deep.equal([3]);
    });
  });

  describe('collectUniqueSubtrees (Tracking History)', () => {
      it('should collect unique subtrees across a time range', () => {
          // Mock tracking data: Array of entries
          const tracking = [
              [1, 2],           // Frame 0: Single subtree {1,2}
              [[1, 2], [3]],    // Frame 1: Two subtrees {1,2}, {3}
              [3, 4]            // Frame 2: Single subtree {3,4}
          ];
          
          // Collect from 0 to 3
          const result = collectUniqueSubtrees(tracking, 0, 3);
          
          // Unique subtrees: {1,2}, {3}, {3,4}
          // Note: parseSubtreeTrackingEntry([1,2]) -> [[1,2]] key "1,2"
          // Frame 1: [[1,2], [3]] -> [[1,2], [3]] keys "1,2", "3"
          // Frame 2: [3,4] -> [[3,4]] key "3,4"
          
          const keys = result.map(s => toSubtreeKey(s));
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
          const tracking = [[1, 2], [3]];
          // Must exclude using the hash key
          const k12 = toSubtreeKey([1, 2]);
          const k3 = toSubtreeKey([3]);
          
          const exclude = new Set([k12]);
          const result = collectUniqueSubtrees(tracking, 0, 2, exclude);
          
          const keys = result.map(s => toSubtreeKey(s));
          expect(keys).to.not.include(k12);
          expect(keys).to.include(k3);
      });
  });

  describe('activeChangeEdgeTracking (Source/Destination Parsing)', () => {
      // Mock State Construction for getSourceDestinationEdgesAtIndex
      const mockStructure = {
          subtreeTracking: [],
          activeChangeEdgeTracking: [],
          pairSolutions: {},
          movieData: { tree_metadata: [] },
          transitionResolver: { isFullTree: () => false }
      };

      it('should return empty if no active edge', () => {
          const state = { ...mockStructure, activeChangeEdgeTracking: [null] };
          const result = getSourceDestinationEdgesAtIndex(state, 0);
          expect(result.source).to.be.empty;
          expect(result.dest).to.be.empty;
      });

      it('should resolve source and destination edges correctly', () => {
          // Setup:
          // Active Edge: [1, 2]
          // Subtree: [[1, 2]] (The subtree currently moving)
          // Source Solution maps [1, 2] -> edge [1, 2, 5] (example)
          // Dest Solution maps [1, 2] -> edge [1, 2, 6]
          
          const index = 0;
          const activeEdge = [1, 2];
          const pairKey = "pair_1";
          
          // Mock State
          const state = {
              subtreeTracking: [ [[1, 2]] ], // The moving subtree is {1,2}
              activeChangeEdgeTracking: [ activeEdge ],
              movieData: {
                  tree_metadata: [ { tree_pair_key: pairKey } ]
              },
              pairSolutions: {
                  [pairKey]: {
                      // Map active activeEdge to a Subtree Map
                      solution_to_source_map: {
                          "[1, 2]": {
                              "[1, 2]": [1, 2, 5] // Subtree -> Source Edge
                          }
                      },
                      // Map active activeEdge to a Subtree Map
                      solution_to_destination_map: {
                          "[1, 2]": {
                              "[1, 2]": [1, 2, 6] // Subtree -> Dest Edge
                          }
                      }
                  }
              }
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
        const pairKey = "pair_multi";
        
        const state = {
            subtreeTracking: [ subtrees ],
            activeChangeEdgeTracking: [ [1, 2] ], // active edge might be relevant for lookup keys
            movieData: { tree_metadata: [{ tree_pair_key: pairKey }] },
            pairSolutions: {
                [pairKey]: {
                    solution_to_source_map: {
                        "[1, 2]": {
                            "[1]": [1, 5],
                            "[2]": [2, 6]
                        }
                    },
                    solution_to_destination_map: {
                        "[1, 2]": {
                            "[1]": [1, 7],
                            "[2]": [2, 8]
                        }
                    }
                }
            }
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
