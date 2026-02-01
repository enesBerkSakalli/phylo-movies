import { expect } from 'chai';
import Color from 'colorjs.io';
import { ColorSchemeManager } from '../src/js/treeColoring/utils/ColorSchemeManager.js';
import { getThemeBackgroundColor } from '../src/js/services/ui/colorUtils.js';

// Mock browser environment for certain tests if needed
// global.window = { getComputedStyle: () => ({ backgroundColor: 'rgb(255, 255, 255)' }) };
// (We might need to mock this better if getThemeBackgroundColor relies on DOM)

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
            contrast: contrast
          });
        }
      }

      expect(failures.length, `Found ${failures.length} colors with poor contrast (< 45 Lc)`).to.equal(0);
    });
  });

  describe('Visual Distinctness (DeltaE 2000)', () => {
    it('should ensure minimum perceptual distance between palette colors', () => {
      // Request a palette of 10 colors
      const dummyTargets = Array.from({ length: 10 }, (_, i) => ({ name: `Group ${i}` }));
      colorManager.applyColorScheme('default', dummyTargets, true); // true = isGroup

      const colors = Object.values(colorManager.groupColorMap).map(rgb =>
        new Color('srgb', [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])
      );

      let minDistance = Infinity;
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const d = colors[i].deltaE(colors[j], "2000");
          if (d < minDistance) minDistance = d;
        }
      }

      // DeltaE > 10 is clearly distinct. > 5 is noticeable.
      // We aim for high distinctness for groups, but darkening might reduce it slightly.
      expect(minDistance).to.be.above(5, 'Minimum DeltaE 2000 between group colors should be > 5');
    });
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
      const uniqueStrings = new Set(colors.map(c => c.join(',')));
      expect(uniqueStrings.size).to.equal(10, 'Should retain 10 unique colors');

      // Verify all pass contrast (using new threshold of 45 for visual elements)
      const white = new Color('white');
      colors.forEach(rgb => {
        const color = new Color("srgb", [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]);
        const contrast = Math.abs(white.contrast(color, "APCA"));
        // We allow >= 44.9 due to floating point
        expect(contrast).to.be.at.least(44.9, `Color ${color.toString()} should meet contrast specs`);
      });
    });
  });
});
