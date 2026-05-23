const { expect } = require('chai');
const { colorToRgb, toHexMap } = require('../../src/services/ui/colorUtils.js');

describe('Color Utils', () => {
  describe('colorToRgb', () => {
    it('parses trimmed hex, rgb, and hsl strings case-insensitively', () => {
      expect(colorToRgb(' #abc ')).to.deep.equal([170, 187, 204]);
      expect(colorToRgb(' RGB(10, 20, 30) ')).to.deep.equal([10, 20, 30]);
      expect(colorToRgb(' HSL(144, 70%, 60%) ')).to.deep.equal([82, 224, 139]);
    });

    it('rejects malformed hex strings instead of parsing partial channels', () => {
      expect(colorToRgb('f')).to.deep.equal([0, 0, 0]);
      expect(colorToRgb('12zz34')).to.deep.equal([0, 0, 0]);
    });

    it('rejects malformed hsl percentage channels', () => {
      expect(colorToRgb('hsl(0, %, 50%)')).to.deep.equal([0, 0, 0]);
    });

    it('clamps rgb channels to the valid byte range', () => {
      expect(colorToRgb('rgb(999, -10, 127.5)')).to.deep.equal([255, 0, 128]);
      expect(colorToRgb([300, -10, 127.5])).to.deep.equal([255, 0, 128]);
      expect(colorToRgb([255, 0])).to.deep.equal([0, 0, 0]);
    });

    it('parses modern hsl syntax and wraps hue values', () => {
      expect(colorToRgb('hsl(480 100% 50% / 0.5)')).to.deep.equal([0, 255, 0]);
    });
  });

  describe('toHexMap', () => {
    it('normalizes array and string colors to hex', () => {
      expect(
        toHexMap({
          array: [255, 0, 255],
          shortHex: 'abc',
          rgb: 'rgb(0, 128, 255)',
          hsl: 'hsl(0, 100%, 50%)',
        })
      ).to.deep.equal({
        array: '#ff00ff',
        shortHex: '#aabbcc',
        rgb: '#0080ff',
        hsl: '#ff0000',
      });
    });
  });
});
