
import { describe, it, expect } from 'vitest';
import { ensureOutside, chooseBundlePoint } from '../src/js/treeVisualisation/deckgl/data/transforms/ComparisonGeometryUtils.js';

describe('ComparisonGeometryUtils', () => {
    describe('ensureOutside', () => {
        it('should push a point that is inside the radius to the radius boundary', () => {
            const center = [0, 0];
            const pt = [10, 0]; // r = 10
            const minRadius = 20;

            const result = ensureOutside(pt, center, minRadius);
            // Result should be at (20, 0)
            expect(result[0]).toBeCloseTo(20);
            expect(result[1]).toBeCloseTo(0);
        });

        it('should apply depth offset', () => {
            const center = [0, 0];
            const pt = [20, 0];
            const minRadius = 10;
            const depthOffset = 30; // Total target 40

            const result = ensureOutside(pt, center, minRadius, depthOffset);
            expect(result[0]).toBeCloseTo(40);
        });
    });
});
