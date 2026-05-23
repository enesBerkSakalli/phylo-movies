import { buildSubtreeConnectors } from '../deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { useAppStore } from '../../state/phyloStore/store.js';
import { selectPairById, selectPivotEdgeForFrame, selectTimelineFrameAtIndex } from '../../state/phyloStore/selectors/treeSelectors.js';
import { tagTreeSide } from '../utils/layerDataUtils.js';
import { VIEWPORT_FIT_MODES } from '../viewport/viewportFit.js';
import {
  applyOffset,
  combineLayerData,
  buildPositionMap,
  calculateComparisonFrameGeometry,
  cloneLayerData
} from './ComparisonUtils.js';
import { measureFrameStepAsync } from '../performance/frameInstrumentation.js';

/**
 * ComparisonModeRenderer
 *
 * Handles rendering logic for side-by-side tree comparison mode.
 * Manages layout positioning, spacing, and data combination for dual-tree visualization.
 */
export class ComparisonModeRenderer {
  constructor(controller) {
    this.controller = controller;
    this._lastFittedIndices = null;
    this._animatedRightBaseCache = new Map();
    this._animatedRightPreparedCache = new Map();
    this._objectCacheIds = new WeakMap();
    this._nextObjectCacheId = 1;
  }

  resetAutoFit() {
    this._lastFittedIndices = null;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Render static comparison mode with two separate trees.
   * @param {number} leftIndex - Left tree index
   * @param {number} rightIndex - Right tree index
   */
  async renderStatic(leftIndex, rightIndex) {
    const {
      treeList,
      leftTreeOffsetX = 0,
      leftTreeOffsetY = 0,
      viewsConnected,
      linkGeometryMode = 'radial-elbow',
      fontSize = '2.6em'
    } = useAppStore.getState();

    const clampIndex = (idx) => {
      if (!Array.isArray(treeList)) return 0;
      return Math.min(Math.max(idx, 0), treeList.length - 1);
    };

    const clampedLeftIndex = clampIndex(leftIndex);
    const clampedRightIndex = clampIndex(rightIndex);

    const leftTreeData = treeList?.[clampedLeftIndex];
    const rightTreeData = treeList?.[clampedRightIndex];

    // Guard against null/undefined tree data
    if (!leftTreeData || !rightTreeData) {
      console.warn('ComparisonModeRenderer.renderStatic: Missing tree data', {
        leftIndex: clampedLeftIndex,
        rightIndex: clampedRightIndex,
        hasLeftTree: !!leftTreeData,
        hasRightTree: !!rightTreeData
      });
      return;
    }

    const leftLayout = this.controller.calculateLayout(leftTreeData, {
      treeIndex: clampedLeftIndex
    });

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: clampedRightIndex
    });

