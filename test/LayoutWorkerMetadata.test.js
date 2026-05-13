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
      labelRadius: 265,
      layoutCacheKey: 'layout-key-0'
    });

    expect(result.layout.max_radius).toBeGreaterThan(0);
    expect(result.layerData.max_radius).toBe(result.layout.max_radius);
    expect(result.layout.layoutCacheKey).toBe('layout-key-0');
    expect(result.layerData.layoutCacheKey).toBe('layout-key-0');
  });

  it('treats zero maxGlobalScale as an intentional uniform scale input', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1],
      children: [
        { name: 'taxon_1', length: 0, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 0, split_indices: [1], children: [] }
      ]
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      maxGlobalScale: 0
    });

    expect(result.layout.scale).toBe(240);
    expect(result.layerData.nodes).toHaveLength(3);
  });

  it('uses the stable global rendered radius for worker label and extension rings', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1],
      children: [
        { name: 'taxon_1', length: 1, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 1, split_indices: [1], children: [] }
      ]
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      maxGlobalScale: 10,
      labelOffsets: { DEFAULT: 2, EXTENSION: 1 }
    });

    const stableRadius = result.layout.scale * 10;
    expect(result.layout.max_radius).toBeLessThan(stableRadius);
    expect(result.layerData.extensions[0].polarData.target.radius).toBe(stableRadius + 1);
    expect(result.layerData.labels[0].polarPosition).toBe(stableRadius + 3);
  });
});
