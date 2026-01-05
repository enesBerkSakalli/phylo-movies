
import { expect } from 'chai';
import { reconstructSortedLeavesFromTree } from '../src/js/domain/tree/treeReconstructionUtils.js';

describe('treeReconstructionUtils', () => {
  describe('reconstructSortedLeavesFromTree', () => {
    it('should reconstruct sorted leaves array correctly from a simple tree', () => {
      // Mock tree structure based on phylo-movies format
      // Indices: 0 -> "A", 1 -> "B", 2 -> "C"
      const mockTree = {
        name: "Root",
        children: [
            {
                name: "Clade1",
                children: [
                    { name: "A", split_indices: [0] },
                    { name: "B", split_indices: [1] }
                ]
            },
            {
                name: "C",
                split_indices: [2]
            }
        ]
      };

      const result = reconstructSortedLeavesFromTree(mockTree);

      expect(result).to.be.an('array');
      expect(result).to.have.length(3);
      expect(result[0]).to.equal('A');
      expect(result[1]).to.equal('B');
      expect(result[2]).to.equal('C');
    });

    it('should handle gaps in indices if max index is large', () => {
      // Indices: 1 -> "B", 3 -> "D" (0 and 2 missing)
      const mockTree = {
        name: "Root",
        children: [
            { name: "B", split_indices: [1] },
            { name: "D", split_indices: [3] }
        ]
      };

      const result = reconstructSortedLeavesFromTree(mockTree);

      expect(result).to.have.length(4);
      expect(result[1]).to.equal('B');
      expect(result[3]).to.equal('D');
      // Gaps might be empty strings or undefined depending on implementation fill
      expect(result[0]).to.equal('');
      expect(result[2]).to.equal('');
    });

    it('should return empty array for null tree', () => {
      expect(reconstructSortedLeavesFromTree(null)).to.deep.equal([]);
    });

    it('should handle non-numeric indices gracefully', () => {
        const mockTree = {
            name: "Root",
            children: [{ name: "A", split_indices: ["invalid"] }]
        };
        expect(reconstructSortedLeavesFromTree(mockTree)).to.deep.equal([]);
    });
  });
});
