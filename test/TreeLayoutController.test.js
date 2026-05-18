import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { TreeLayoutController } from '../src/treeVisualisation/TreeLayoutController.js';

describe('TreeLayoutController radii', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('places labels and extensions from the actual layout radius', () => {
    const controller = new TreeLayoutController(null);

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 120
    });

    expect(radii.extensionRadius).toBe(121);
    expect(radii.labelRadius).toBe(122);
  });

  it('places labels and extensions from the stable global radius when uniform scaling is active', () => {
    const controller = new TreeLayoutController(null);
    controller.maxGlobalScale = 20;

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 120,
      scale: 10
    });

    expect(radii.extensionRadius).toBe(201);
    expect(radii.labelRadius).toBe(202);
  });

  it('uses zero maxGlobalScale as an intentional uniform scale input', () => {
    const controller = new TreeLayoutController(null);
    controller.maxGlobalScale = 0;

    const layout = controller._computeLayout({
      id: 'root',
      length: 0,
      children: [
        { id: 'child1', length: 0 },
        { id: 'child2', length: 0 }
      ]
    }, 360, 0);

    expect(layout.scale).toBe(240);
    layout.nodes.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.radius)).toBe(true);
    });
  });

  it('recalculates uniform scaling on the first branch transformation change', () => {
    const treeList = [{
      id: 'root',
      length: 0,
      children: [{ id: 'child', length: 1 }]
    }];
    useAppStore.setState({
      treeList,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      transitionResolver: { fullTreeIndices: [0] }
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

  it('recalculates transformed trees and scaling when the dataset changes with the same transform', () => {
    const firstTreeList = [{
      id: 'old-root',
      length: 0,
      children: [{ id: 'old-child', length: 1 }]
    }];
    const nextTreeList = [{
      id: 'new-root',
      length: 0,
      children: [{ id: 'new-child', length: 5 }]
    }];
    useAppStore.setState({
      treeList: firstTreeList,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      transitionResolver: { fullTreeIndices: [0] }
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');
    expect(controller.maxGlobalScale).toBe(1);

    useAppStore.setState({ treeList: nextTreeList });
    const layout = controller.calculateLayout(nextTreeList[0], { treeIndex: 0 });

    expect(controller.maxGlobalScale).toBe(5);
    expect(layout.layoutTree.name).toBe('new-root');
  });

  it('does not replace explicit tree data with the indexed active tree', () => {
    const activeTreeList = [{
      name: 'active-root',
      length: 0,
      children: [{ name: 'active-child', length: 1 }]
    }];
    const explicitTree = {
      name: 'explicit-root',
      length: 0,
      children: [{ name: 'explicit-child', length: 2 }]
    };
    useAppStore.setState({
      treeList: activeTreeList,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      transitionResolver: { fullTreeIndices: [0] }
    });

    const controller = new TreeLayoutController(null);
    controller.initializeUniformScaling('none');

    const layout = controller.calculateLayout(explicitTree, { treeIndex: 0 });

    expect(layout.layoutTree.name).toBe('explicit-root');
  });

  it('does not clone explicit tree data when no branch transformation is active', () => {
    const activeTreeList = [{
      name: 'active-root',
      length: 0,
      children: [{ name: 'active-child', length: 1 }]
    }];
    const explicitTree = {
      name: 'explicit-root',
      length: 0,
      children: [{ name: 'explicit-child', length: 2 }]
    };
    useAppStore.setState({
      treeList: activeTreeList,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      transitionResolver: { fullTreeIndices: [0] }
    });

    const controller = new TreeLayoutController(null);

    expect(controller._getTransformedTreeData(
      explicitTree,
      'none',
      0,
      'unused',
      activeTreeList
    )).toBe(explicitTree);
  });

  it('reuses cached layout results for unchanged layout inputs', () => {
    const treeList = [{
      name: 'root',
      length: 0,
      children: [{ name: 'child', length: 1 }]
    }];
    useAppStore.setState({
      treeList,
      branchTransformation: 'none',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 1 } },
      transitionResolver: { fullTreeIndices: [0] }
    });

    const controller = new TreeLayoutController(null);
    const computeLayout = vi.spyOn(controller, '_computeLayout');

    const first = controller.calculateLayout(treeList[0], { treeIndex: 0 });
    const second = controller.calculateLayout(treeList[0], { treeIndex: 0 });

    expect(second).toBe(first);
    expect(computeLayout).toHaveBeenCalledOnce();
  });
});
