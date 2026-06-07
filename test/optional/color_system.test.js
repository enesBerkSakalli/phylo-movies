import { expect } from 'chai';
import Color from 'colorjs.io';
import { generatePalette } from '../../src/constants/ColorPalettes.js';
import { ColorSchemeManager } from '../../src/treeColoring/utils/ColorSchemeManager.js';

describe('Color System TDD (Performance & Quality)', () => {
  let colorManager;

  beforeEach(() => {
    colorManager = new ColorSchemeManager();
  });

  describe('Contrast Compliance (APCA)', () => {
    // APCA 45 is sufficient for visual elements (nodes, branches, labels with outlines)
    // 60 was too aggressive and caused colors to be washed out / over-darkened
    it('should generate colors with APCA Lc > 45 against white background', () => {
      const white = new Color('white');
      const failures = [];

      for (let i = 0; i < 100; i++) {
        const rgb = colorManager.getRandomColor();
        const color = new Color('srgb', [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]);

        // Absolute APCA value (Lc can be negative for dark text on light bg)
        const contrast = Math.abs(white.contrast(color, 'APCA'));

        if (contrast <= 45) {
          failures.push({
            color: color.toString({ format: 'hex' }),
            contrast: contrast,
          });
        }
      }

      expect(
        failures.length,
        `Found ${failures.length} colors with poor contrast (< 45 Lc)`
      ).to.equal(0);
    });
  });

  describe('Visual Distinctness (DeltaE 2000)', () => {
    it('should ensure minimum perceptual distance between palette colors', () => {
      // Request a palette of 10 colors
      const dummyTargets = Array.from({ length: 10 }, (_, i) => ({ name: `Group ${i}` }));
      colorManager.applyColorScheme('default', dummyTargets, true); // true = isGroup

      const colors = Object.values(colorManager.groupColorMap).map(
        (rgb) => new Color('srgb', [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])
      );

      let minDistance = Infinity;
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const d = colors[i].deltaE(colors[j], '2000');
          if (d < minDistance) minDistance = d;
        }
      }

      // DeltaE > 10 is clearly distinct. > 5 is noticeable.
      // We aim for high distinctness for groups, but darkening might reduce it slightly.
      expect(minDistance).to.be.above(5, 'Minimum DeltaE 2000 between group colors should be > 5');
    });

    it('should generate unique high-distance categorical palettes for large tree color sets', () => {
      const palette = generatePalette(30, 'categorical');
      const fallbackPalette = generatePalette(30, 'missing-scheme');
      const colors = palette.map((hex) => new Color(hex));
      const uniqueColors = new Set(palette);

      let minDistance = Infinity;
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const d = colors[i].deltaE(colors[j], '2000');
          if (d < minDistance) minDistance = d;
        }
      }

      expect(uniqueColors.size).to.equal(30, 'Dynamic categorical palettes should not duplicate');
      expect(new Set(fallbackPalette).size).to.equal(
        30,
        'Unknown dynamic palettes should use the categorical fallback'
      );
      expect(minDistance).to.be.above(
        10,
        'Dynamic categorical colors should remain visibly separated'
      );
    }).timeout(10000);

    it('should use the categorical generator when a selected palette has too few colors', () => {
      const dummyTargets = Array.from({ length: 30 }, (_, i) => `Taxon ${i}`);
      colorManager.reset();
      colorManager.applyColorScheme('Tableau10', dummyTargets, false);

      const colors = Object.values(colorManager.taxaColorMap).map(
        (rgb) => new Color('srgb', [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])
      );
      const uniqueStrings = new Set(
        Object.values(colorManager.taxaColorMap).map((c) => c.join(','))
      );

      let minDistance = Infinity;
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const d = colors[i].deltaE(colors[j], '2000');
          if (d < minDistance) minDistance = d;
        }
      }

      expect(uniqueStrings.size).to.equal(30);
      expect(minDistance).to.be.above(10);
    }).timeout(10000);

    it('should keep undersized selected schemes visually distinct when extending them', () => {
      const targets = Array.from({ length: 12 }, (_, i) => `Taxon ${i}`);
      const tableauManager = new ColorSchemeManager();
      const categoryManager = new ColorSchemeManager();

      tableauManager.applyColorScheme('Tableau10', targets, false);
      categoryManager.applyColorScheme('Category10', targets, false);

      const tableauColors = Object.values(tableauManager.taxaColorMap).map((c) => c.join(','));
      const categoryColors = Object.values(categoryManager.taxaColorMap).map((c) => c.join(','));

      expect(categoryColors).not.to.deep.equal(tableauColors);
    }).timeout(10000);
  });

  describe('Palette Preservation (Fix & Keep)', () => {
    it('should preserve all colors in Tableau10 by darkening invalid ones instead of dropping them', () => {
      // Tableau10 has 10 colors. Some fail APCA 60 on white (Yellow, etc).
      // We want applyColorScheme to result in 10 unique colors.
      const dummyTargets = Array.from({ length: 10 }, (_, i) => ({ name: `Group ${i}` }));
      colorManager.reset();
      colorManager.applyColorScheme('Tableau10', dummyTargets, true);

      const colors = Object.values(colorManager.groupColorMap);
      expect(colors.length).to.equal(10); // Should use all 10

      // Verify they are all unique
      const uniqueStrings = new Set(colors.map((c) => c.join(',')));
      expect(uniqueStrings.size).to.equal(10, 'Should retain 10 unique colors');

      // Verify all pass contrast (using new threshold of 45 for visual elements)
      const white = new Color('white');
      colors.forEach((rgb) => {
        const color = new Color('srgb', [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]);
        const contrast = Math.abs(white.contrast(color, 'APCA'));
        // We allow >= 44.9 due to floating point
        expect(contrast).to.be.at.least(
          44.9,
          `Color ${color.toString()} should meet contrast specs`
        );
      });
    });
  });

  describe('Color normalization', () => {
    it('clamps RGB array inputs when restoring original color maps', () => {
      const manager = new ColorSchemeManager({
        TaxonA: [300, -20, 127.5, 64],
      });

      expect(manager.taxaColorMap.TaxonA).to.deep.equal([255, 0, 128]);
    });
  });
});
