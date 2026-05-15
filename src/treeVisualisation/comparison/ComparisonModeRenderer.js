import { buildSubtreeConnectors } from '../deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { useAppStore } from '../../state/phyloStore/store.js';
import { selectTreePairKeyAtIndex } from '../../state/phyloStore/selectors/treeSelectors.js';
import { tagTreeSide } from '../utils/layerDataUtils.js';
import {
  calculateRightOffset,
  applyOffset,
  combineLayerData,
  buildPositionMap
} from './ComparisonUtils.js';
import {
  calculatePositionCenter,
  calculateSafeVisualRadius,
  calculateTreeVisualRadius
} from '../utils/TreeBoundsUtils.js';
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
      linkGeometryMode = 'radial-elbow'
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
        canvasWidth: leftLayout.width,
        canvasHeight: leftLayout.height,
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
        canvasWidth: rightLayout.width,
        canvasHeight: rightLayout.height,
        treeIndex: clampedRightIndex,
        treeSide: 'right',
        renderMode: 'comparison',
        linkGeometryMode
      }
    );

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;

    const viewOffset = this.controller.viewportManager.getViewOffset();

    // Calculate real centers (layout is origin-centered; add offsets after)
    const leftCenterBase = calculatePositionCenter(leftLayerData.nodes);
    const rightCenterBase = calculatePositionCenter(rightLayerData.nodes);

    // Resolve base label size in world-space pixels so calculateTreeVisualRadius
    // can account for the width of the longest taxon name.
    const fontSize = useAppStore.getState().fontSize ?? '2.6em';
    const labelSizePx = parseFloat(fontSize) * 12 || 24;

    // Compute tree radii including labels and extensions so the offset
    // accounts for the full visual extent of each tree.
    const leftRadius = calculateTreeVisualRadius(leftLayerData, leftCenterBase, labelSizePx);
    const rightRadius = calculateTreeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);

    const rightOffset = calculateRightOffset(canvasWidth, viewOffset, leftRadius, rightRadius);

    // Apply independent offsets to both trees so centers/radii match screen coords
    applyOffset(leftLayerData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
    const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + viewOffset.y];

    const leftSafeRadius = calculateSafeVisualRadius(leftLayerData.nodes, leftLayerData.labels, leftCenter);
    const rightSafeRadius = calculateSafeVisualRadius(rightLayerData.nodes, rightLayerData.labels, rightCenter);

    // Build connectors between trees if views are linked
    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
        buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        leftCenter,
        rightCenter,
        leftSafeRadius,
        rightSafeRadius
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
        links: [...combinedData.links, ...(combinedData.connectors || [])]
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
  async renderAnimated(interpolatedData, rightTreeData, rightIndex) {
    return measureFrameStepAsync('comparisonMode.renderAnimated', () =>
      this._renderAnimated(interpolatedData, rightTreeData, rightIndex)
    );
  }

  async _renderAnimated(interpolatedData, rightTreeData, rightIndex) {
    // Guard against null/undefined data
    if (!interpolatedData || !rightTreeData) {
      console.warn('ComparisonModeRenderer.renderAnimated: Missing data', {
        hasInterpolatedData: !!interpolatedData,
        hasRightTreeData: !!rightTreeData,
        rightIndex
      });
      return;
    }

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: rightIndex
    });

    if (!rightLayout) {
         console.warn('[ComparisonModeRenderer] Right layout calculation failed, skipping renderAnimated');
         return;
    }

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      rightLayout
    );

    const rightLayerData = this.controller.dataConverter.convertTreeToLayerData(
      rightLayout,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: rightLayout.width,
        canvasHeight: rightLayout.height,
        treeIndex: rightIndex,
        treeSide: 'right',
        renderMode: 'comparison',
        linkGeometryMode: useAppStore.getState().linkGeometryMode || 'radial-elbow'
      }
    );

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;
    const { leftTreeOffsetX = 0, leftTreeOffsetY = 0, viewsConnected } = useAppStore.getState();
    const viewOffset = this.controller.viewportManager.getViewOffset();

    // Centers before offsets
    const leftCenterBase = calculatePositionCenter(interpolatedData.nodes);
    const rightCenterBase = calculatePositionCenter(rightLayerData.nodes);

    // Resolve base label size so calculateTreeVisualRadius accounts for text width.
    const fontSize = useAppStore.getState().fontSize ?? '2.6em';
    const labelSizePx = parseFloat(fontSize) * 12 || 24;

    // Compute tree radii including labels and extensions so the offset
    // accounts for the full visual extent of each tree.
    const leftRadius = calculateTreeVisualRadius(interpolatedData, leftCenterBase, labelSizePx);
    const rightRadius = calculateTreeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);

    const rightOffset = calculateRightOffset(canvasWidth, viewOffset, leftRadius, rightRadius);

    // Apply independent offsets to both trees
    applyOffset(interpolatedData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
    const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + viewOffset.y];

    const leftSafeRadius = calculateSafeVisualRadius(interpolatedData.nodes, interpolatedData.labels, leftCenter);
    const rightSafeRadius = calculateSafeVisualRadius(rightLayerData.nodes, rightLayerData.labels, rightCenter);

    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
        buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        leftCenter,
        rightCenter,
        leftSafeRadius,
        rightSafeRadius
      )
      : [];

    // Tag data with side for interactive picking/dragging
    tagTreeSide(interpolatedData, 'left');
    tagTreeSide(rightLayerData, 'right');

    const combinedData = {
      nodes: [...(interpolatedData.nodes || []), ...(rightLayerData.nodes || [])],
      links: [...(interpolatedData.links || []), ...(rightLayerData.links || [])],
      extensions: [...(interpolatedData.extensions || []), ...(rightLayerData.extensions || [])],
      labels: [...(interpolatedData.labels || []), ...(rightLayerData.labels || [])],
      connectors
    };

    this.controller._updateLayersEfficiently(combinedData);

    // Auto-fit when entering comparison mode or when the right tree index changes.
    // Don't refit every animation frame — that causes camera "jumping".
    const indicesChanged = this._lastFittedIndices === null ||
      this._lastFittedIndices.right !== rightIndex;

    if (indicesChanged) {
      this.controller.viewportManager.focusOnTree(
        combinedData.nodes,
        combinedData.labels,
        { allowDuringPlayback: true, duration: 0, links: [...combinedData.links, ...(combinedData.connectors || [])] }
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
  _buildConnectors(leftPositions, rightPositions, leftCenter = [0, 0], rightCenter = [0, 0], leftRadius, rightRadius) {
    const state = useAppStore.getState();
    const currentTreeIndex = state?.currentTreeIndex ?? 0;
    const pivotEdgeTracking = state?.pivotEdgeTracking || [];
    const pivotEdge = pivotEdgeTracking[currentTreeIndex];
    const pairKey = selectTreePairKeyAtIndex(state, currentTreeIndex);
    const latticeSolutions = pairKey
      ? state?.pairSolutions?.[pairKey]?.jumping_subtree_solutions || {}
      : {};

    if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) {
      return [];
    }

    return buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      latticeSolutions,
      pivotEdge,
      colorManager: state?.colorManager,
      subtreeTracking: state?.subtreeTracking || [],
      currentTreeIndex,
      markedSubtreesEnabled: state?.markedSubtreesEnabled ?? true,
      linkConnectionOpacity: state?.linkConnectionOpacity ?? 0.6,
      leftCenter,
      rightCenter,
      leftRadius,
      rightRadius
    });
  }
}
