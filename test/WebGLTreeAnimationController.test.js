import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';
import { WebGLTreeAnimationController } from '../src/treeVisualisation/WebGLTreeAnimationController.js';

describe('WebGLTreeAnimationController radii', () => {
  const initialState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('places labels and extensions from the actual layout radius', () => {
    const controller = new WebGLTreeAnimationController(null);

    const radii = controller._getConsistentRadii({
      width: 1000,
      height: 1000,
      margin: 60,
      max_radius: 120
    });

    expect(radii.extensionRadius).toBe(121);
    expect(radii.labelRadius).toBe(122);
  });

  it('uses zero maxGlobalScale as an intentional uniform scale input', () => {
    const controller = new WebGLTreeAnimationController(null);
    controller.uniformScalingEnabled = true;
    controller.globalScaleList = [{ value: 0, index: 0 }];
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
    layout.tree.each((node) => {
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

    const controller = new WebGLTreeAnimationController(null);
    controller.initializeUniformScaling('none');
    expect(controller.maxGlobalScale).toBe(1);

    useAppStore.setState({ branchTransformation: 'linear-scale' });
    controller.calculateLayout(treeList[0], { treeIndex: 0 });

    expect(controller.maxGlobalScale).toBe(2);
    expect(controller._scalingState.branchTransformation).toBe('linear-scale');
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

    const controller = new WebGLTreeAnimationController(null);
    controller.initializeUniformScaling('none');
    expect(controller.maxGlobalScale).toBe(1);

    useAppStore.setState({ treeList: nextTreeList });
    const layout = controller.calculateLayout(nextTreeList[0], { treeIndex: 0 });

    expect(controller.maxGlobalScale).toBe(5);
    expect(layout.tree.data.id).toBe('new-root');
  });
});
