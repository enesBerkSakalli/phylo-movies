import { colorToRgb } from '../../services/ui/colorUtils.js';
import { Bezier } from 'bezier-js';

/**
 * ComparisonModeRenderer
 *
 * Handles rendering logic for side-by-side tree comparison mode.
 * Manages layout positioning, spacing, and data combination for dual-tree visualization.
 */
export class ComparisonModeRenderer {
  constructor(controller) {
    this.controller = controller;
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
      trails: leftData.trails || [],
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
   * Build simple straight connectors using backend mapping.
   */
  _buildConnectors(viewLinkMapping, leftPositions, rightPositions) {
    const connectors = [];
    const mapping = viewLinkMapping?.sourceToDest || viewLinkMapping;
    if (!mapping || Object.keys(mapping).length === 0) {
      console.warn('[ComparisonModeRenderer] No viewLinkMapping provided; skipping connectors');
      return connectors;
    }

    console.log('[ComparisonModeRenderer] Building connectors', {
      mappingKeys: Object.keys(mapping).length,
      leftPositions: leftPositions.size,
      rightPositions: rightPositions.size
    });

    const moversSet = new Set(viewLinkMapping?.movers || []);
    const moverLeaves = new Set(viewLinkMapping?.moverLeafIds || []);
    const colorManager = this.controller._getState()?.colorManager;

    const rightLeavesByName = new Map();
    for (const [key, info] of rightPositions) {
      if (info?.isLeaf && info.name) {
        rightLeavesByName.set(info.name, { key, info });
      }
    }

    let connectorIdx = 0;

    Object.entries(mapping || {}).forEach(([rawSrcKey, rawDstKeys]) => {
      const srcKey = Array.isArray(rawSrcKey) ? rawSrcKey.join('-') : String(rawSrcKey || '');
      if (!srcKey || !rawDstKeys) return;
      if (moversSet.size && !moversSet.has(srcKey)) return;

      const srcIdsAll = srcKey.split('-').filter(Boolean);
      const srcIds = moverLeaves.size ? srcIdsAll.filter((id) => moverLeaves.has(Number(id))) : srcIdsAll;
      const destinations = Array.isArray(rawDstKeys) ? rawDstKeys : [rawDstKeys];

      const allowedNames = new Set();
      destinations.forEach((dstKeyRaw) => {
        const dstKey = Array.isArray(dstKeyRaw) ? dstKeyRaw.join('-') : String(dstKeyRaw || '');
        const dstIdsAll = dstKey.split('-').filter(Boolean);
        const dstIds = moverLeaves.size ? dstIdsAll.filter((id) => moverLeaves.has(Number(id))) : dstIdsAll;
        dstIds.forEach((id) => {
          const info = rightPositions.get(id);
          if (info?.isLeaf && info.name) allowedNames.add(info.name);
        });
      });

      srcIds.forEach(splitIdx => {
        const info = leftPositions.get(splitIdx);
        if (info && info.isLeaf && info.name) {
          if (!allowedNames.has(info.name)) return;
          const rightMatch = rightLeavesByName.get(info.name);
          if (rightMatch) {
            const srcPos = [info.position[0], info.position[1], 0];
            const dstPos = [rightMatch.info.position[0], rightMatch.info.position[1], 0];
            const path = this._buildBezierPath(srcPos, dstPos);
            if (!path.length) return;
            const srcColorHex = colorManager?.getNodeColor ? colorManager.getNodeColor(info.node || info) : null;
            const [r, g, b] = srcColorHex ? colorToRgb(srcColorHex) : [220, 40, 40];
            connectors.push({
              id: `connector-${splitIdx}-${rightMatch.key}-${connectorIdx++}`,
              source: srcPos,
              target: dstPos,
              path,
              color: [r, g, b, 160],
              width: 1.5,
              jointRounded: true,
              capRounded: true
            });
          }
        }
      });
    });

    console.log('[ComparisonModeRenderer] Built connector count', connectors.length);
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
      rightLayout,
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

    leftLayerData.trails = this.controller._buildFlowTrails(leftLayerData.nodes, leftLayerData.labels);
    rightLayerData.trails = [];

    // Build connectors (straight lines) from backend mapping if views are linked
    const { viewsConnected, viewLinkMapping } = this.controller._getState();
    const connectors = (viewsConnected && viewLinkMapping && Object.keys(viewLinkMapping).length > 0)
      ? this._buildConnectors(
          viewLinkMapping,
          this._buildPositionMap(leftLayerData.nodes, leftLayerData.labels),
          this._buildPositionMap(rightLayerData.nodes, rightLayerData.labels)
        )
      : [];

    const combinedData = this._combineLayerData(leftLayerData, rightLayerData, connectors);

    const elements = [...combinedData.nodes, ...(combinedData.labels || [])];
    const bounds = this._calculateBounds(elements);

    if (Number.isFinite(bounds.minX)) {
      const inView = this.controller._areBoundsInView(bounds);
      if (!inView) {
        this.controller.deckManager.fitToBounds(bounds, {
          padding: 1.15,
          duration: 350,
          labels: combinedData.labels,
          getLabelSize: this.controller.layerManager.layerStyles.getLabelSize?.bind(
            this.controller.layerManager.layerStyles
          )
        });
      }
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

    const { viewsConnected, viewLinkMapping } = this.controller._getState();
    const connectors = (viewsConnected && viewLinkMapping && Object.keys(viewLinkMapping).length > 0)
      ? this._buildConnectors(
          viewLinkMapping,
          this._buildPositionMap(interpolatedData.nodes, interpolatedData.labels),
          this._buildPositionMap(rightLayerData.nodes, rightLayerData.labels)
        )
      : [];

    const combinedData = {
      nodes: [...(interpolatedData.nodes || []), ...(rightLayerData.nodes || [])],
      links: [...(interpolatedData.links || []), ...(rightLayerData.links || [])],
      extensions: [...(interpolatedData.extensions || []), ...(rightLayerData.extensions || [])],
      labels: [...(interpolatedData.labels || []), ...(rightLayerData.labels || [])],
      trails: interpolatedData.trails || [],
      connectors
    };

    this.controller._updateLayersEfficiently(combinedData);
    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes);
  }
}
