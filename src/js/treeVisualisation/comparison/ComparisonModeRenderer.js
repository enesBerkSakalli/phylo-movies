import { colorToRgb } from '../../services/ui/colorUtils.js';
import { Bezier } from 'bezier-js';

const BUNDLING_STRENGTH = 0.6;

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

  /**
   * Calculate spacing offset for the right tree in comparison mode.
   * @param {number} canvasWidth - Canvas width
   * @param {Object} viewOffset - Current view offset {x, y}
   * @returns {number} Right tree offset
   */
  _calculateRightOffset(canvasWidth, viewOffset) {
    const spacing = canvasWidth * 0.1;
    const halfWidth = canvasWidth / 2;
    return halfWidth + spacing + viewOffset.x;
  }

  /**
   * Apply position offset to layer data elements.
   * @param {Object} layerData - Layer data containing nodes, links, extensions, labels
   * @param {number} offsetX - X offset
   * @param {number} offsetY - Y offset
   */
  _applyOffset(layerData, offsetX, offsetY) {
    layerData.nodes.forEach(node => {
      node.position = [node.position[0] + offsetX, node.position[1] + offsetY, node.position[2]];
    });

    (layerData.links || []).forEach(link => {
      link.sourcePosition = [link.sourcePosition[0] + offsetX, link.sourcePosition[1] + offsetY, link.sourcePosition[2]];
      link.targetPosition = [link.targetPosition[0] + offsetX, link.targetPosition[1] + offsetY, link.targetPosition[2]];
      if (Array.isArray(link.path)) {
        link.path = link.path.map(point => [point[0] + offsetX, point[1] + offsetY, point[2]]);
      }
    });

    (layerData.extensions || []).forEach(ext => {
      ext.sourcePosition = [ext.sourcePosition[0] + offsetX, ext.sourcePosition[1] + offsetY, ext.sourcePosition[2]];
      ext.targetPosition = [ext.targetPosition[0] + offsetX, ext.targetPosition[1] + offsetY, ext.targetPosition[2]];
      if (Array.isArray(ext.path)) {
        ext.path = ext.path.map(point => [point[0] + offsetX, point[1] + offsetY, point[2]]);
      }
    });

    (layerData.labels || []).forEach(label => {
      label.position = [label.position[0] + offsetX, label.position[1] + offsetY, label.position[2]];
    });
  }

  /**
   * Calculate bounds from combined elements.
   * @param {Array} elements - Combined nodes and labels
   * @returns {Object} bounds {minX, maxX, minY, maxY}
   */
  _calculateBounds(elements) {
    return elements.reduce((acc, el) => {
      const [x, y] = el.position;
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      return acc;
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  }

  /**
   * Combine layer data from left and right trees.
   * @param {Object} leftData - Left tree layer data
   * @param {Object} rightData - Right tree layer data
   * @param {Array} connectors - Optional connector paths between trees
   * @returns {Object} Combined layer data
   */
  _combineLayerData(leftData, rightData, connectors = []) {
    return {
      nodes: [...leftData.nodes, ...rightData.nodes],
      links: [...(leftData.links || []), ...(rightData.links || [])],
      extensions: [...(leftData.extensions || []), ...(rightData.extensions || [])],
      labels: [...(leftData.labels || []), ...(rightData.labels || [])],
      connectors
    };
  }

  /**
   * Build a quick lookup of split-index keys to positions (prefers label/tip position when available).
   */
  _buildPositionMap(nodes, labels = []) {
    const positionMap = new Map();
    const labelPositionByLeaf = new Map();

    labels.forEach(label => {
      if (label.leaf) {
        labelPositionByLeaf.set(label.leaf, label.position);
      }
    });

    nodes.forEach(node => {
      const splitIndices = node.data?.split_indices;
      if (Array.isArray(splitIndices) && splitIndices.length > 0) {
        const key = splitIndices.join('-');
        let position = node.position;

        // For leaf nodes, use label position (tip)
        if (node.isLeaf && node.originalNode) {
          const labelPos = labelPositionByLeaf.get(node.originalNode);
          if (labelPos) {
            position = labelPos;
          }
        }

        positionMap.set(key, {
          position,
          isLeaf: node.isLeaf,
          node,
          name: node.data?.name ? String(node.data.name) : null
        });
      }
    });

    return positionMap;
  }

  /**
   * Build Bezier path between two points.
   * @private
   */
  _buildBezierPath(from, to, samples = 24) {
    if (!from || !to) return [];

    const p0 = from;
    const p3 = to;
    const midX = (p0[0] + p3[0]) / 2;
    const offset = Math.max(Math.abs(p3[0] - p0[0]) * 0.15, 30);
    const p1 = [midX - offset, p0[1]];
    const p2 = [midX + offset, p3[1]];

    // Create cubic Bezier curve using bezier-js
    const curve = new Bezier(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);

    // Get lookup table of points along the curve
    const lut = curve.getLUT(samples);

    // Convert {x, y} objects to [x, y, 0] arrays for deck.gl
    return lut.map(p => [p.x, p.y, 0]);
  }

  /**
   * Calculate a "radial bundle point" that pulls the bundle OUTWARD from the tree center.
   * This prevents lines from crossing through the tree structure.
   */
  _calculateRadialBundlePoint(points, treeCenter) {
    if (!points.length) return treeCenter;

    // 1. Calculate simple centroid
    const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    const centroid = [sum[0] / points.length, sum[1] / points.length];

    // 2. Calculate vector from tree center to centroid
    const dx = centroid[0] - treeCenter[0];
    const dy = centroid[1] - treeCenter[1];
    const angle = Math.atan2(dy, dx);

    // 3. Find the maximum radius in this group of points (relative to tree center)
    let maxRadius = 0;
    points.forEach(p => {
      const r = Math.sqrt(Math.pow(p[0] - treeCenter[0], 2) + Math.pow(p[1] - treeCenter[1], 2));
      if (r > maxRadius) maxRadius = r;
    });

    // 4. Project the bundle point OUTWARD beyond the leaves
    // Add a padding factor (e.g., 1.2x max radius)
    const bundleRadius = maxRadius * 1.35;

    return [
      treeCenter[0] + Math.cos(angle) * bundleRadius,
      treeCenter[1] + Math.sin(angle) * bundleRadius,
      0
    ];
  }

  /**
   * Build bundled Bezier path using radial bundle points.
   */
  _buildBundledBezierPath(from, to, srcBundlePoint, dstBundlePoint, samples = 24) {
    if (!from || !to) return [];

    // Bundling strength
    const BUNDLING_STRENGTH = 0.85;

    const p0 = from;
    const p3 = to;

    // Standard "individual" control points (horizontal S-curve)
    const midX = (p0[0] + p3[0]) / 2;
    const offset = Math.max(Math.abs(p3[0] - p0[0]) * 0.15, 30);

    const cp1_indiv = [midX - offset, p0[1]];
    const cp2_indiv = [midX + offset, p3[1]];

    // "Bundle" control points (using the radial bundle points)
    // We pull the curve towards these outer points
    const cp1_bundle = [srcBundlePoint[0], srcBundlePoint[1]];
    const cp2_bundle = [dstBundlePoint[0], dstBundlePoint[1]];

    // Interpolate between individual and bundle control points
    const lerp = (a, b, t) => a + (b - a) * t;

    const p1 = [
      lerp(cp1_indiv[0], cp1_bundle[0], BUNDLING_STRENGTH),
      lerp(cp1_indiv[1], cp1_bundle[1], BUNDLING_STRENGTH)
    ];

    const p2 = [
      lerp(cp2_indiv[0], cp2_bundle[0], BUNDLING_STRENGTH),
      lerp(cp2_indiv[1], cp2_bundle[1], BUNDLING_STRENGTH)
    ];

    // Create cubic Bezier curve
    const curve = new Bezier(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    const lut = curve.getLUT(samples);
    return lut.map(p => [p.x, p.y, 0]);
  }

  /**
   * Build connectors with hierarchical edge bundling.
   * Connects leaves whose split_indices is a subset of any marked component.
   *
   * Uses the same subset logic as TreeColorManager._isComponentMarked:
   * A leaf is part of a moving subtree if its split_indices is a subset of
   * any entry in colorManager.marked (the red-highlighted subtrees).
   *
   * Note: We use `marked` (red) not `currentActiveChangeEdges` (blue) because:
   * - marked = specific jumping/moving subtrees
   * - currentActiveChangeEdges = entire subtree being animated (includes non-movers)
   *
   * TODO: viewLinkMapping.sourceToDest could be used to visualize movement direction
   *       (e.g., arrows showing where leaves move from source to destination position).
   */
  _buildConnectors(viewLinkMapping, leftPositions, rightPositions, leftCenter = [0, 0], rightCenter = [0, 0]) {
    const connectors = [];
    const colorManager = this.controller._getState()?.colorManager;

    // Get marked components from ColorManager (the red-highlighted moving subtrees)
    const markedComponents = colorManager?.marked;
    if (!markedComponents || markedComponents.length === 0) {
      return connectors;
    }

    // Index right leaves by name for fast lookup
    const rightLeavesByName = new Map();
    for (const [key, info] of rightPositions) {
      if (info?.isLeaf && info.name) {
        rightLeavesByName.set(info.name, { key, info });
      }
    }

    // Collect connections for bundling
    const connections = [];
    const opacity = this.controller._getState()?.linkConnectionOpacity ?? 0.6;

    // Iterate over all left leaves and check if their split is a subset of any marked component
    // This matches TreeColorManager._isComponentMarked subset logic
    for (const [key, leftInfo] of leftPositions) {
      if (!leftInfo?.isLeaf || !leftInfo.name) continue;

      // Parse split indices from key (format: "10" or "10-11-12")
      const splitIndices = key.split('-').map(Number).filter(n => !isNaN(n));
      if (splitIndices.length === 0) continue;

      // Check if this leaf's split is a subset of ANY marked component
      let isMarked = false;
      for (const component of markedComponents) {
        const markedSet = component instanceof Set ? component : new Set(component);
        const isSubset = splitIndices.every(leaf => markedSet.has(leaf));
        const isProperSubset = splitIndices.length <= markedSet.size && isSubset;
        if (isProperSubset) {
          isMarked = true;
          break;
        }
      }
      if (!isMarked) continue;

      const rightMatch = rightLeavesByName.get(leftInfo.name);
      if (!rightMatch) continue;

      const srcPos = [leftInfo.position[0], leftInfo.position[1], 0];
      const dstPos = [rightMatch.info.position[0], rightMatch.info.position[1], 0];

      // Get color from ColorManager
      const nodeForColor = leftInfo.node?.originalNode || leftInfo.node || leftInfo;
      const srcColorHex = colorManager?.getNodeColor?.(nodeForColor);
      const [r, g, b] = srcColorHex ? colorToRgb(srcColorHex) : [220, 40, 40];

      connections.push({
        id: `connector-${key}-${rightMatch.key}`,
        source: srcPos,
        target: dstPos,
        color: [r, g, b, Math.round(opacity * 255)]
      });
    }

    if (connections.length === 0) {
      return connectors;
    }

    // Calculate bundle points for edge bundling
    const srcBundlePoint = this._calculateRadialBundlePoint(connections.map(c => c.source), leftCenter);
    const dstBundlePoint = this._calculateRadialBundlePoint(connections.map(c => c.target), rightCenter);

    // Generate bundled paths
    connections.forEach((conn, idx) => {
      const path = this._buildBundledBezierPath(conn.source, conn.target, srcBundlePoint, dstBundlePoint);
      if (path.length) {
        connectors.push({
          ...conn,
          id: `${conn.id}-${idx}`,
          path,
          width: 1.5,
          jointRounded: true,
          capRounded: true
        });
      }
    });

    return connectors;
  }

  /**
   * Render static comparison mode with two separate trees.
   * @param {number} leftIndex - Left tree index
   * @param {number} rightIndex - Right tree index
   */
  async renderStatic(leftIndex, rightIndex) {
    const { treeList } = this.controller._getState();

    const clampedLeftIndex = this.controller._clampIndex(leftIndex);
    const clampedRightIndex = this.controller._clampIndex(rightIndex);

    const leftTreeData = treeList[clampedLeftIndex];
    const rightTreeData = treeList[clampedRightIndex];

    const leftLayout = this.controller.calculateLayout(leftTreeData, {
      treeIndex: clampedLeftIndex,
      updateController: true
    });

    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: clampedRightIndex,
      updateController: false
    });

    const leftLeaves = leftLayout.tree.leaves();
    const rightLeaves = rightLayout.tree.leaves();
    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      leftLayout,
      null,
      leftLeaves
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
    const viewOffset = this.controller._getViewOffset();
    const rightOffset = this._calculateRightOffset(canvasWidth, viewOffset);

    this._applyOffset(rightLayerData, rightOffset, viewOffset.y);

    // Build connectors between trees if views are linked
    const { viewsConnected } = this.controller._getState();
    const connectors = viewsConnected
      ? this._buildConnectors(
        null, // viewLinkMapping no longer used - kept for future movement direction visualization
        this._buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
        this._buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        [0, 0], // Left tree center
        [rightOffset, viewOffset.y] // Right tree center
      )
      : [];

    const combinedData = this._combineLayerData(leftLayerData, rightLayerData, connectors);

    const elements = [...combinedData.nodes, ...(combinedData.labels || [])];
    const bounds = this._calculateBounds(elements);

    // Auto-fit only when the tree pair changes, and respect global auto-fit setting
    const { playing, autoFitOnTreeChange } = this.controller._getState();
    const indicesKey = `${clampedLeftIndex}-${clampedRightIndex}`;

    if (!playing && autoFitOnTreeChange && Number.isFinite(bounds.minX) && this._lastFittedIndices !== indicesKey) {
      this.controller.deckManager.fitToBounds(bounds, {
        padding: 1.15,
        duration: 350,
        labels: combinedData.labels,
        getLabelSize: this.controller.layerManager.layerStyles.getLabelSize?.bind(
          this.controller.layerManager.layerStyles
        )
      });
      this._lastFittedIndices = indicesKey;
    }

    this.controller._updateLayersEfficiently(combinedData);
    this.controller.viewportManager.updateScreenPositions(leftLayerData.nodes);
  }

  /**
   * Render animated comparison mode with interpolated left tree and static right tree.
   * @param {Object} interpolatedData - Pre-computed interpolated data for left tree
   * @param {Object} rightTreeData - Right tree data
   * @param {number} rightIndex - Right tree index
   */
  async renderAnimated(interpolatedData, rightTreeData, rightIndex) {
    const rightLayout = this.controller.calculateLayout(rightTreeData, {
      treeIndex: rightIndex,
      updateController: false
    });

    const rightLeaves = rightLayout.tree.leaves();
    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii(
      rightLayout,
      null,
      rightLeaves
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
    const viewOffset = this.controller._getViewOffset();
    const rightOffset = this._calculateRightOffset(canvasWidth, viewOffset);

    this._applyOffset(rightLayerData, rightOffset, viewOffset.y);

    const { viewsConnected } = this.controller._getState();
    const connectors = viewsConnected
      ? this._buildConnectors(
        null, // viewLinkMapping no longer used - kept for future movement direction visualization
        this._buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
        this._buildPositionMap(rightLayerData.nodes, rightLayerData.labels),
        [0, 0], // Left tree center
        [rightOffset, viewOffset.y] // Right tree center
      )
      : [];

    const combinedData = {
      nodes: [...(interpolatedData.nodes || []), ...(rightLayerData.nodes || [])],
      links: [...(interpolatedData.links || []), ...(rightLayerData.links || [])],
      extensions: [...(interpolatedData.extensions || []), ...(rightLayerData.extensions || [])],
      labels: [...(interpolatedData.labels || []), ...(rightLayerData.labels || [])],
      connectors
    };

    this.controller._updateLayersEfficiently(combinedData);
    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes);
  }
}
