import { buildSubtreeConnectors } from '../deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { useAppStore } from '../../core/store.js';
import {
  calculateRightOffset,
  applyOffset,
  calculateBounds,
  combineLayerData,
  buildPositionMap
} from './ComparisonUtils.js';

const computeCenter = (nodes = []) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return [0, 0];
  const [sx, sy] = nodes.reduce(
    (acc, n) => {
      acc[0] += n.position?.[0] ?? 0;
      acc[1] += n.position?.[1] ?? 0;
      return acc;
    },
    [0, 0]
  );
  return [sx / nodes.length, sy / nodes.length];
};

const computeMaxRadius = (nodes = [], center = [0, 0]) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;
  return nodes.reduce((max, n) => {
    const pos = n.position || [0, 0];
    const r = Math.hypot(pos[0] - center[0], pos[1] - center[1]);
    return r > max ? r : max;
  }, 0);
};

const computeSafeRadius = (nodes = [], labels = [], center = [0, 0], fontSizePx = 12) => {
  const dist = (p) => Math.hypot((p?.[0] ?? 0) - center[0], (p?.[1] ?? 0) - center[1]);
  const nodeRadius = nodes.reduce((m, n) => Math.max(m, dist(n.position)), 0);
  const labelRadius = labels.reduce((m, l) => Math.max(m, dist(l.position)), 0);
  const base = Math.max(nodeRadius, labelRadius);
  const padding = Math.max(fontSizePx * 1.5, base * 0.04);
  return base + padding;
};

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

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;

    const viewOffset = this.controller.viewportManager.getViewOffset();
    const rightOffset = calculateRightOffset(canvasWidth, viewOffset);

    // Calculate real centers (layout is origin-centered; add offsets after)
    const leftCenterBase = computeCenter(leftLayerData.nodes);
    const rightCenterBase = computeCenter(rightLayerData.nodes);

    // Apply independent offsets to both trees so centers/radii match screen coords
    applyOffset(leftLayerData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
    const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + viewOffset.y];

    const leftSafeRadius = computeSafeRadius(leftLayerData.nodes, leftLayerData.labels, leftCenter);
    const rightSafeRadius = computeSafeRadius(rightLayerData.nodes, rightLayerData.labels, rightCenter);

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

    const canvasWidth = this.controller.deckContext.getCanvasDimensions().width;
    const { leftTreeOffsetX = 0, leftTreeOffsetY = 0, viewsConnected } = useAppStore.getState();
    const viewOffset = this.controller.viewportManager.getViewOffset();
    const rightOffset = calculateRightOffset(canvasWidth, viewOffset);

    // Centers before offsets
    const leftCenterBase = computeCenter(interpolatedData.nodes);
    const rightCenterBase = computeCenter(rightLayerData.nodes);

    // Apply independent offsets to both trees
    applyOffset(interpolatedData, leftTreeOffsetX, leftTreeOffsetY);
    applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const leftCenter = [leftCenterBase[0] + leftTreeOffsetX, leftCenterBase[1] + leftTreeOffsetY];
    const rightCenter = [rightCenterBase[0] + rightOffset, rightCenterBase[1] + viewOffset.y];

    const leftSafeRadius = computeSafeRadius(interpolatedData.nodes, interpolatedData.labels, leftCenter);
    const rightSafeRadius = computeSafeRadius(rightLayerData.nodes, rightLayerData.labels, rightCenter);

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
   * Delegated to buildSubtreeConnectors transform.
   */
  _buildConnectors(leftPositions, rightPositions, leftCenter = [0, 0], rightCenter = [0, 0], leftRadius, rightRadius) {
    const state = useAppStore.getState();
    const currentTreeIndex = state?.currentTreeIndex ?? 0;
    const activeChangeEdgeTracking = state?.activeChangeEdgeTracking || [];
    const activeChangeEdge = activeChangeEdgeTracking[currentTreeIndex];

    if (!Array.isArray(activeChangeEdge) || activeChangeEdge.length === 0) {
      return [];
    }

    return buildSubtreeConnectors({
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
      rightCenter,
      leftRadius,
      rightRadius
    });
  }
}
