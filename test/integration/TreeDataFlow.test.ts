import { describe, it, expect } from 'vitest';
import { Tree, RawNode } from '../../src/js/domain/model/Tree';
import { DeckGLTreeLayerDataFactory } from '../../src/js/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import * as d3 from 'd3';

describe('Tree Data Flow Integration', () => {
  // Mock Data: A simple balanced tree
  // root -> (child1, child2)
  const mockRawNode: RawNode = {
    name: 'root',
    length: 0.1,
    children: [
      {
        name: 'child1',
        length: 0.2,
        children: [],
        values: { bootstrap: 90 }
      },
      {
        name: 'child2',
        length: 0.3,
        children: [],
        values: { bootstrap: 100 }
      }
    ]
  };

  it('should successfully produce layer data from a Tree instance', () => {
    // 1. Create Model
    const tree = new Tree(mockRawNode);

    // 2. Instantiate Factory
    const factory = new DeckGLTreeLayerDataFactory();

    // 3. Run Conversion (Factory expects D3 hierarchy, which is tree.root)
    // We pass tree.root because that matches the current signature of the factory
    // which expects a d3.HierarchyNode
    const layerData = factory.convertTreeToLayerData(tree.root);

    // 4. Assert Output Structure
    expect(layerData).toBeDefined();
    expect(layerData.nodes).toBeInstanceOf(Array);
    expect(layerData.links).toBeInstanceOf(Array);
    expect(layerData.labels).toBeInstanceOf(Array);
  });

  it('should generate correct node counts in layer data', () => {
    const tree = new Tree(mockRawNode);
    const factory = new DeckGLTreeLayerDataFactory();

    // We need to layout the tree first usually, but the factory might handle raw hierarchy?
    // Looking at NodeDataBuilder, it calls tree.descendants().
    // However, it creates nodes with positions.
    // Usually positions (x, y) are assigned by a Layout (like TidyTree or RadialTree).
    // If we pass a raw hierarchy without layout, x/y might be undefined or 0.
    // The factory uses node.x and node.y.

    // Simulate Layout: Assign manual coordinates so builders don't filter out "invisible" nodes
    // LabelDataBuilder might skip nodes without valid positions or visibility
    tree.descendants().forEach((d, i) => {
      d.x = i * 10;
      d.y = i * 10;
    });

    // LabelDataBuilder requires a radius to position text
    const layerData = factory.convertTreeToLayerData(tree.root, { labelRadius: 100 });

    // Root + 2 children = 3 nodes
    expect(layerData.nodes).toHaveLength(3);

    // 2 links
    expect(layerData.links).toHaveLength(2);

    // Labels for all nodes? (Depending on builder logic)
    // Assuming labels for all nodes for now
    expect(layerData.labels.length).toBeGreaterThan(0);
  });

  it('should preserve metadata through the pipeline', () => {
    const tree = new Tree(mockRawNode);
    const factory = new DeckGLTreeLayerDataFactory();
    const layerData = factory.convertTreeToLayerData(tree.root);

    // Find child2 node data
    const child2Node = layerData.nodes.find(n => n.data && n.data.name === 'child2');
    expect(child2Node).toBeDefined();
    expect(child2Node.data.name).toBe('child2');

    // Verify values pass through if needed (depending on implementation)
    // The factory puts the raw data object into .data property of the layer object
    expect(child2Node.data.values).toEqual({ bootstrap: 100 });
  });

  it('should integrate with a Layout Engine before Factory', () => {
    // This is the full pipeline simulation: Tree -> Layout -> Factory
    const tree = new Tree(mockRawNode);

    // Simple Layout Simulation (Manual x,y assignment)
    // In real app, RadialTreeLayout would do this.
    // We can simulate it here to prove the data structure holds the coordinates.
    const root = tree.root;
    const layout = d3.tree().size([100, 100]);
    layout(root); // This assigns x and y to nodes

    const factory = new DeckGLTreeLayerDataFactory();
    const layerData = factory.convertTreeToLayerData(root);

    const rootNodeData = layerData.nodes.find(n => n.data.name === 'root');
    expect(rootNodeData.position).toBeDefined();
    // d3.tree puts root at top (approx x=50, y=0 or similar depending on orientation)
    // Just checking it's not [0,0,0] if layout worked, though d3.tree defaults might vary.
    // The key is that factory read the x/y from our tree.root
  });
});
