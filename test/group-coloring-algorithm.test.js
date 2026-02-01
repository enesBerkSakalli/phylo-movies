/**
 * Test script for group coloring algorithm
 * Tests if color schemes properly assign unique colors to groups
 *
 * Run with: npm test
 */

import { expect } from 'chai';
import { ColorSchemeManager } from '../src/js/treeColoring/utils/ColorSchemeManager.js';
import { CATEGORICAL_PALETTES, getPalette } from '../src/js/constants/ColorPalettes.js';
import fs from 'fs';
import path from 'path';

// Load the metadata CSV to get real g_genotype groups
function loadGGenotypes() {
  const csvPath = path.join(
    process.cwd(),
    'data/norovirus/global_analysis_workflow/300_taxa_build/norovirus_global_300taxa_metadata.csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.warn('CSV file not found, using mock data');
    return getMockGGenotypes();
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].split(',');
  const gGenotypeIdx = header.indexOf('g_genotype');

  if (gGenotypeIdx === -1) {
    console.warn('g_genotype column not found, using mock data');
    return getMockGGenotypes();
  }

  const genotypes = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[gGenotypeIdx]) {
      genotypes.add(cols[gGenotypeIdx].trim());
    }
  }

  return Array.from(genotypes).sort();
}

function getMockGGenotypes() {
  // Based on the CSV, these are typical g_genotypes
  return [
    'GII-17', 'GII-4', 'GII-6', 'GII-1', 'GII-14', 'GII-21', 'GII-2', 'GII-3',
    'GII-12', 'GII-13', 'GII-15', 'GI-1', 'GI-3', 'GII-7', 'GII-23', 'GII-27',
    'GIX-1', 'GV-1', 'GVII-1', 'GIII-2', 'UnknownG'
  ];
}

// Convert RGB array to hex for easier comparison
function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  return '#' + rgb.slice(0, 3).map(c => {
    const hex = Math.round(c).toString(16).padStart(2, '0');
    return hex;
  }).join('');
}

