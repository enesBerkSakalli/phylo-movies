import { describe, expect, it } from 'vitest';
import { calculateLayoutWorkerResult } from '../src/treeVisualisation/workers/layout.worker.js';

describe('layout worker metadata', () => {
  it('attaches max_radius to worker layout and layer data', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1],
      children: [
        { name: 'taxon_1', length: 0.2, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 0.3, split_indices: [1], children: [] }
      ]
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      extensionRadius: 245,
      labelRadius: 265
    });

    expect(result.layout.max_radius).toBeGreaterThan(0);
    expect(result.layerData.max_radius).toBe(result.layout.max_radius);
  });
});
