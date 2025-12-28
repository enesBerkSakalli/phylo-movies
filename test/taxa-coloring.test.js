/**
 * Tests for Taxa Coloring utilities
 * Tests GroupingUtils.js and related state management
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateGroups,
  getGroupForTaxon,
  applyColoringData,
  detectBestSeparators
} from '../src/js/treeColoring/utils/GroupingUtils.js';

describe('GroupingUtils', () => {
  describe('generateGroups', () => {
    const taxaNames = [
      'Species_A_1',
      'Species_A_2',
      'Species_B_1',
      'Species_B_2',
      'Species_C_1',
      'Ungrouped'
    ];

    it('should generate groups using prefix strategy with underscore separator', () => {
      const result = generateGroups(taxaNames, ['_'], 'prefix');

      expect(result.groups).toHaveLength(1); // Only "Species" group
      expect(result.groups[0].name).toBe('Species');
      expect(result.groups[0].count).toBe(5);
      expect(result.ungroupedCount).toBe(1);
    });

    it('should auto-detect separators when not provided', () => {
      const result = generateGroups(taxaNames, null, 'prefix');

      expect(result.analyzed).toBe(true);
      expect(result.separators).toBeDefined();
      expect(result.separators).toContain('_');
    });

    it('should handle first-letter strategy without separator', () => {
      const result = generateGroups(taxaNames, null, 'first-letter');

      expect(result.groups.length).toBeGreaterThan(0);
      // All taxa start with 'S' or 'U'
      const groupNames = result.groups.map(g => g.name);
      expect(groupNames).toContain('S');
      expect(groupNames).toContain('U');
    });

    it('should handle suffix strategy', () => {
      const result = generateGroups(taxaNames.slice(0, 5), ['_'], 'suffix');

      expect(result.groups).toHaveLength(2); // Groups "1" and "2"
      const groupNames = result.groups.map(g => g.name);
      expect(groupNames).toContain('1');
      expect(groupNames).toContain('2');
    });

    it('should return empty groups for taxa without separator', () => {
      const simpleTaxa = ['TaxonA', 'TaxonB', 'TaxonC'];
      const result = generateGroups(simpleTaxa, ['_'], 'prefix');

      expect(result.groups).toHaveLength(0);
      expect(result.ungroupedCount).toBe(3);
      expect(result.ungroupedPercent).toBe(100);
    });
  });

  describe('getGroupForTaxon', () => {
    it('should extract prefix group with underscore separator', () => {
      const result = getGroupForTaxon('Species_A_1', ['_'], 'prefix');
      expect(result).toBe('Species');
    });

    it('should extract suffix group', () => {
      const result = getGroupForTaxon('Species_A_1', ['_'], 'suffix');
      expect(result).toBe('1');
    });

    it('should handle first-letter strategy', () => {
      const result = getGroupForTaxon('Species_A_1', null, 'first-letter');
      expect(result).toBe('S');
    });

    it('should return null for taxon without separator', () => {
      const result = getGroupForTaxon('TaxonA', ['_'], 'prefix');
      expect(result).toBeNull();
    });

    it('should handle regex pattern', () => {
      const result = getGroupForTaxon('Species_A_1', null, 'prefix', {
        useRegex: true,
        regexPattern: '([A-Za-z]+)_'
      });
      expect(result).toBe('Species');
    });
  });

  describe('detectBestSeparators', () => {
    it('should detect underscore as best separator', () => {
      const taxaNames = ['A_1', 'A_2', 'B_1', 'B_2', 'C_1'];
      const result = detectBestSeparators(taxaNames);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].separator).toBe('_');
    });

    it('should rank separators by usage', () => {
      const taxaNames = ['A_1', 'A_2', 'B-1', 'C_1', 'D_1'];
      const result = detectBestSeparators(taxaNames);

      // Underscore appears in 4/5 taxa, dash in 1/5
      expect(result[0].separator).toBe('_');
    });

    it('should return empty for taxa without common separators', () => {
      const taxaNames = ['TaxonA', 'TaxonB', 'TaxonC'];
      const result = detectBestSeparators(taxaNames);

      expect(result).toHaveLength(0);
    });
  });

  describe('applyColoringData', () => {
    const leaveOrder = ['Species_A_1', 'Species_A_2', 'Species_B_1'];
    const defaultColorMap = { defaultColor: '#000000' };

    it('should apply taxa mode coloring', () => {
      const colorData = {
        mode: 'taxa',
        taxaColorMap: {
          'Species_A_1': '#FF0000',
          'Species_A_2': '#00FF00'
        }
      };

      const result = applyColoringData(colorData, leaveOrder, defaultColorMap);

      expect(result['Species_A_1']).toBe('#FF0000');
      expect(result['Species_A_2']).toBe('#00FF00');
      // Species_B_1 not in taxaColorMap, should not be in result
    });

    it('should apply groups mode coloring', () => {
      const colorData = {
        mode: 'groups',
        separators: ['_'],
        strategyType: 'prefix',
        groupColorMap: {
          'Species': '#FF0000'
        }
      };

      const result = applyColoringData(colorData, leaveOrder, defaultColorMap);

      expect(result['Species_A_1']).toBe('#FF0000');
      expect(result['Species_A_2']).toBe('#FF0000');
      expect(result['Species_B_1']).toBe('#FF0000');
    });

    it('should apply csv mode coloring with Map', () => {
      const csvTaxaMap = new Map([
        ['Species_A_1', 'GroupA'],
        ['Species_A_2', 'GroupA'],
        ['Species_B_1', 'GroupB']
      ]);

      const colorData = {
        mode: 'csv',
        csvTaxaMap,
        groupColorMap: {
          'GroupA': '#FF0000',
          'GroupB': '#00FF00'
        }
      };

      const result = applyColoringData(colorData, leaveOrder, defaultColorMap);

      expect(result['Species_A_1']).toBe('#FF0000');
      expect(result['Species_A_2']).toBe('#FF0000');
      expect(result['Species_B_1']).toBe('#00FF00');
    });

    it('should apply csv mode coloring with Object (serialized state)', () => {
      // This tests the fix for Issue 3: Object instead of Map
      const csvTaxaMap = {
        'Species_A_1': 'GroupA',
        'Species_A_2': 'GroupA',
        'Species_B_1': 'GroupB'
      };

      const colorData = {
        mode: 'csv',
        csvTaxaMap,
        groupColorMap: {
          'GroupA': '#FF0000',
          'GroupB': '#00FF00'
        }
      };

      const result = applyColoringData(colorData, leaveOrder, defaultColorMap);

      expect(result['Species_A_1']).toBe('#FF0000');
      expect(result['Species_A_2']).toBe('#FF0000');
      expect(result['Species_B_1']).toBe('#00FF00');
    });

    it('should fall back to default color when group is missing', () => {
      const colorData = {
        mode: 'groups',
        separators: ['_'],
        strategyType: 'prefix',
        groupColorMap: {} // No colors defined
      };

      const result = applyColoringData(colorData, leaveOrder, defaultColorMap);

      expect(result['Species_A_1']).toBe('#000000');
    });
  });
});

describe('Group State Persistence', () => {
  it('should preserve group configuration across serialization', () => {
    const originalConfig = {
      mode: 'groups',
      separators: ['_'],
      strategyType: 'prefix',
      segmentIndex: 0,
      useRegex: false,
      regexPattern: '',
      groupColorMap: {
        'Species': '#FF0000',
        'Genus': '#00FF00'
      }
    };

    // Simulate serialization (what happens when storing to Zustand)
    const serialized = JSON.parse(JSON.stringify(originalConfig));

    // Verify all fields survive serialization
    expect(serialized.mode).toBe('groups');
    expect(serialized.separators).toEqual(['_']);
    expect(serialized.strategyType).toBe('prefix');
    expect(serialized.groupColorMap.Species).toBe('#FF0000');
  });

  it('should handle csvTaxaMap serialization from Map to Object', () => {
    const csvTaxaMap = new Map([
      ['Taxon1', 'GroupA'],
      ['Taxon2', 'GroupB']
    ]);

    // This is what TaxaColoring.jsx does
    const serialized = {
      csvTaxaMap: Object.fromEntries(csvTaxaMap)
    };

    // Verify it's now an Object
    expect(serialized.csvTaxaMap).not.toBeInstanceOf(Map);
    expect(serialized.csvTaxaMap['Taxon1']).toBe('GroupA');
    expect(serialized.csvTaxaMap['Taxon2']).toBe('GroupB');
  });
});
