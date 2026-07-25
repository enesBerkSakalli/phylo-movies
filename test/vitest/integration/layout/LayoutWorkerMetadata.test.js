import { describe, expect, it } from 'vitest';
import { calculateLayoutWorkerResult } from '../../../../src/treeVisualisation/workers/layout.worker.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../src/treeVisualisation/layout/hyperbolicProjection/index.js';

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

  it('applies hyperbolic projection in worker layout data', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0],
      children: [
        {
          name: 'internal',
          length: 1,
          split_indices: [0],
          children: [{ name: 'taxon_1', length: 1, split_indices: [0], children: [] }],
        },
      ],
    };

    const radialResult = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutProjectionMode: LAYOUT_PROJECTION_MODES.RADIAL,
      hyperbolicProjectionStrength: 1,
    });
    const hyperbolicResult = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutProjectionMode: LAYOUT_PROJECTION_MODES.HYPERBOLIC,
      hyperbolicProjectionStrength: 1,
    });
    const radialInternal = radialResult.layout.nodes.find((node) => node.name === 'internal');
    const hyperbolicInternal = hyperbolicResult.layout.nodes.find(
      (node) => node.name === 'internal'
    );

    expect(hyperbolicResult.layout.projectionMode).toBe(LAYOUT_PROJECTION_MODES.HYPERBOLIC);
    expect(hyperbolicInternal.radius).toBeGreaterThan(radialInternal.radius);
    expect(hyperbolicResult.layerData.nodes).toHaveLength(radialResult.layerData.nodes.length);
  });

  it('applies Walrus 3D projection in worker layout and layer data', () => {
    const treeData = {
      name: '',
      length: 0,
      split_indices: [0, 1, 2],
      children: [
        { name: 'taxon_1', length: 1, split_indices: [0], children: [] },
        { name: 'taxon_2', length: 1, split_indices: [1], children: [] },
        { name: 'taxon_3', length: 1, split_indices: [2], children: [] },
      ],
    };

    const result = calculateLayoutWorkerResult(treeData, {
      width: 800,
      height: 600,
      margin: 60,
      branchTransformation: 'none',
      layoutProjectionMode: LAYOUT_PROJECTION_MODES.WALRUS_3D,
      hyperbolicProjectionStrength: 1,
      linkGeometryMode: 'radial-elbow',
      labelOffsets: { DEFAULT: 2, EXTENSION: 1 },
    });
    const leaf = result.layout.nodes.find((node) => Math.abs(node.position?.[2] || 0) > 1e-9);
    expect(leaf).toBeTruthy();
    const renderedLeaf = result.layerData.nodes.find((node) => node.name === leaf.name);
    const renderedLink = result.layerData.links.find((link) => link.targetName === leaf.name);

    expect(result.layout.projectionMode).toBe(LAYOUT_PROJECTION_MODES.WALRUS_3D);
    expect(result.layout.is3dLayout).toBe(true);
    expect(Math.abs(leaf.position[2])).toBeGreaterThan(0);
    expect(renderedLeaf.position[2]).toBe(leaf.position[2]);
    expect(renderedLink.targetPosition[2]).toBe(leaf.position[2]);
    expect(renderedLink.path[5]).toBeCloseTo(leaf.position[2]);
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
