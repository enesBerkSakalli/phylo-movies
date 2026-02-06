import { buildSubtreeConnectors } from '../deckgl/data/transforms/SubtreeConnectorBuilder.js';
import { useAppStore } from '../../core/store.js';
import { tagTreeSide } from '../utils/layerDataUtils.js';
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

/**
 * Compute the visual extent of a tree including nodes, labels, and extensions.
 * Also estimates label text width from the longest taxon name so that
 * the offset keeps label text from overlapping the neighbouring tree.
 */
const computeVisualRadius = (layerData, center = [0, 0], labelSizePx = 0) => {
  const dist = (p) => {
    if (!p) return 0;
    return Math.hypot((p[0] ?? 0) - center[0], (p[1] ?? 0) - center[1]);
  };

  let maxR = 0;

  // Node positions
  if (Array.isArray(layerData.nodes)) {
    for (const n of layerData.nodes) {
      maxR = Math.max(maxR, dist(n.position));
    }
  }

  // Label positions (extend beyond nodes)
  if (Array.isArray(layerData.labels)) {
    for (const l of layerData.labels) {
      maxR = Math.max(maxR, dist(l.position));
    }
  }

  // Extension endpoints (radial extension lines beyond leaf nodes)
  if (Array.isArray(layerData.extensions)) {
    for (const ext of layerData.extensions) {
      maxR = Math.max(maxR, dist(ext.sourcePosition), dist(ext.targetPosition));
    }
  }

  // Estimate extra space needed for the longest label text.
  // deck.gl TextLayer renders text at ~labelSizePx height; average char width ≈ 0.6× height.
  if (labelSizePx > 0 && Array.isArray(layerData.labels) && layerData.labels.length > 0) {
    let longestLen = 0;
    for (const l of layerData.labels) {
      const len = (l.text ?? l.data?.name ?? '').length;
      if (len > longestLen) longestLen = len;
    }
    const estimatedTextWidth = longestLen * labelSizePx * 0.6;
    maxR += estimatedTextWidth;
  }

  return maxR;
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

    // Calculate real centers (layout is origin-centered; add offsets after)
    const leftCenterBase = computeCenter(leftLayerData.nodes);
    const rightCenterBase = computeCenter(rightLayerData.nodes);

    // Resolve base label size in world-space pixels so computeVisualRadius
    // can account for the width of the longest taxon name.
    const fontSize = useAppStore.getState().fontSize ?? '2.6em';
    const labelSizePx = parseFloat(fontSize) * 12 || 24;

    // Compute tree radii including labels and extensions so the offset
    // accounts for the full visual extent of each tree.
    const leftRadius = computeVisualRadius(leftLayerData, leftCenterBase, labelSizePx);
    const rightRadius = computeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);

    const rightOffset = calculateRightOffset(canvasWidth, viewOffset, leftRadius, rightRadius);

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
    tagTreeSide(leftLayerData, 'left');
    tagTreeSide(rightLayerData, 'right');

    const combinedData = combineLayerData(leftLayerData, rightLayerData, connectors);

    const elements = [...combinedData.nodes, ...(combinedData.labels || [])];
    const bounds = calculateBounds(elements);

    this.controller._updateLayersEfficiently(combinedData);

    const indicesChanged = this._lastFittedIndices === null ||
      this._lastFittedIndices.left !== leftIndex ||
      this._lastFittedIndices.right !== rightIndex;

    if (indicesChanged) {
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

    // Centers before offsets
    const leftCenterBase = computeCenter(interpolatedData.nodes);
    const rightCenterBase = computeCenter(rightLayerData.nodes);

    // Resolve base label size so computeVisualRadius accounts for text width.
    const fontSize = useAppStore.getState().fontSize ?? '2.6em';
    const labelSizePx = parseFloat(fontSize) * 12 || 24;

    // Compute tree radii including labels and extensions so the offset
    // accounts for the full visual extent of each tree.
    const leftRadius = computeVisualRadius(interpolatedData, leftCenterBase, labelSizePx);
    const rightRadius = computeVisualRadius(rightLayerData, rightCenterBase, labelSizePx);

    const rightOffset = calculateRightOffset(canvasWidth, viewOffset, leftRadius, rightRadius);

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
        { allowDuringPlayback: true, duration: 0 }
      );
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
    const pivotEdgeTracking = state?.pivotEdgeTracking || [];
    const pivotEdge = pivotEdgeTracking[currentTreeIndex];

    if (!Array.isArray(pivotEdge) || pivotEdge.length === 0) {
      return [];
    }

    return buildSubtreeConnectors({
      leftPositions,
      rightPositions,
      latticeSolutions: state?.pairSolutions?.[state?.movieData?.tree_metadata?.[currentTreeIndex]?.tree_pair_key]?.jumping_subtree_solutions || {},
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
