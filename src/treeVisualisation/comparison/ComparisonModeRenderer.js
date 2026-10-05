import { buildSubtreeConnectors } from '../deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { useAppStore } from '../../state/phyloStore/store.js';
import { getAffectedSubtreesForPivotEdge } from '../../state/phyloStore/internal/changeTracking.helpers.js';
import { tagTreeSide } from '../utils/layerDataUtils.js';
import { VIEWPORT_FIT_OBSTRUCTION_SCOPES } from '../spatial/layout.js';
import {
  VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO,
  getAutoFitLabelOptions,
} from '../viewport/viewportFit.js';
import {
  applyOffset,
  combineLayerData,
  buildPositionMap,
  calculateComparisonFrameGeometry,
  cloneLayerData,
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
    const state = useAppStore.getState();
    const {
      treeList,
      leftTreeOffsetX = 0,
      leftTreeOffsetY = 0,
      viewsConnected,
      linkGeometryMode = 'radial-elbow',
    } = state;

    const clampIndex = (idx) => {
      if (!Array.isArray(treeList)) return 0;
      return Math.min(Math.max(idx, 0), treeList.length - 1);
    };

    const clampedLeftIndex = clampIndex(leftIndex);
    const clampedRightIndex = clampIndex(rightIndex);

    const [leftTreeData, rightTreeData] = state.ensureTreesHydrated([
      clampedLeftIndex,
      clampedRightIndex,
    ]);

    // Guard against null/undefined tree data
    if (!leftTreeData || !rightTreeData) {
      console.warn('[ComparisonModeRenderer] Cannot render static comparison: tree data missing.', {
        leftIndex: clampedLeftIndex,
        rightIndex: clampedRightIndex,
        treeCount: Array.isArray(treeList) ? treeList.length : 0,
        hasLeftTree: !!leftTreeData,
        hasRightTree: !!rightTreeData,
      });
      return;
    }

    const leftLayout = this.controller.calculateLayout(leftTreeData, {
      treeIndex: clampedLeftIndex,
    });

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: clampedRightIndex,
    });

    // Safety check for layout
    if (!leftLayout || !rightLayout) {
      console.warn('[ComparisonModeRenderer] Cannot render static comparison: layout failed.', {
        leftIndex: clampedLeftIndex,
        rightIndex: clampedRightIndex,
        hasLeftLayout: !!leftLayout,
        hasRightLayout: !!rightLayout,
      });
      return;
    }

    const leftRadii = this.controller._getConsistentRadii(leftLayout);
    const rightRadii = this.controller._getConsistentRadii(rightLayout);

    const leftLayerData = this.controller.dataConverter.convertTreeToLayerData(leftLayout, {
      extensionRadius: leftRadii.extensionRadius,
      labelRadius: leftRadii.labelRadius,
      treeIndex: clampedLeftIndex,
      treeSide: 'left',
      renderMode: 'comparison',
      linkGeometryMode,
    });

    const rightLayerData = this.controller.dataConverter.convertTreeToLayerData(rightLayout, {
      extensionRadius: rightRadii.extensionRadius,
      labelRadius: rightRadii.labelRadius,
      treeIndex: clampedRightIndex,
      treeSide: 'right',
      renderMode: 'comparison',
      linkGeometryMode,
    });

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;

    const rightTreeOffset = this.controller.viewportManager.getRightTreeOffset();

    const comparisonGeometry = calculateComparisonFrameGeometry({
      leftLayerData,
      rightLayerData,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      // Keep side-by-side spacing stable when terminal labels are toggled off.
      // The camera fit intentionally ignores hidden label anchors below, but
      // shrinking the tree-to-tree offset here can make comparison trees overlap
      // without an auto-fit because fit state is keyed by tree indices.
      includeLabelTextBounds: true,
    });

    // Apply independent offsets to both trees so centers/radii match screen coords
    applyOffset(leftLayerData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, comparisonGeometry.rightOffset, comparisonGeometry.rightOffsetY);

    // Build connectors between trees if views are linked
    const connectors = viewsConnected
      ? this._buildConnectors(
          buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
          buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
          comparisonGeometry,
          clampedLeftIndex
        )
      : [];

    // Tag data with side for interactive picking/dragging
    tagTreeSide(leftLayerData, 'left');
    tagTreeSide(rightLayerData, 'right');

    const combinedData = combineLayerData(leftLayerData, rightLayerData, connectors);

    this.controller._updateLayersEfficiently(combinedData);

    this._fitOnIndexChange(combinedData, clampedLeftIndex, clampedRightIndex);
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
    if (isRenderCancelled(options)) return;

    // Guard against null/undefined data
    if (!interpolatedData || !rightTreeData) {
      console.warn('[ComparisonModeRenderer] Cannot render animated comparison: data missing.', {
        hasInterpolatedData: !!interpolatedData,
        hasRightTreeData: !!rightTreeData,
        rightIndex,
      });
      return;
    }

    const {
      leftTreeOffsetX = 0,
      leftTreeOffsetY = 0,
      viewsConnected,
      linkGeometryMode = 'radial-elbow',
    } = useAppStore.getState();
    const rightBase = this._getAnimatedRightBaseLayerData({
      rightTreeData,
      rightIndex,
      linkGeometryMode,
    });

    if (!rightBase) {
      console.warn(
        '[ComparisonModeRenderer] Cannot render animated comparison: right tree layout failed.',
        {
          rightIndex,
        }
      );
      return;
    }
    if (isRenderCancelled(options)) return;

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;
    const rightTreeOffset = this.controller.viewportManager.getRightTreeOffset();

    const comparisonGeometry = calculateComparisonFrameGeometry({
      leftLayerData: interpolatedData,
      rightLayerData: rightBase.layerData,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      includeLabelTextBounds: true,
    });
    const rightFrame = this._getPreparedAnimatedRightFrame({
      base: rightBase,
      comparisonGeometry,
      canvasWidth,
      rightTreeOffset,
      leftTreeOffsetX,
      leftTreeOffsetY,
      viewsConnected,
    });

    // Apply independent offsets to both trees
    applyOffset(interpolatedData, leftTreeOffsetX, leftTreeOffsetY);

    const connectors = viewsConnected
      ? this._buildConnectors(
          buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
          rightFrame.positionMap,
          comparisonGeometry,
          options.activeTreeIndex
        )
      : [];

    // Tag data with side for interactive picking/dragging
    tagTreeSide(interpolatedData, 'left');

    const combinedData = combineLayerData(interpolatedData, rightFrame.layerData, connectors);
    if (isRenderCancelled(options)) return;

    this.controller._updateLayersEfficiently(combinedData);

    // The left tree interpolates every frame (-1), so only the right index triggers a refit.
    this._fitOnIndexChange(combinedData, -1, rightIndex, {
      allowDuringPlayback: true,
      duration: 0,
    });
  }

  // Auto-fit when entering comparison mode or when the compared trees change.
  // Don't refit every frame — that causes camera "jumping".
  _fitOnIndexChange(combinedData, left, right, extra) {
    const last = this._lastFittedIndices;
    if (last && last.right === right && (left === -1 || last.left === left)) return;

    const { labelsVisible } = useAppStore.getState();
    this.controller.viewportManager.focusOnTree(combinedData.nodes, combinedData.labels, {
      ...getAutoFitLabelOptions(labelsVisible === false ? 0 : combinedData.labels.length),
      obstructionScope: VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS,
      maxFitAreaCenterDriftRatio: VIEWPORT_AUTO_FIT_CENTER_DRIFT_LIMIT_RATIO,
      links: [...combinedData.links, ...combinedData.extensions, ...combinedData.connectors],
      ...extra,
    });
    this._lastFittedIndices = { left, right };
  }

  // ==========================================================================
  // INTERNAL METHODS
  // ==========================================================================

  /**
   * Build connectors for comparison mode.
   * Delegated to buildSubtreeConnectors transform.
   */
  _buildConnectors(leftPositions, rightPositions, comparisonGeometry, activeTreeIndex) {
    const state = useAppStore.getState();
    const frameIndex = Number.isInteger(activeTreeIndex) ? activeTreeIndex : state.frameIndex;

    return buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      affectedSubtrees: getAffectedSubtreesForPivotEdge(state, frameIndex),
      colorManager: state.colorManager,
      subtreeHighlightTracking: state.subtreeHighlightTracking,
      frameIndex,
      subtreeHighlightsEnabled: state.subtreeHighlightsEnabled,
      linkConnectionOpacity: state.linkConnectionOpacity,
      highlightColorMode: state.highlightColorMode,
      subtreeHighlightColor: state.subtreeHighlightColor,
      leftCenter: comparisonGeometry.leftCenter,
      rightCenter: comparisonGeometry.rightCenter,
      leftRadius: comparisonGeometry.leftSafeRadius,
      rightRadius: comparisonGeometry.rightSafeRadius,
    });
  }

  _getAnimatedRightBaseLayerData({ rightTreeData, rightIndex, linkGeometryMode }) {
    const layoutCacheKey = this.controller._createLayoutCacheKey(rightIndex);
    const cacheKey = [rightIndex, layoutCacheKey, linkGeometryMode].join('|');
    const cached = this._animatedRightBaseCache.get(cacheKey);
    if (cached) return cached;

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: rightIndex,
    });

    if (!rightLayout) return null;

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(rightLayout);
    const layerData = this.controller.dataConverter.convertTreeToLayerData(rightLayout, {
      extensionRadius,
      labelRadius,
      treeIndex: rightIndex,
      treeSide: 'right',
      renderMode: 'comparison',
      linkGeometryMode,
    });
    const entry = {
      cacheKey,
      layerData,
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
  }) {
    const preparedCacheKey = [
      base.cacheKey,
      canvasWidth,
      rightTreeOffset?.x ?? 0,
      rightTreeOffset?.y ?? 0,
      leftTreeOffsetX,
      leftTreeOffsetY,
      comparisonGeometry.rightOffset,
      comparisonGeometry.rightOffsetY,
      viewsConnected ? 'connected' : 'disconnected',
    ].join('|');

    const cached = this._animatedRightPreparedCache.get(preparedCacheKey);
    if (cached) return cached;

    const layerData = cloneLayerData(base.layerData);
    applyOffset(layerData, comparisonGeometry.rightOffset, comparisonGeometry.rightOffsetY);
    tagTreeSide(layerData, 'right');

    const entry = {
      layerData,
      positionMap: viewsConnected ? buildPositionMap(layerData.nodes, layerData.labels) : null,
    };
    this._setBoundedCacheEntry(this._animatedRightPreparedCache, preparedCacheKey, entry);
    return entry;
  }

  _setBoundedCacheEntry(cache, key, value) {
    if (!cache.has(key) && cache.size >= 32) {
      cache.clear();
    }
    cache.set(key, value);
  }
}

function isRenderCancelled(options = {}) {
  return typeof options.isCancelled === 'function' && options.isCancelled();
}
