
import { TidyTreeLayout } from '../layout/TidyTreeLayout.js';
import { createLayoutResult } from '../layout/LayoutResultAdapter.js';
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

    const hasMaxGlobalScale = Number.isFinite(Number(options.maxGlobalScale));
    const layoutOptions = {
        rotationAlignmentExcludeTaxa: options.rotationAlignmentExcludeTaxa
    };
    const rootNode = hasMaxGlobalScale
        ? layoutEngine.constructRadialTreeWithUniformScaling(Number(options.maxGlobalScale), layoutOptions)
        : layoutEngine.constructRadialTree(false, layoutOptions);
    const maxRadius = layoutEngine.getMaxRadius(rootNode);
    const layoutResult = createLayoutResult(rootNode, {
        max_radius: maxRadius,
        width: options.width,
        height: options.height,
        margin: layoutEngine.margin,
        scale: layoutEngine.scale,
        layoutCacheKey: options.layoutCacheKey
    });
    const offsets = options.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };
    const baseRadius = getStableGlobalRenderedRadius({
        maxGlobalScale: options.maxGlobalScale,
        layoutScale: layoutEngine.scale,
        hasMaxGlobalScale
    }) ?? maxRadius;
    const extensionRadius = baseRadius + (offsets.EXTENSION ?? 5);
    const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

    // 3. Convert to Layer Data
    // The data factory is purely mathematical, it generates JS Arrays/TypedArrays
    const layerData = dataFactory.convertTreeToLayerData(layoutResult, {
        extensionRadius,
        labelRadius,
        treeIndex: options.treeIndex,
        treeSide: options.treeSide,
        renderMode: options.renderMode,
        linkGeometryMode: options.linkGeometryMode || 'radial-elbow'
    });

    if (layerData && typeof layerData === 'object') {
        layerData.max_radius = maxRadius;
        layerData.layoutCacheKey = options.layoutCacheKey;
    }

    return { layout: layoutResult, layerData };
}

function getStableGlobalRenderedRadius({ maxGlobalScale, layoutScale, hasMaxGlobalScale }) {
    if (!hasMaxGlobalScale) return null;

    const maxScale = Number(maxGlobalScale);
    const scale = Number(layoutScale);
    if (!Number.isFinite(maxScale) || !Number.isFinite(scale)) return null;

    return Math.max(0, maxScale * scale);
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
        const { jobId, requestToken, command, data } = payload;

        if (command !== 'CALCULATE_LAYOUT') return;

        try {
            const { treeData, options } = data;
            const result = calculateLayoutWorkerResult(treeData, options);

            self.postMessage({
                jobId,
                requestToken,
                status: 'SUCCESS',
                result
            });

        } catch (error) {
            console.error('Worker Calculation Error:', error);
            self.postMessage({
                jobId,
                requestToken,
                status: 'ERROR',
                error: error.message
            });
        }
    };
}
