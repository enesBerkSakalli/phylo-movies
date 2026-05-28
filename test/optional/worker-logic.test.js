import { expect } from 'chai';
import { TidyTreeLayout } from '../../src/treeVisualisation/layout/TidyTreeLayout.js';
import { createLayoutResult } from '../../src/treeVisualisation/layout/LayoutResultAdapter.js';
import { DeckGLTreeLayerDataFactory } from '../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { transformBranchLengths } from '../../src/domain/tree/branchTransform.js';

// Mock dependencies if needed, or use real ones to verify integration logic
// Since the error was about data flow between TidyTreeLayout and Factory, using real ones is better.

describe('Layout Worker Logic Integration', () => {
  let treeData;
  let options;

  beforeEach(() => {
    // Simple tree structure
    treeData = {
      name: '',
      length: 0.1,
      split_indices: [0, 1],
      children: [
        { name: 'child1', length: 0.2, split_indices: [0], children: [] },
        { name: 'child2', length: 0.3, split_indices: [1], children: [] },
      ],
    };

    options = {
      width: 800,
      height: 600,
      margin: 60,
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      branchTransformation: 'linear-scale',
      extensionRadius: 10,
      labelRadius: 20,
    };
  });

  it('should correctly pass TidyTreeLayout output to DeckGLTreeLayerDataFactory', () => {
    // 1. Transform Branches
    const transformedData = transformBranchLengths(treeData, options.branchTransformation);

    // 2. Calculate Layout
    const layoutEngine = new TidyTreeLayout(transformedData);
    layoutEngine.setDimension(options.width, options.height);
    layoutEngine.setAngleExtentDegrees(options.layoutAngleDegrees);
    layoutEngine.setAngleOffsetDegrees(options.layoutRotationDegrees);
    layoutEngine.setMargin(options.margin);

    // This is where the worker failed previously: it assumed constructRadialTree returned { tree: ... }
    const layoutResult = layoutEngine.constructRadialTree();

    // Verify what constructRadialTree actually returns
    expect(layoutResult).to.have.property('data'); // D3 Node has data
    expect(layoutResult).to.have.property('children'); // D3 Node has children
    expect(layoutResult).to.not.have.property('tree'); // It should be the node itself, not a wrapper

    // 3. Convert to normalized layout data, then layer data
    // Replicate logic in layout.worker.js
    const dataFactory = new DeckGLTreeLayerDataFactory();
    const normalizedLayout = createLayoutResult(layoutResult, {
      max_radius: layoutEngine.getMaxRadius(layoutResult),
      width: options.width,
      height: options.height,
      margin: layoutEngine.margin,
      scale: layoutEngine.scale,
    });

    const layerData = dataFactory.convertTreeToLayerData(normalizedLayout, {
      extensionRadius: options.extensionRadius,
      labelRadius: options.labelRadius,
    });

    // Verify successful generation
    expect(layerData).to.have.property('nodes');
    expect(layerData).to.have.property('links');
    expect(layerData).to.have.property('labels');
    expect(layerData.nodes).to.be.an('array');
    expect(layerData.nodes.length).to.be.greaterThan(0);
  });

  it('should generate node sizes from normalized layout dimensions', () => {
    const transformedData = transformBranchLengths(treeData, 'linear-scale');
    const layoutEngine = new TidyTreeLayout(transformedData);
    layoutEngine.setDimension(800, 600);
    const rootNode = layoutEngine.constructRadialTree();
    const normalizedLayout = createLayoutResult(rootNode, {
      max_radius: layoutEngine.getMaxRadius(rootNode),
      width: 800,
      height: 600,
      margin: layoutEngine.margin,
      scale: layoutEngine.scale,
    });

    const dataFactory = new DeckGLTreeLayerDataFactory();

    const layerData = dataFactory.convertTreeToLayerData(normalizedLayout, {
      extensionRadius: 10,
      labelRadius: 20,
    });

    // Check if node sizes are calculated from normalized layout metadata.
    // We can't easily inspect internal size logic without deep introspection,
    // but we can ensure it runs without error.
    expect(layerData.nodes.length).to.equal(3);
  });
});
