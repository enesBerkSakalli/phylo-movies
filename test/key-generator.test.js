/**
 * Test suite for KeyGenerator utility
 * This is critical for element tracking during interpolation
 */

import { describe, test, expect } from 'vitest';
import { getLinkKey, getNodeKey } from '../src/js/treeVisualisation/utils/KeyGenerator.js';

describe('KeyGenerator Tests', () => {
  describe('getLinkKey', () => {
    test('should generate consistent keys for identical links', () => {
      const link1 = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      const link2 = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      expect(getLinkKey(link1)).toBe(getLinkKey(link2));
    });

    test('should generate different keys for different links', () => {
      const linkAB = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      const linkAC = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'C', data: { name: 'Node C' } }
      };

      expect(getLinkKey(linkAB)).not.toBe(getLinkKey(linkAC));
    });

    test('should handle missing data gracefully', () => {
      const linkWithMissingData = {
        source: { id: 'A' },
        target: { id: 'B' }
      };

      expect(() => getLinkKey(linkWithMissingData)).not.toThrow();
      expect(getLinkKey(linkWithMissingData)).toBeTruthy();
    });

    test('should be bidirectional consistent (A->B should equal B->A)', () => {
      const linkAB = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      const linkBA = {
        source: { id: 'B', data: { name: 'Node B' } },
        target: { id: 'A', data: { name: 'Node A' } }
      };

      // Keys should be the same regardless of direction for undirected trees
      expect(getLinkKey(linkAB)).toBe(getLinkKey(linkBA));
    });
  });

  describe('getNodeKey', () => {
    test('should generate consistent keys for identical nodes', () => {
      const node1 = {
        id: 'nodeA',
        data: { name: 'Node A' }
      };

      const node2 = {
        id: 'nodeA', 
        data: { name: 'Node A' }
      };

      expect(getNodeKey(node1)).toBe(getNodeKey(node2));
    });

    test('should generate different keys for different nodes', () => {
      const nodeA = {
        id: 'nodeA',
        data: { name: 'Node A' }
      };

      const nodeB = {
        id: 'nodeB',
        data: { name: 'Node B' }
      };

      expect(getNodeKey(nodeA)).not.toBe(getNodeKey(nodeB));
    });

    test('should handle nodes with same name but different ids', () => {
      const node1 = {
        id: 'node1',
        data: { name: 'Same Name' }
      };

      const node2 = {
        id: 'node2',
        data: { name: 'Same Name' }
      };

      expect(getNodeKey(node1)).not.toBe(getNodeKey(node2));
    });

    test('should handle missing data gracefully', () => {
      const nodeWithMissingData = {
        id: 'nodeA'
      };

      expect(() => getNodeKey(nodeWithMissingData)).not.toThrow();
      expect(getNodeKey(nodeWithMissingData)).toBeTruthy();
    });
  });

  describe('Key stability across tree transformations', () => {
    test('should maintain key consistency when nodes move positions', () => {
      const originalNode = {
        id: 'nodeA',
        data: { name: 'Node A' },
        angle: 0,
        radius: 1,
        x: 0,
        y: 0
      };

      const movedNode = {
        id: 'nodeA',
        data: { name: 'Node A' },
        angle: Math.PI,
        radius: 2,
        x: 100,
        y: 200
      };

      // Keys should be the same even when positions change
      expect(getNodeKey(originalNode)).toBe(getNodeKey(movedNode));
    });

    test('should maintain key consistency when links change positions', () => {
      const originalLink = {
        source: { 
          id: 'A', 
          data: { name: 'Node A' },
          angle: 0,
          radius: 1
        },
        target: { 
          id: 'B', 
          data: { name: 'Node B' },
          angle: Math.PI,
          radius: 1
        }
      };

      const movedLink = {
        source: { 
          id: 'A', 
          data: { name: 'Node A' },
          angle: Math.PI/2,
          radius: 2
        },
        target: { 
          id: 'B', 
          data: { name: 'Node B' },
          angle: 3*Math.PI/2,
          radius: 2
        }
      };

      // Keys should be the same even when positions change
      expect(getLinkKey(originalLink)).toBe(getLinkKey(movedLink));
    });
  });

  describe('Integration with Map operations', () => {
    test('should work correctly as Map keys for links', () => {
      const linkMap = new Map();
      
      const link1 = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      const link1Copy = {
        source: { id: 'A', data: { name: 'Node A' } },
        target: { id: 'B', data: { name: 'Node B' } }
      };

      linkMap.set(getLinkKey(link1), 'value1');
      
      // Should be able to retrieve using key from identical link
      expect(linkMap.has(getLinkKey(link1Copy))).toBe(true);
      expect(linkMap.get(getLinkKey(link1Copy))).toBe('value1');
    });

    test('should work correctly as Map keys for nodes', () => {
      const nodeMap = new Map();
      
      const node1 = {
        id: 'nodeA',
        data: { name: 'Node A' }
      };

      const node1Copy = {
        id: 'nodeA',
        data: { name: 'Node A' }
      };

      nodeMap.set(getNodeKey(node1), 'value1');
      
      // Should be able to retrieve using key from identical node
      expect(nodeMap.has(getNodeKey(node1Copy))).toBe(true);
      expect(nodeMap.get(getNodeKey(node1Copy))).toBe('value1');
    });
  });
});