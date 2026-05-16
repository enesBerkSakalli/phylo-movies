import { describe, expect, it } from 'vitest';
import {
  applySafeAreaToTarget
} from '../src/treeVisualisation/spatial/projections.js';

describe('applySafeAreaToTarget', () => {
  it('surfaces unexpected viewport unprojection failures', () => {
    const error = new Error('unproject failed');
    const view = {
      makeViewport: () => ({
        unproject: () => {
          throw error;
        }
      })
    };

    expect(() => applySafeAreaToTarget(
      view,
      [10, 20, 0],
      2,
      { top: 0, right: 0, bottom: 100, left: 0 },
      1000,
      800,
      1000,
      700,
      { target: [0, 0, 0], zoom: 0 }
    )).toThrow(error);
  });
});
