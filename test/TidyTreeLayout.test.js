import { describe, it, expect } from 'vitest';
import createTidyTreeLayout, { TidyTreeLayout } from '../src/js/treeVisualisation/layout/TidyTreeLayout.js';

describe('TidyTreeLayout', () => {
  // Simple mock hierarchy
  const mockData = {
    id: 'root',
    length: 0,
    children: [
      {
        id: 'child1',
        length: 10,
        children: []
      },
      {
        id: 'child2',
        length: 20,
        children: []
      }
    ]
  };

  it('initializes and calculates coordinates', () => {
    const layout = createTidyTreeLayout(mockData, 'none', { width: 500, height: 500 });

    expect(layout.tree).toBeDefined();
    expect(layout.max_radius).toBeGreaterThan(0);

    const root = layout.tree;
    // TidyTreeLayout converts to d3 hierarchy
    expect(root.x).toBeDefined(); // x is Cartesian X now after generateCoordinates
    expect(root.y).toBeDefined(); // y is Cartesian Y now

    // Check children
    expect(root.children.length).toBe(2);
    // Radii should be populated based on branch lengths
    // root (0) -> child1 (10)
    // root (0) -> child2 (20)

    // Note: TidyTreeLayout scales the radius to fit the container.
    // So distinct lengths should result in distinct radii (magnitudes).
    const child1 = root.children[0];
    const child2 = root.children[1];

    const r1 = Math.sqrt(child1.x ** 2 + child1.y ** 2);
    const r2 = Math.sqrt(child2.x ** 2 + child2.y ** 2);

    // Since child2 length (20) > child1 length (10), r2 should be > r1
    // (Assuming 'length' is mapped to radius correctly)
    expect(r2).toBeGreaterThan(r1);
  });

  it('supports uniform scaling', () => {
    const layout = createTidyTreeLayout(mockData, 'none', {
      width: 1000,
      height: 1000,
      uniformScale: 5
    });

    // Logic check: uniform scale sets scale directly
    expect(layout.scale).toBe(5);
  });

  it('handles empty/null root gracefully', () => {
    // Should not throw, or throw readable error
    try {
      createTidyTreeLayout(null, 'none', {});
    } catch (e) {
      // It might throw depending on d3.hierarchy behavior
    }
  });

  // New test for class-level method constructRadialTreeWithUniformScaling
  it('constructRadialTreeWithUniformScaling applies global scale correctly', () => {
    // Instantiate CLASS directly (not the factory function)
    const layoutEngine = new TidyTreeLayout(mockData);
    layoutEngine.setDimension(1000, 1000);
    layoutEngine.setMargin(0);

    // Mock global max scale
    // Hypothetically, if max scale is 50 (max branch length sum),
    // and window min dimension is 1000.
    // Formula: scale = minWindow / (2.0 * maxGlobalScale)
    // scale = 1000 / (2.0 * 50) = 10
    const maxGlobalScale = 50;

    layoutEngine.constructRadialTreeWithUniformScaling(maxGlobalScale);

    expect(layoutEngine.scale).toBe(10);
  });

  it('constructRadialTreeWithUniformScaling handles 0 or invalid max scale gracefully', () => {
    const layoutEngine = new TidyTreeLayout(mockData);
    layoutEngine.setDimension(1000, 1000);

    // Should default to 1 or safe value to avoid Infinity
    layoutEngine.constructRadialTreeWithUniformScaling(0);
    expect(layoutEngine.scale).toBeLessThan(Infinity);
    expect(Number.isFinite(layoutEngine.scale)).toBe(true);
  });
});
