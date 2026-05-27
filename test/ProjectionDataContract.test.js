import { describe, expect, it } from 'vitest';
import { applyFitAreaToTarget } from '../src/treeVisualisation/spatial/projections.js';

describe('applyFitAreaToTarget', () => {
  it('surfaces unexpected viewport unprojection failures', () => {
    const error = new Error('unproject failed');
    const view = {
      makeViewport: () => ({
        unproject: () => {
          throw error;
        },
      }),
    };

    expect(() =>
      applyFitAreaToTarget(
        view,
        [10, 20, 0],
        2,
        { left: 0, top: 0, width: 1000, height: 700 },
        1000,
        800,
        { target: [0, 0, 0], zoom: 0 }
      )
    ).toThrow(error);
  });
});
