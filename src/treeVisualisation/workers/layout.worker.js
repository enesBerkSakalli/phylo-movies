import { TidyTreeLayout } from '../layout/TidyTreeLayout.js';
import { getEqualAngleMaxRadius } from '../layout/EqualAngleLayout.js';
import { createLayoutResult } from '../layout/LayoutResultAdapter.js';
import {
  LAYOUT_PROJECTION_MODES,
  applyLayoutProjection,
  normalizeLayoutProjectionMode,
} from '../layout/hyperbolicProjection/index.js';
import { DeckGLTreeLayerDataFactory } from '../deckgl/DeckGLTreeLayerDataFactory.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';
import {
  calculateLabelAngleSpan,
  calculateReadableLabelRadii,
  STABLE_LABEL_LAYOUT_FONT_SIZE,
} from '../layout/labelRingRadii.js';

const dataFactory = new DeckGLTreeLayerDataFactory();

export function calculateLayoutWorkerResult(treeData, options) {
  const transformedData =
    options.branchTransformation === 'none'
      ? treeData
      : transformBranchLengths(treeData, options.branchTransformation);

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
  const normalizedProjectionMode = normalizeLayoutProjectionMode(options.layoutProjectionMode);
  const isUnrooted = normalizedProjectionMode === LAYOUT_PROJECTION_MODES.UNROOTED;
  const isRectangular = normalizedProjectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR;
  const isCartesian = isUnrooted || isRectangular;
  const hasMaxGlobalScale = hasUniformScaleValue(options.maxGlobalScale);
  const rootNode = isRectangular
    ? layoutEngine.constructRectangularTree()
    : isUnrooted
      ? layoutEngine.constructUnrootedTree({ labelsVisible: options.labelsVisible !== false })
      : hasMaxGlobalScale
        ? layoutEngine.constructRadialTreeWithUniformScaling(Number(options.maxGlobalScale))
        : layoutEngine.constructRadialTree(false);
  const projectedRootNode = isCartesian
    ? rootNode
    : applyLayoutProjection(rootNode, {
        projectionMode: normalizedProjectionMode,
        strength: options.hyperbolicProjectionStrength,
        maxRadius: layoutEngine.getMaxRadius(rootNode),
      });
  const maxRadius = isCartesian
    ? getEqualAngleMaxRadius(projectedRootNode)
    : layoutEngine.getMaxRadius(projectedRootNode);
  const layoutResult = createLayoutResult(projectedRootNode, {
    max_radius: maxRadius,
    width: options.width,
    height: options.height,
    margin: layoutEngine.margin,
    scale: layoutEngine.scale,
    uniformScale: layoutEngine.uniformScale,
    layoutCacheKey: options.layoutCacheKey,
    projectionMode: normalizedProjectionMode,
    hyperbolicProjectionStrength: options.hyperbolicProjectionStrength,
    is3dLayout: normalizedProjectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D,
    labelsVisible: options.labelsVisible !== false,
  });
  const offsets = options.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };
  const stableGlobalRadius =
    layoutResult.projectionMode === LAYOUT_PROJECTION_MODES.HYPERBOLIC ||
    layoutResult.projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D
      ? null
      : getStableGlobalRenderedRadius({
          maxGlobalScale: options.maxGlobalScale,
          layoutScale: layoutEngine.uniformScale ?? layoutEngine.scale,
          hasMaxGlobalScale,
        });
  const baseRadius = Number.isFinite(maxRadius)
    ? Math.max(0, maxRadius)
    : (stableGlobalRadius ?? 0);
  const { extensionRadius, labelRadius } = calculateReadableLabelRadii({
    baseRadius,
    labelOffsets: offsets,
    labelCount: layoutResult.leaves.length,
    fontSize: STABLE_LABEL_LAYOUT_FONT_SIZE,
    angleSpanRadians: calculateLabelAngleSpan(layoutResult.leaves),
    labelsVisible: options.labelsVisible !== false,
  });

  // 3. Convert to Layer Data
  // The data factory is purely mathematical, it generates JS Arrays/TypedArrays
  const layerData = dataFactory.convertTreeToLayerData(layoutResult, {
    extensionRadius,
    labelRadius,
    treeIndex: options.treeIndex,
    treeSide: options.treeSide,
    renderMode: options.renderMode,
    linkGeometryMode: options.linkGeometryMode || 'radial-elbow',
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

function hasUniformScaleValue(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
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
        result,
      });
    } catch (error) {
      console.error('[LayoutWorker] Failed to calculate tree layout:', {
        jobId,
        error,
      });
      self.postMessage({
        jobId,
        requestToken,
        status: 'ERROR',
        error: error.message,
      });
    }
  };
}
