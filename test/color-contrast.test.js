const { expect } = require('chai');
const { getContrastingHighlightColor } = require('../src/js/services/ui/colorUtils.js');

describe('High Contrast Color Logic', () => {
    // Expected Constants
    const MAGENTA = [255, 0, 255];
    const DEEP_CYAN = [0, 139, 139];

    it('should return Magenta for Blue base color', () => {
        const blue = [0, 0, 255];
        const highlight = getContrastingHighlightColor(blue);
        expect(highlight).to.deep.equal(MAGENTA);
    });

    it('should return Magenta for Green base color', () => {
        const green = [0, 255, 0];
        const highlight = getContrastingHighlightColor(green);
        expect(highlight).to.deep.equal(MAGENTA);
    });

    it('should return Deep Cyan for Red base color (Red Dominant)', () => {
        const red = [255, 0, 0];
        const highlight = getContrastingHighlightColor(red);
        expect(highlight).to.deep.equal(DEEP_CYAN);
    });

    it('should return Deep Cyan for Orange marked color (Red Dominant)', () => {
        // #ff5722 is [255, 87, 34]
        const orange = [255, 87, 34];
        const highlight = getContrastingHighlightColor(orange);
        expect(highlight).to.deep.equal(DEEP_CYAN);
    });

    it('should return Magenta for Purple base color (Not Red Dominant)', () => {
        const purple = [128, 0, 128];
        const highlight = getContrastingHighlightColor(purple);
        expect(highlight).to.deep.equal(MAGENTA);
    });

    it('should return Magenta for Pink base color (Not Red Dominant)', () => {
        const pink = [255, 192, 203];
        const highlight = getContrastingHighlightColor(pink);
        expect(highlight).to.deep.equal(MAGENTA);
    });

    it('should return Magenta by default for invalid inputs', () => {
        expect(getContrastingHighlightColor(null)).to.deep.equal(MAGENTA);
        expect(getContrastingHighlightColor([])).to.deep.equal(MAGENTA);
    });
});