describe('Group Coloring Algorithm Tests', () => {
  let gGenotypes;
  let colorManager;

  beforeEach(() => {
    gGenotypes = loadGGenotypes();
    colorManager = new ColorSchemeManager({});
  });

  describe('G-Genotype Analysis', () => {
    it('should identify all unique g_genotypes', () => {
      console.log('\n=== G-Genotype Analysis ===');
      console.log(`Total unique g_genotypes: ${gGenotypes.length}`);
      console.log('Groups:', gGenotypes.join(', '));

      expect(gGenotypes.length).to.be.greaterThan(0);
    });
  });

  describe('Palette Size Analysis', () => {
    it('should analyze available palettes and their sizes', () => {
      console.log('\n=== Palette Size Analysis ===');

      const paletteInfo = [];
      for (const [name, colors] of Object.entries(CATEGORICAL_PALETTES)) {
        paletteInfo.push({
          name,
          size: colors.length,
          coversAllGroups: colors.length >= gGenotypes.length
        });
      }

      paletteInfo.sort((a, b) => b.size - a.size);

      console.log(`Number of groups to color: ${gGenotypes.length}`);
      console.log('\nPalette sizes:');
      paletteInfo.forEach(p => {
        const status = p.coversAllGroups ? '✅' : '⚠️ (will repeat colors)';
        console.log(`  ${p.name}: ${p.size} colors ${status}`);
      });

      const palettesThatCover = paletteInfo.filter(p => p.coversAllGroups);
      console.log(`\nPalettes with enough colors: ${palettesThatCover.length}/${paletteInfo.length}`);

      expect(paletteInfo.length).to.be.greaterThan(0);
    });
  });

  describe('Color Assignment Tests', () => {
    it('should detect color repetition in scheme assignment', () => {
      console.log('\n=== Color Assignment Test ===');

      // Create mock groups like the real system does
      const groups = gGenotypes.map((name, i) => ({
        name,
        count: 10 + i, // Mock count
        members: []
      }));

      // Test each palette
      const results = [];

      for (const paletteName of Object.keys(CATEGORICAL_PALETTES)) {
        // Reset color manager
        colorManager.groupColorMap = {};

        // Apply color scheme (this is what the UI does)
        colorManager.applyColorScheme(paletteName, groups, true);

        // Analyze assignments
        const colorToGroups = new Map();
        const assignments = [];

        for (const group of groups) {
          const rgb = colorManager.groupColorMap[group.name];
          const hex = rgbToHex(rgb);
          assignments.push({ group: group.name, hex });

          if (!colorToGroups.has(hex)) {
            colorToGroups.set(hex, []);
          }
          colorToGroups.get(hex).push(group.name);
        }

        // Find duplicates
        const duplicates = [];
        for (const [hex, groupNames] of colorToGroups) {
          if (groupNames.length > 1) {
            duplicates.push({ hex, groups: groupNames });
          }
        }

        results.push({
          palette: paletteName,
          paletteSize: CATEGORICAL_PALETTES[paletteName].length,
          groupCount: groups.length,
          uniqueColors: colorToGroups.size,
          duplicateCount: duplicates.length,
          duplicates
        });
      }

      // Report results
      console.log(`\nTesting ${results.length} palettes with ${gGenotypes.length} groups:\n`);

      for (const r of results) {
        const status = r.duplicateCount === 0 ? '✅ All unique' : `⚠️ ${r.duplicateCount} colors repeated`;
        console.log(`${r.palette} (${r.paletteSize} colors): ${status}`);

        if (r.duplicates.length > 0) {
          r.duplicates.forEach(d => {
            console.log(`    ${d.hex} → ${d.groups.join(', ')}`);
          });
        }
      }

      // At least report the findings
      const perfectPalettes = results.filter(r => r.duplicateCount === 0);
      console.log(`\n${perfectPalettes.length}/${results.length} palettes assign unique colors to all groups`);
    });

    it('should verify _orderPaletteForMaxDistance returns enough colors', () => {
      console.log('\n=== Max Distance Ordering Test ===');

      const groups = gGenotypes.map((name, i) => ({
        name,
        count: 10 + i,
        members: []
      }));

      // Test with a known palette
      const testPalette = 'Tableau10';
      const palette = getPalette(testPalette);

      console.log(`Palette "${testPalette}" has ${palette.length} colors`);
      console.log(`Need to color ${groups.length} groups`);

      // Apply scheme
      colorManager.groupColorMap = {};
      colorManager.applyColorScheme(testPalette, groups, true);

      // Count unique colors assigned
      const uniqueHexes = new Set();
      for (const group of groups) {
        const hex = rgbToHex(colorManager.groupColorMap[group.name]);
        uniqueHexes.add(hex);
      }

      console.log(`Unique colors assigned: ${uniqueHexes.size}`);

      // With dynamic palette generation, we should now get exactly as many unique colors as groups
      // (ColorSchemeManager now generates a dynamic palette when groups > palette size)
      if (groups.length > palette.length) {
        console.log(`\n✅ Dynamic palette generation kicked in!`);
        console.log(`Original palette had ${palette.length} colors, but we got ${uniqueHexes.size} unique colors.`);
      }

      // All groups should get unique colors now (thanks to dynamic generation)
      expect(uniqueHexes.size).to.equal(groups.length);
    });
  });

  describe('Recommendations', () => {
    it('should suggest solutions for color repetition', () => {
      console.log('\n=== Recommendations ===');

      const groupCount = gGenotypes.length;

      // Find best palettes
      const sortedPalettes = Object.entries(CATEGORICAL_PALETTES)
        .map(([name, colors]) => ({ name, size: colors.length }))
        .sort((a, b) => b.size - a.size);

      const bestPalette = sortedPalettes[0];

      console.log(`You have ${groupCount} groups to color.`);
      console.log(`Largest available palette: "${bestPalette.name}" with ${bestPalette.size} colors.`);

      if (groupCount > bestPalette.size) {
        console.log('\n📋 Recommendations:');
        console.log('1. Add a larger palette with 25+ distinct colors');
        console.log('2. Implement dynamic color generation for overflow groups');
        console.log('3. Use color variations (lighter/darker) for repeated base colors');
        console.log('4. Combine palettes for more variety');
      } else {
        console.log(`\n✅ The "${bestPalette.name}" palette should cover all groups.`);
      }
    });
  });
});
