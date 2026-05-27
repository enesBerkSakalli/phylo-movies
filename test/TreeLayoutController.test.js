import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { TreeLayoutController } from '../src/treeVisualisation/TreeLayoutController.js';

describe('TreeLayoutController radii', () => {
  const initialState = useAppStore.getState();
  const timelineFrames = [
    {
      frame_index: 0,
      frame_type: 'input_tree',
      is_observed_input: true,
    },
  ];

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('places labels and extensions from the actual layout radius', () => {
    const controller = new TreeLayoutController(null);

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 120,
    });

    expect(radii.extensionRadius).toBe(121);
    expect(radii.labelRadius).toBe(122);
  });

  it('places labels and extensions from the effective layout radius when uniform scaling is active', () => {
    const controller = new TreeLayoutController(null);
    controller.maxGlobalScale = 20;

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 120,
      scale: 10,
    });

    expect(radii.extensionRadius).toBe(121);
    expect(radii.labelRadius).toBe(122);
  });

  it('expands dense label rings while preserving all labels', () => {
    useAppStore.setState({
      fontSize: '1.8em',
      styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 1 } },
    });
    const controller = new TreeLayoutController(null);
    const leaves = Array.from({ length: 350 }, (_value, index) => ({
      angle: (index / 350) * Math.PI * 2,
    }));

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 200,
      leaves,
    });

    expect(radii.labelRadius).toBeGreaterThan(400);
    expect(radii.labelRadius).toBeLessThan(500);
    expect(radii.extensionRadius).toBeCloseTo(radii.labelRadius - 1);
  });

  it('uses zero maxGlobalScale as an intentional uniform scale input', () => {
    const controller = new TreeLayoutController(null);
    controller.maxGlobalScale = 0;

    const layout = controller._computeLayout(
      {
        id: 'root',
        length: 0,
        children: [
          { id: 'child1', length: 0 },
          { id: 'child2', length: 0 },
        ],
      },
      360,
      0
    );

    expect(layout.scale).toBe(240);
    layout.nodes.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.radius)).toBe(true);
    });
  });

  it('recalculates uniform scaling on the first branch transformation change', () => {
    const treeList = [
      {
        id: 'root',
        length: 0,
        children: [{ id: 'child', length: 1 }],
      },
    ];
    useAppStore.setState({
      treeList,
      timelineFrames,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');
    expect(controller.maxGlobalScale).toBe(1);
    expect(controller._transformedCache.size).toBe(0);
    expect(controller).not.toHaveProperty('globalScaleList');
    expect(controller).not.toHaveProperty('uniformScalingEnabled');

    useAppStore.setState({ branchTransformation: 'linear-scale' });
    controller.calculateLayout(treeList[0], { treeIndex: 0 });

    expect(controller.maxGlobalScale).toBe(2);
    expect(controller._scalingState.cacheKey).toContain('branch=linear-scale');
    expect(controller._scalingState).not.toHaveProperty('calculationTransformation');
  });

  it('uses normalized square-root branch lengths as display geometry without changing metrics', () => {
    const treeList = [
      {
        name: 'small-root',
        length: 0,
        children: [
          { name: 'small-a', length: 1 },
          { name: 'small-b', length: 4 },
        ],
      },
      {
        name: 'large-root',
        length: 0,
        children: [
          { name: 'large-a', length: 9 },
          { name: 'large-b', length: 16 },
        ],
      },
    ];
    useAppStore.setState({
      treeList,
      timelineFrames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        { frame_index: 1, frame_type: 'input_tree', is_observed_input: true },
      ],
      branchTransformation: 'normalized-sqrt',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    const smallLayout = controller.calculateLayout(treeList[0], { treeIndex: 0 });
    const largeLayout = controller.calculateLayout(treeList[1], { treeIndex: 1 });
    const smallA = smallLayout.nodes.find((node) => node.name === 'small-a');
    const smallB = smallLayout.nodes.find((node) => node.name === 'small-b');
    const largeA = largeLayout.nodes.find((node) => node.name === 'large-a');
    const largeB = largeLayout.nodes.find((node) => node.name === 'large-b');

    expect(controller.maxGlobalScale).toBe(1);
    expect(smallLayout.max_radius).toBeCloseTo(240);
    expect(largeLayout.max_radius).toBeCloseTo(240);
    expect(smallA.metricBranchLength).toBe(1);
    expect(smallA.visualBranchLength).toBeCloseTo(0.5);
    expect(smallB.metricBranchLength).toBe(4);
    expect(smallB.visualBranchLength).toBe(1);
    expect(largeA.metricBranchLength).toBe(9);
    expect(largeA.visualBranchLength).toBeCloseTo(0.75);
    expect(largeB.metricBranchLength).toBe(16);
    expect(largeB.visualBranchLength).toBe(1);
  });

  it('recalculates transformed trees and scaling when the dataset changes with the same transform', () => {
    const firstTreeList = [
      {
        id: 'old-root',
        length: 0,
        children: [{ id: 'old-child', length: 1 }],
      },
    ];
    const nextTreeList = [
      {
        id: 'new-root',
        length: 0,
        children: [{ id: 'new-child', length: 5 }],
      },
    ];
    useAppStore.setState({
      treeList: firstTreeList,
      timelineFrames,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');
    expect(controller.maxGlobalScale).toBe(1);

    useAppStore.setState({ treeList: nextTreeList, timelineFrames });
    const layout = controller.calculateLayout(nextTreeList[0], { treeIndex: 0 });

    expect(controller.maxGlobalScale).toBe(5);
    expect(layout.layoutTree.name).toBe('new-root');
  });

  it('does not apply a trajectory-wide branch length floor to geometry', () => {
    const treeList = [
      {
        name: 'small-root',
        length: 0,
        children: [{ name: 'small-child', length: 0.001 }],
      },
      {
        name: 'large-root',
        length: 0,
        children: [{ name: 'large-child', length: 10 }],
      },
    ];
    useAppStore.setState({
      treeList,
      timelineFrames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        { frame_index: 1, frame_type: 'input_tree', is_observed_input: true },
      ],
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    const layout = controller.calculateLayout(treeList[0], { treeIndex: 0 });
    const smallChild = layout.nodes.find((node) => node.name === 'small-child');

    expect(controller.maxGlobalScale).toBe(10);
    expect(controller).not.toHaveProperty('minVisualBranchLength');
    expect(smallChild.metricBranchLength).toBe(0.001);
    expect(smallChild.visualBranchLength).toBe(0.001);
  });

  it('does not let tiny internal branch floors inflate trajectory scale', () => {
    const tinyInternalTree = makeCaterpillarTree(20, 0.00001, 0.01);
    const largerTree = makeCaterpillarTree(20, 0.01, 0.01);
    const treeList = [tinyInternalTree, largerTree];
    useAppStore.setState({
      treeList,
      timelineFrames: [
        { frame_index: 0, frame_type: 'input_tree', is_observed_input: true },
        { frame_index: 1, frame_type: 'input_tree', is_observed_input: true },
      ],
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');

    expect(controller.maxGlobalScale).toBeCloseTo(0.2);
    expect(controller).not.toHaveProperty('minVisualBranchLength');
  });

  it('clears transformed tree datasets independently of layout results', () => {
    const controller = new TreeLayoutController(null);
    controller._transformedCache.set('dataset-a', {
      transformedList: [{ id: 'old-tree' }],
    });
    controller._layoutResultCache.set('layout-a', { id: 'layout' });

    controller.clearTransformedCache();

    expect(controller._transformedCache.size).toBe(0);
    expect(controller._layoutResultCache.size).toBe(1);
  });

  it('does not replace explicit tree data with the indexed active tree', () => {
    const activeTreeList = [
      {
        name: 'active-root',
        length: 0,
        children: [{ name: 'active-child', length: 1 }],
      },
    ];
    const explicitTree = {
      name: 'explicit-root',
      length: 0,
      children: [{ name: 'explicit-child', length: 2 }],
    };
    useAppStore.setState({
      treeList: activeTreeList,
      timelineFrames,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');

    const layout = controller.calculateLayout(explicitTree, { treeIndex: 0 });

    expect(layout.layoutTree.name).toBe('explicit-root');
  });

  it('does not clone explicit tree data when no branch transformation is active', () => {
    const activeTreeList = [
      {
        name: 'active-root',
        length: 0,
        children: [{ name: 'active-child', length: 1 }],
      },
    ];
    const explicitTree = {
      name: 'explicit-root',
      length: 0,
      children: [{ name: 'explicit-child', length: 2 }],
    };
    useAppStore.setState({
      treeList: activeTreeList,
      timelineFrames,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
    });

    const controller = new TreeLayoutController(null);

    expect(
      controller._getTransformedTreeData(explicitTree, 'none', 0, 'unused', activeTreeList)
    ).toBe(explicitTree);
  });

  it('reuses cached layout results for unchanged layout inputs', () => {
    const treeList = [
      {
        name: 'root',
        length: 0,
        children: [{ name: 'child', length: 1 }],
      },
    ];
    useAppStore.setState({
      treeList,
      timelineFrames,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 1 } },
    });

    const controller = new TreeLayoutController(null);
    const computeLayout = vi.spyOn(controller, '_computeLayout');

    const first = controller.calculateLayout(treeList[0], { treeIndex: 0 });
    const second = controller.calculateLayout(treeList[0], { treeIndex: 0 });

    expect(second).toBe(first);
    expect(computeLayout).toHaveBeenCalledOnce();
  });
});

function makeCaterpillarTree(leafCount, internalLength, terminalLength) {
  let subtree = {
    name: `taxon_${leafCount - 1}`,
    length: terminalLength,
    split_indices: [leafCount - 1],
    children: [],
  };
  for (let i = leafCount - 2; i >= 0; i -= 1) {
    const split = Array.from({ length: leafCount - i }, (_value, offset) => i + offset);
    subtree = {
      name: `internal_${i}`,
      length: internalLength,
      split_indices: split,
      children: [
        { name: `taxon_${i}`, length: terminalLength, split_indices: [i], children: [] },
        subtree,
      ],
    };
  }
  return {
    name: 'root',
    length: 0,
    split_indices: Array.from({ length: leafCount }, (_value, index) => index),
    children: [subtree],
  };
}
