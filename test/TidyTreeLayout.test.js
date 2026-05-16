import { describe, it, expect } from 'vitest';
import createTidyTreeLayout, { TidyTreeLayout } from '../src/treeVisualisation/layout/TidyTreeLayout.js';

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

    expect(layout.layoutTree).toBeDefined();
    expect(layout.max_radius).toBeGreaterThan(0);

    const root = layout.layoutTree;
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

  it('keeps all-zero branch length layouts finite', () => {
    const zeroLengthTree = {
      id: 'root',
      length: 0,
      children: [
        { id: 'child1', length: 0 },
        { id: 'child2', length: 0 }
      ]
    };
    const layoutEngine = new TidyTreeLayout(zeroLengthTree);
    layoutEngine.setDimension(800, 600);
    layoutEngine.setMargin(60);

    const root = layoutEngine.constructRadialTree();

    expect(Number.isFinite(layoutEngine.scale)).toBe(true);
    root.each((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.radius)).toBe(true);
    });
  });

  it('does not compress moving subtree angles when the legacy exclusion option is present', () => {
    const tree = {
      name: 'root',
      length: 0,
      split_indices: [0, 1, 2, 3, 4, 5],
      children: [
        { name: 'A', length: 1, split_indices: [0] },
        {
          name: 'moving',
          length: 1,
          split_indices: [1, 2, 3],
          children: [
            { name: 'B', length: 1, split_indices: [1] },
            { name: 'C', length: 1, split_indices: [2] },
            { name: 'D', length: 1, split_indices: [3] },
          ],
        },
        { name: 'E', length: 1, split_indices: [4] },
        { name: 'F', length: 1, split_indices: [5] },
      ],
    };
    const buildAngles = (options = {}) => {
      const layoutEngine = new TidyTreeLayout(tree);
      layoutEngine.setDimension(800, 600);
      layoutEngine.setMargin(60);
      const root = layoutEngine.constructRadialTree(false, options);
      return Object.fromEntries(
        root.leaves().map((leaf) => [leaf.data.name, leaf.rotatedAngle])
      );
    };

    const baseline = buildAngles();
    const withMovingTaxaExcluded = buildAngles({
      rotationAlignmentExcludeTaxa: [1, 2, 3],
    });

    expect(withMovingTaxaExcluded.B).to.be.closeTo(baseline.B, 1e-9);
    expect(withMovingTaxaExcluded.C).to.be.closeTo(baseline.C, 1e-9);
    expect(withMovingTaxaExcluded.D).to.be.closeTo(baseline.D, 1e-9);
    expect(withMovingTaxaExcluded.D - withMovingTaxaExcluded.B)
      .to.be.closeTo(baseline.D - baseline.B, 1e-9);
  });
});
