import { prepareJumpingSubtreeConnectors } from '../deckgl/data/transforms/ComparisonPrep.js';
import { useAppStore } from '../../core/store.js';
import {
  calculateRightOffset,
  applyOffset,
  calculateBounds,
  combineLayerData,
  buildPositionMap
} from './ComparisonUtils.js';

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
    const { treeList, leftTreeOffsetX = 0, leftTreeOffsetY = 0, viewsConnected } = useAppStore.getState();

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
      treeIndex: clampedLeftIndex,
      updateController: true
    });

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: clampedRightIndex,
      updateController: false,
      rotationAlignmentKey: 'comparison-right'
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
      leftLayout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: leftLayout.width,
        canvasHeight: leftLayout.height
      }
    );

    const rightLayerData = this.controller.dataConverter.convertTreeToLayerData(
      rightLayout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: rightLayout.width,
        canvasHeight: rightLayout.height
      }
    );

    const canvasWidth = this.controller.deckManager.getCanvasDimensions().width;

    const viewOffset = this.controller.viewportManager.getViewOffset();
    const rightOffset = calculateRightOffset(canvasWidth, viewOffset);

    // Apply independent offsets to both trees
    applyOffset(leftLayerData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    // Build connectors between trees if views are linked
    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
        buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        [leftTreeOffsetX, leftTreeOffsetY],
        [rightOffset, viewOffset.y]
      )
      : [];

    // Tag data with side for interactive picking/dragging
    const tagSide = (data, side) => {
      [...(data.nodes || []), ...(data.links || []), ...(data.extensions || []), ...(data.labels || [])].forEach(d => d.treeSide = side);
    };
    tagSide(leftLayerData, 'left');
    tagSide(rightLayerData, 'right');

    const combinedData = combineLayerData(leftLayerData, rightLayerData, connectors);

    const elements = [...combinedData.nodes, ...(combinedData.labels || [])];
    const bounds = calculateBounds(elements);

    this.controller._updateLayersEfficiently(combinedData);

    if (this._lastFittedIndices === null) {
      this.controller.viewportManager.focusOnTree(combinedData.nodes, combinedData.labels);
      this._lastFittedIndices = { left: leftIndex, right: rightIndex };
    }

    this.controller.viewportManager.updateScreenPositions(leftLayerData.nodes);
  }

  /**
   * Render animated comparison mode with interpolated left tree and static right tree.
   * @param {Object} interpolatedData - Pre-computed interpolated data for left tree
   * @param {Object} rightTreeData - Right tree data
   * @param {number} rightIndex - Right tree index
   */
  async renderAnimated(interpolatedData, rightTreeData, rightIndex) {
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
      treeIndex: rightIndex,
      updateController: false,
      rotationAlignmentKey: 'comparison-right'
    });

    if (!rightLayout) {
         console.warn('[ComparisonModeRenderer] Right layout calculation failed, skipping renderAnimated');
         return;
    }

    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      rightLayout
    );

    const rightLayerData = this.controller.dataConverter.convertTreeToLayerData(
      rightLayout.tree,
      {
        extensionRadius,
        labelRadius,
        canvasWidth: rightLayout.width,
        canvasHeight: rightLayout.height
      }
    );

    const canvasWidth = this.controller.deckManager.getCanvasDimensions().width;
    const { leftTreeOffsetX = 0, leftTreeOffsetY = 0, viewsConnected } = useAppStore.getState();
    const viewOffset = this.controller.viewportManager.getViewOffset();
    const rightOffset = calculateRightOffset(canvasWidth, viewOffset);

    // Apply independent offsets to both trees
    applyOffset(interpolatedData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const connectors = viewsConnected
      ? this._buildConnectors(
        buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
        buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        [leftTreeOffsetX, leftTreeOffsetY],
        [rightOffset, viewOffset.y]
      )
      : [];

    // Tag data with side for interactive picking/dragging
    const tagSide = (data, side) => {
      [...(data.nodes || []), ...(data.links || []), ...(data.extensions || []), ...(data.labels || [])].forEach(d => d.treeSide = side);
    };
    tagSide(interpolatedData, 'left');
    tagSide(rightLayerData, 'right');

    const combinedData = {
      nodes: [...(interpolatedData.nodes || []), ...(rightLayerData.nodes || [])],
      links: [...(interpolatedData.links || []), ...(rightLayerData.links || [])],
      extensions: [...(interpolatedData.extensions || []), ...(rightLayerData.extensions || [])],
      labels: [...(interpolatedData.labels || []), ...(rightLayerData.labels || [])],
      connectors
    };

    this.controller._updateLayersEfficiently(combinedData);

    if (this._lastFittedIndices === null) {
      this.controller.viewportManager.focusOnTree(combinedData.nodes, combinedData.labels);
      this._lastFittedIndices = { left: -1, right: rightIndex };
    }

    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes);
  }

  // ==========================================================================
  // INTERNAL METHODS
  // ==========================================================================

  /**
   * Build connectors for comparison mode.
   * Delegated to prepareJumpingSubtreeConnectors transform.
   */
  _buildConnectors(leftPositions, rightPositions, leftCenter = [0, 0], rightCenter = [0, 0]) {
    const state = useAppStore.getState();
    const currentTreeIndex = state?.currentTreeIndex ?? 0;
    const activeChangeEdgeTracking = state?.activeChangeEdgeTracking || [];
    const activeChangeEdge = activeChangeEdgeTracking[currentTreeIndex];

    if (!Array.isArray(activeChangeEdge) || activeChangeEdge.length === 0) {
      return [];
    }

    return prepareJumpingSubtreeConnectors({
      leftPositions,
      rightPositions,
      latticeSolutions: state?.pairSolutions?.[state?.movieData?.tree_metadata?.[currentTreeIndex]?.tree_pair_key]?.jumping_subtree_solutions || {},
      activeChangeEdge,
      colorManager: state?.colorManager,
      subtreeTracking: state?.subtreeTracking || [],
      currentTreeIndex,
      markedSubtreesEnabled: state?.markedSubtreesEnabled ?? true,
      linkConnectionOpacity: state?.linkConnectionOpacity ?? 0.6,
      leftCenter,
      rightCenter
    });
  }
}