    // Safety check for layout
    if (!leftLayout || !rightLayout) {
        console.warn('[ComparisonModeRenderer] Layout calculation failed, skipping renderStatic');
        return;
    }

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      leftLayout
    );

    const leftLayerData = this.controller.dataConverter.convertTreeToLayerData(
      leftLayout,
      {
        extensionRadius,
        labelRadius,
        treeIndex: clampedLeftIndex,
        treeSide: 'left',
        renderMode: 'comparison',
        linkGeometryMode
      }
    );

    const rightLayerData = this.controller.dataConverter.convertTreeToLayerData(
      rightLayout,
      {
        extensionRadius,
        labelRadius,
        treeIndex: clampedRightIndex,
        treeSide: 'right',
        renderMode: 'comparison',
        linkGeometryMode
      }
    );

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;

    const rightTreeOffset = this.controller.viewportManager.getRightTreeOffset();

    const comparisonGeometry = calculateComparisonFrameGeometry({
      leftLayerData,
      rightLayerData,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      fontSize
    });

    // Apply independent offsets to both trees so centers/radii match screen coords
    applyOffset(leftLayerData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, comparisonGeometry.rightOffset, comparisonGeometry.rightOffsetY);

    // Build connectors between trees if views are linked
    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
        buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        comparisonGeometry.leftCenter,
        comparisonGeometry.rightCenter,
        comparisonGeometry.leftSafeRadius,
        comparisonGeometry.rightSafeRadius,
        clampedLeftIndex
      )
      : [];

    // Tag data with side for interactive picking/dragging
    tagTreeSide(leftLayerData, 'left');
    tagTreeSide(rightLayerData, 'right');

    const combinedData = combineLayerData(leftLayerData, rightLayerData, connectors);

    this.controller._updateLayersEfficiently(combinedData);

    const indicesChanged = this._lastFittedIndices === null ||
      this._lastFittedIndices.left !== leftIndex ||
      this._lastFittedIndices.right !== rightIndex;

    if (indicesChanged) {
      this.controller.viewportManager.focusOnTree(combinedData.nodes, combinedData.labels, {
        fitMode: VIEWPORT_FIT_MODES.BRANCH,
        links: [...combinedData.links, ...combinedData.extensions, ...combinedData.connectors]
      });
      this._lastFittedIndices = { left: leftIndex, right: rightIndex };
    }

  }

  /**
   * Render animated comparison mode with interpolated left tree and static right tree.
   * @param {Object} interpolatedData - Pre-computed interpolated data for left tree
   * @param {Object} rightTreeData - Right tree data
   * @param {number} rightIndex - Right tree index
   */
  async renderAnimated(interpolatedData, rightTreeData, rightIndex, options = {}) {
    return measureFrameStepAsync('comparisonMode.renderAnimated', () =>
      this._renderAnimated(interpolatedData, rightTreeData, rightIndex, options)
    );
  }

  async _renderAnimated(interpolatedData, rightTreeData, rightIndex, options = {}) {
    // Guard against null/undefined data
    if (!interpolatedData || !rightTreeData) {
      console.warn('ComparisonModeRenderer.renderAnimated: Missing data', {
        hasInterpolatedData: !!interpolatedData,
        hasRightTreeData: !!rightTreeData,
        rightIndex
      });
      return;
    }

    const {
      leftTreeOffsetX = 0,
      leftTreeOffsetY = 0,
      viewsConnected,
      linkGeometryMode = 'radial-elbow',
      fontSize = '2.6em'
    } = useAppStore.getState();
    const rightBase = this._getAnimatedRightBaseLayerData({
      rightTreeData,
      rightIndex,
      linkGeometryMode
    });

    if (!rightBase) {
         console.warn('[ComparisonModeRenderer] Right layout calculation failed, skipping renderAnimated');
         return;
    }

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;
    const rightTreeOffset = this.controller.viewportManager.getRightTreeOffset();

    const comparisonGeometry = calculateComparisonFrameGeometry({
      leftLayerData: interpolatedData,
      rightLayerData: rightBase.layerData,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      fontSize
    });
    const rightFrame = this._getPreparedAnimatedRightFrame({
      base: rightBase,
      comparisonGeometry,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      viewsConnected,
      fontSize
    });

    // Apply independent offsets to both trees
    applyOffset(interpolatedData, leftTreeOffsetX, leftTreeOffsetY);

    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
        rightFrame.positionMap,
        comparisonGeometry.leftCenter,
        comparisonGeometry.rightCenter,
        comparisonGeometry.leftSafeRadius,
        comparisonGeometry.rightSafeRadius,
        options.activeTreeIndex
      )
      : [];

    // Tag data with side for interactive picking/dragging
    tagTreeSide(interpolatedData, 'left');

    const combinedData = combineLayerData(interpolatedData, rightFrame.layerData, connectors);

    this.controller._updateLayersEfficiently(combinedData);

    // Auto-fit when entering comparison mode or when the right tree index changes.
    // Don't refit every animation frame — that causes camera "jumping".
    const indicesChanged = this._lastFittedIndices === null ||
      this._lastFittedIndices.right !== rightIndex;

    if (indicesChanged) {
      this.controller.viewportManager.focusOnTree(
        combinedData.nodes,
        combinedData.labels,
        {
          fitMode: VIEWPORT_FIT_MODES.BRANCH,
          allowDuringPlayback: true,
          duration: 0,
          links: [...combinedData.links, ...combinedData.extensions, ...combinedData.connectors]
        }
      );
      this._lastFittedIndices = { left: -1, right: rightIndex };
    }

  }

  // ==========================================================================
  // INTERNAL METHODS
  // ==========================================================================

  /**
   * Build connectors for comparison mode.
   * Delegated to buildSubtreeConnectors transform.
   */
  _buildConnectors(leftPositions, rightPositions, leftCenter = [0, 0], rightCenter = [0, 0], leftRadius, rightRadius, activeTreeIndex = null) {
    const state = useAppStore.getState();
    const frameIndex = Number.isInteger(activeTreeIndex)
      ? activeTreeIndex
      : state.frameIndex;
    const pivotEdge = selectPivotEdgeForFrame(state, frameIndex);
    const pairId = selectTimelineFrameAtIndex(state, frameIndex)?.pair_id ?? null;
    const affectedSubtreesBySplit = pairId
      ? selectPairById(state)[pairId].solution.affected_subtrees_by_split
      : {};

    if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) {
      return [];
    }

    return buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      affectedSubtreesBySplit,
      pivotEdge,
      colorManager: state.colorManager,
      subtreeHighlightTracking: state.subtreeHighlightTracking,
      frameIndex,
      subtreeHighlightsEnabled: state.subtreeHighlightsEnabled,
      linkConnectionOpacity: state.linkConnectionOpacity,
      leftCenter,
      rightCenter,
      leftRadius,
      rightRadius
    });
  }

  _getAnimatedRightBaseLayerData({ rightTreeData, rightIndex, linkGeometryMode }) {
    this._ensureAnimatedRightCaches();
    const state = useAppStore.getState();
    const layoutCacheKey = this.controller._createLayoutCacheKey?.(rightIndex, state);
    const preLayoutCacheKey = layoutCacheKey
      ? this._createAnimatedRightBaseCacheKey({ rightIndex, layoutCacheKey, linkGeometryMode })
      : null;

    if (preLayoutCacheKey) {
      const cached = this._animatedRightBaseCache.get(preLayoutCacheKey);
      if (cached) return cached;
    }

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: rightIndex
    });

    if (!rightLayout) return null;

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      rightLayout
    );
    const resolvedLayoutCacheKey = layoutCacheKey
      ?? rightLayout.layoutCacheKey
      ?? this._getObjectCacheId(rightLayout);
    const cacheKey = preLayoutCacheKey
      ?? this._createAnimatedRightBaseCacheKey({
        rightIndex,
        layoutCacheKey: resolvedLayoutCacheKey,
        linkGeometryMode
      });
    const cached = this._animatedRightBaseCache.get(cacheKey);
    if (cached) return cached;

    const layerData = this.controller.dataConverter.convertTreeToLayerData(
      rightLayout,
      {
        extensionRadius,
        labelRadius,
        treeIndex: rightIndex,
        treeSide: 'right',
        renderMode: 'comparison',
        linkGeometryMode
      }
    );
    const entry = {
      cacheKey,
      layerData
    };
    this._setBoundedCacheEntry(this._animatedRightBaseCache, cacheKey, entry);
    return entry;
  }

  _getPreparedAnimatedRightFrame({
    base,
    comparisonGeometry,
    canvasWidth,
    rightTreeOffset,
    leftTreeOffsetX,
    leftTreeOffsetY,
    viewsConnected,
    fontSize
  }) {
    this._ensureAnimatedRightCaches();
    const preparedCacheKey = [
      base.cacheKey,
      canvasWidth,
      rightTreeOffset?.x ?? 0,
      rightTreeOffset?.y ?? 0,
      leftTreeOffsetX,
      leftTreeOffsetY,
      comparisonGeometry.rightOffset,
      comparisonGeometry.rightOffsetY,
      fontSize,
      viewsConnected ? 'connected' : 'disconnected'
    ].join('|');

    const cached = this._animatedRightPreparedCache.get(preparedCacheKey);
    if (cached) return cached;

    const layerData = cloneLayerData(base.layerData);
    applyOffset(layerData, comparisonGeometry.rightOffset, comparisonGeometry.rightOffsetY);
    tagTreeSide(layerData, 'right');

    const entry = {
      layerData,
      positionMap: viewsConnected ? buildPositionMap(layerData.nodes, layerData.labels) : null
    };
    this._setBoundedCacheEntry(this._animatedRightPreparedCache, preparedCacheKey, entry);
    return entry;
  }

  _createAnimatedRightBaseCacheKey({ rightIndex, layoutCacheKey, linkGeometryMode }) {
    return [
      rightIndex,
      layoutCacheKey,
      linkGeometryMode
    ].join('|');
  }

  _getObjectCacheId(value) {
    this._ensureAnimatedRightCaches();
    if (!value || typeof value !== 'object') return String(value);
    let id = this._objectCacheIds.get(value);
    if (!id) {
      id = `object-${this._nextObjectCacheId++}`;
      this._objectCacheIds.set(value, id);
    }
    return id;
  }

  _setBoundedCacheEntry(cache, key, value) {
    if (!cache.has(key) && cache.size >= 32) {
      cache.clear();
    }
    cache.set(key, value);
  }

  _ensureAnimatedRightCaches() {
    this._animatedRightBaseCache ??= new Map();
    this._animatedRightPreparedCache ??= new Map();
    this._objectCacheIds ??= new WeakMap();
    this._nextObjectCacheId ??= 1;
  }
}
