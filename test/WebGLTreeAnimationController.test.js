import { describe, expect, it } from 'vitest';
import { WebGLTreeAnimationController } from '../src/treeVisualisation/WebGLTreeAnimationController.js';

describe('WebGLTreeAnimationController radii', () => {
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
});
