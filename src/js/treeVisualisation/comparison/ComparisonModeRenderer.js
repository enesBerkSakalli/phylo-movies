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
   * @returns {Object} Combined layer data
   */
  _combineLayerData(leftData, rightData) {
    return {
      nodes: [...leftData.nodes, ...rightData.nodes],
      links: [...(leftData.links || []), ...(rightData.links || [])],
      extensions: [...(leftData.extensions || []), ...(rightData.extensions || [])],
      labels: [...(leftData.labels || []), ...(rightData.labels || [])],
      trails: leftData.trails || []
    };
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

    const combinedData = this._combineLayerData(leftLayerData, rightLayerData);

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

    const combinedData = {
      nodes: [...(interpolatedData.nodes || []), ...(rightLayerData.nodes || [])],
      links: [...(interpolatedData.links || []), ...(rightLayerData.links || [])],
      extensions: [...(interpolatedData.extensions || []), ...(rightLayerData.extensions || [])],
      labels: [...(interpolatedData.labels || []), ...(rightLayerData.labels || [])],
      trails: interpolatedData.trails || []
    };

    this.controller._updateLayersEfficiently(combinedData);
    this.controller.viewportManager.updateScreenPositions(interpolatedData.nodes);
  }
}
