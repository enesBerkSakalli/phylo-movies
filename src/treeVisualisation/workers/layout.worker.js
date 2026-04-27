
import { TidyTreeLayout } from '../layout/TidyTreeLayout.js';
import { DeckGLTreeLayerDataFactory } from '../deckgl/DeckGLTreeLayerDataFactory.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';

const dataFactory = new DeckGLTreeLayerDataFactory();

export function calculateLayoutWorkerResult(treeData, options) {
    // 1. Transform Branches
    // Note: transformBranchLengths is pure and safe for workers
    const transformedData = transformBranchLengths(treeData, options.branchTransformation);

    // 2. Calculate Layout
    // Note: TidyTreeLayout must not touch the DOM.
    // We ensure we pass dimensions explicitly rather than relying on container lookups.
    const layoutEngine = new TidyTreeLayout(transformedData);
    layoutEngine.setDimension(options.width, options.height);

    if (options.layoutAngleDegrees !== undefined) {
        layoutEngine.setAngleExtentDegrees(options.layoutAngleDegrees);
    }
    if (options.layoutRotationDegrees !== undefined) {
        layoutEngine.setAngleOffsetDegrees(options.layoutRotationDegrees);
    }
    if (options.margin !== undefined) {
        layoutEngine.setMargin(options.margin);
    }

    const rootNode = options.maxGlobalScale
        ? layoutEngine.constructRadialTreeWithUniformScaling(options.maxGlobalScale)
        : layoutEngine.constructRadialTree();
    const maxRadius = layoutEngine.getMaxRadius(rootNode);

    // 3. Convert to Layer Data
    // The data factory is purely mathematical, it generates JS Arrays/TypedArrays
    // Pass width/height to data factory so it can calculate node sizes
    const layerData = dataFactory.convertTreeToLayerData(rootNode, {
        extensionRadius: options.extensionRadius,
        labelRadius: options.labelRadius,
        canvasWidth: options.width,
        canvasHeight: options.height
    });

    if (layerData && typeof layerData === 'object') {
        layerData.max_radius = maxRadius;
    }

    // The Controller's calculateLayout returns:
    // { tree: root, max_radius, width, height, margin, scale }
    const layoutResult = {
        tree: rootNode,
        max_radius: maxRadius,
        width: options.width,
        height: options.height,
        margin: layoutEngine.margin,
        scale: layoutEngine.scale
    };

    return { layout: layoutResult, layerData };
}

/**
 * Worker Message Handler
 * Expects data: {
 *   jobId: string,
 *   data: { treeData, options }
 * }
 */
if (typeof self !== 'undefined') {
    self.onmessage = ({ data: payload }) => {
        const { jobId, command, data } = payload;

        if (command !== 'CALCULATE_LAYOUT') return;

        try {
            const { treeData, options } = data;
            const result = calculateLayoutWorkerResult(treeData, options);

            self.postMessage({
                jobId,
                status: 'SUCCESS',
                result
            });

        } catch (error) {
            console.error('Worker Calculation Error:', error);
            self.postMessage({
                jobId,
                status: 'ERROR',
                error: error.message
            });
        }
    };
}
