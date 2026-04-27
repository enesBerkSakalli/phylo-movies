import { describe, expect, it } from 'vitest';
import { calculateLayoutWorkerResult } from '../src/treeVisualisation/workers/layout.worker.js';

describe('layout worker metadata', () => {
  it('attaches max_radius to worker layout and layer data', () => {
    const treeData = {
      id: 'root',
      length: 0,
      children: [
        { id: 'taxon_1', length: 0.2, children: [] },
        { id: 'taxon_2', length: 0.3, children: [] }
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
