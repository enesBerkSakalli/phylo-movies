
import { TidyTreeLayout } from '../layout/TidyTreeLayout.js';
import { DeckGLTreeLayerDataFactory } from '../deckgl/DeckGLTreeLayerDataFactory.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';

const dataFactory = new DeckGLTreeLayerDataFactory();

/**
 * Worker Message Handler
 * Expects data: {
 *   jobId: string,
 *   data: { treeData, options }
 * }
 */
self.onmessage = ({ data: payload }) => {
    const { jobId, command, data } = payload;

    if (command !== 'CALCULATE_LAYOUT') return;

    try {
        const { treeData, options } = data;

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

        // 3. Convert to Layer Data
        // The data factory is purely mathematical, it generates JS Arrays/TypedArrays
        // Pass width/height to data factory so it can calculate node sizes
        const layerData = dataFactory.convertTreeToLayerData(rootNode, {
            extensionRadius: options.extensionRadius,
            labelRadius: options.labelRadius,
            canvasWidth: options.width,
            canvasHeight: options.height
        });

        // 4. Send back results
        // We include jobId so the main thread knows which request this answers
        // Note: We return 'layout' as a wrapper object to match main thread expectations if necessary,
        // but InterpolationCache mainly needs layerData.
        // If InterpolationCache needs the layout structure (width/height/scale), we reconstruct that wrapper.

        // The Controller's calculateLayout used to return:
        // { tree: root, max_radius, width, height, margin, scale }
        // Let's reconstruct that format in case consumers need it, though layerData is the prize.
        const layoutResult = {
            tree: rootNode, // Needed for internal logic?
            width: options.width,
            height: options.height,
            scale: layoutEngine.scale
        };

        self.postMessage({
            jobId,
            status: 'SUCCESS',
            result: { layout: layoutResult, layerData }
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
