
import { describe, it, expect } from 'vitest';
import { ensureOutside, chooseBundlePoint } from '../src/treeVisualisation/deckgl/data/transforms/ComparisonGeometryUtils.js';

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

    describe('chooseBundlePoint', () => {
        it('uses normalized parent ids to bundle at the common ancestor', () => {
            const center = [0, 0];
            const parent = {
                id: 'node-parent',
                parentId: null,
                depth: 1,
                position: [0, 80, 0]
            };
            const left = {
                id: 'node-left',
                parentId: 'node-parent',
                depth: 2,
                position: [-100, 0, 0]
            };
            const right = {
                id: 'node-right',
                parentId: 'node-parent',
                depth: 2,
                position: [100, 0, 0]
            };
            const infoById = new Map([
                [parent.id, parent],
                [left.id, left],
                [right.id, right]
            ]);

            const point = chooseBundlePoint([
                { sourceInfo: left, source: left.position },
                { sourceInfo: right, source: right.position }
            ], null, center, 100, true, infoById);

            expect(Math.abs(point[0])).toBeLessThan(1e-6);
            expect(point[1]).toBeGreaterThan(150);
        });
    });
});
