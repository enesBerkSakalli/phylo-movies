
import { describe, it, expect } from 'vitest';
import { derivePairKey, buildViewLinkMapping } from '../src/js/domain/view/viewLinkMapper.js';

describe('ViewLinkMapper', () => {

  describe('derivePairKey', () => {
    it('finds key directly on left index', () => {
      const metadata = [
        { tree_pair_key: 'pair_1' },
        { tree_pair_key: null }
      ];
      expect(derivePairKey(0, 1, metadata)).toBe('pair_1');
    });

    it('finds key directly on right index', () => {
      const metadata = [
        { tree_pair_key: null },
        { tree_pair_key: 'pair_2' }
      ];
      expect(derivePairKey(0, 1, metadata)).toBe('pair_2');
    });

    it('scans range for key', () => {
      const metadata = [
        { tree_pair_key: null },
        { tree_pair_key: 'pair_mid' },
        { tree_pair_key: null }
      ];
      expect(derivePairKey(0, 2, metadata)).toBe('pair_mid');
    });

    it('returns null if no key found', () => {
      const metadata = [ {}, {} ];
      expect(derivePairKey(0, 1, metadata)).toBeNull();
    });
  });

  describe('buildViewLinkMapping', () => {
    it('maps source groups to destination groups based on solution ID', () => {
      // Data structure mimicking response.json logic
      const pairSolution = {
        solution_to_source_map: {
          'sol_A': [[1, 2], [3]], // Two source groups for solution A
          'sol_B': [[4]]
        },
        solution_to_destination_map: {
          'sol_A': [[10, 20]], // One dest group for solution A
          'sol_B': [[30]]
        }
      };

      const mapping = buildViewLinkMapping(0, 1, pairSolution);

      expect(mapping.fromIndex).toBe(0);
      expect(mapping.toIndex).toBe(1);
      expect(mapping.sourceToDest).toBeDefined();

      // Logic:
      // sol_A connects src [1,2] -> dst [10,20]
      // sol_A connects src [3] -> dst [10,20]
      // Keys are hyphenated normalized strings

      const keySrc1 = '1-2';
      const keySrc2 = '3';
      const keyDst = '10-20';

      expect(mapping.sourceToDest[keySrc1]).toContain(keyDst);
      expect(mapping.sourceToDest[keySrc2]).toContain(keyDst);

      // sol_B
      expect(mapping.sourceToDest['4']).toContain('30');
    });

    it('handles empty inputs gracefully', () => {
      const mapping = buildViewLinkMapping(0, 1, null);
      expect(mapping.sourceToDest).toEqual({});
    });
  });
});
