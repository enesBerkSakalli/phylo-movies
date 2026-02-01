
import { expect } from 'chai';
import sinon from 'sinon';
import { TidyTreeLayout } from '../src/js/treeVisualisation/layout/TidyTreeLayout.js';
import { DeckGLTreeLayerDataFactory } from '../src/js/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { transformBranchLengths } from '../src/js/domain/tree/branchTransform.js';

// Mock dependencies if needed, or use real ones to verify integration logic
// Since the error was about data flow between TidyTreeLayout and Factory, using real ones is better.

describe('Layout Worker Logic Integration', () => {
    let treeData;
    let options;

    beforeEach(() => {
        // Simple tree structure
        treeData = {
            id: 'root',
            branch_length: 0.1,
            children: [
                { id: 'child1', branch_length: 0.2, children: [] },
                { id: 'child2', branch_length: 0.3, children: [] }
            ]
        };

        options = {
            width: 800,
            height: 600,
            margin: 60,
            layoutAngleDegrees: 360,
            layoutRotationDegrees: 0,
            branchTransformation: 'linear',
            extensionRadius: 10,
            labelRadius: 20
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

        // 3. Convert to Layer Data
        // Replicate logic in layout.worker.js
        const dataFactory = new DeckGLTreeLayerDataFactory();

        // This call typically failed with "Cannot access descendants of undefined" if the input was wrong
        // Use the exact call signature from the worker
        const layerData = dataFactory.convertTreeToLayerData(layoutResult, {
            extensionRadius: options.extensionRadius,
            labelRadius: options.labelRadius,
            canvasWidth: options.width,
            canvasHeight: options.height
        });

        // Verify successful generation
        expect(layerData).to.have.property('nodes');
        expect(layerData).to.have.property('links');
        expect(layerData).to.have.property('labels');
        expect(layerData.nodes).to.be.an('array');
        expect(layerData.nodes.length).to.be.greaterThan(0);
    });

    it('should generate equivalent result passing width/height to convertTreeToLayerData', () => {
         // This tests the other part of the fix (passing canvas dims)
         const transformedData = transformBranchLengths(treeData, 'linear');
         const layoutEngine = new TidyTreeLayout(transformedData);
         layoutEngine.setDimension(800, 600);
         const rootNode = layoutEngine.constructRadialTree();

         const dataFactory = new DeckGLTreeLayerDataFactory();

         const layerData = dataFactory.convertTreeToLayerData(rootNode, {
             extensionRadius: 10,
             labelRadius: 20,
             canvasWidth: 800,
             canvasHeight: 600
         });

         // Check if node sizes are calculated (requires canvas dims in NodeGeometryBuilder)
         // We can't easily inspect internal size logic without deep introspection,
         // but we can ensure it runs without error.
         expect(layerData.nodes.length).to.equal(3);
    });
});
