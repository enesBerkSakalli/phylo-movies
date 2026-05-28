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
        { name: 'taxon_2', length: 0.3, split_indices: [1], children: [] },
      ],
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
      layoutCacheKey: 'layout-key-0',
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
        { name: 'taxon_2', length: 0, split_indices: [1], children: [] },
      ],
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      maxGlobalScale: 0,
    });

    expect(result.layout.scale).toBe(240);
    expect(result.layerData.nodes).toHaveLength(3);
  });

  it('does not treat null maxGlobalScale as uniform scaling', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1],
      children: [
        { name: 'taxon_1', length: 1, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 1, split_indices: [1], children: [] },
      ],
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      maxGlobalScale: null,
    });

    expect(result.layout.scale).not.toBe(240);
  });

  it('uses the effective rendered tree radius for worker label and extension rings', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1],
      children: [
        { name: 'taxon_1', length: 1, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 1, split_indices: [1], children: [] },
      ],
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      maxGlobalScale: 10,
      labelOffsets: { DEFAULT: 2, EXTENSION: 1 },
    });

    expect(result.layerData.extensions[0].polarData.target.radius).toBe(
      result.layout.max_radius + 1
    );
    expect(result.layerData.labels[0].polarPosition).toBe(result.layout.max_radius + 3);
  });

  it('expands dense worker label rings without dropping labels', () => {
    const leafCount = 160;
    const treeData = {
      name: '',
      length: 0,
      split_indices: Array.from({ length: leafCount }, (_value, index) => index),
      children: Array.from({ length: leafCount }, (_value, index) => ({
        name: `taxon_${index}`,
        length: 1,
        split_indices: [index],
        children: [],
      })),
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      labelOffsets: { DEFAULT: 1, EXTENSION: 1 },
      fontSize: '1.8em',
    });

    expect(result.layerData.labels).toHaveLength(leafCount);
    expect(result.layerData.labels[0].polarPosition).toBeGreaterThan(result.layout.max_radius + 2);
    expect(result.layerData.extensions[0].polarData.target.radius).toBeCloseTo(
      result.layerData.labels[0].polarPosition - 1
    );
  });

  it('keeps worker label and extension rings stable when visual label size changes', () => {
    const leafCount = 160;
    const treeData = {
      name: '',
      length: 0,
      split_indices: Array.from({ length: leafCount }, (_value, index) => index),
      children: Array.from({ length: leafCount }, (_value, index) => ({
        name: `taxon_${index}`,
        length: 1,
        split_indices: [index],
        children: [],
      })),
    };
    const options = {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      labelOffsets: { DEFAULT: 1, EXTENSION: 1 },
    };

    const smallLabelResult = calculateLayoutWorkerResult(treeData, {
      ...options,
      fontSize: '0.8em',
    });
    const largeLabelResult = calculateLayoutWorkerResult(treeData, {
      ...options,
      fontSize: '8em',
    });

    expect(largeLabelResult.layerData.labels[0].polarPosition).toBe(
      smallLabelResult.layerData.labels[0].polarPosition
    );
    expect(largeLabelResult.layerData.extensions[0].polarData.target.radius).toBe(
      smallLabelResult.layerData.extensions[0].polarData.target.radius
    );
  });

  it('ignores worker-provided minimum visual branch length for coordinate geometry', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0],
      children: [{ name: 'taxon_1', length: 0.001, split_indices: [0], children: [] }],
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      maxGlobalScale: 10,
      minVisualBranchLength: 0.05,
    });
    const leaf = result.layout.nodes.find((node) => node.name === 'taxon_1');

    expect(leaf.metricBranchLength).toBe(0.001);
    expect(leaf.visualBranchLength).toBe(0.001);
  });
});
