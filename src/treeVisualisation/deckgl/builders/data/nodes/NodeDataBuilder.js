import { getNodeKey } from '../../../../utils/KeyGenerator.js';
import { NodeGeometryBuilder } from '../../geometry/nodes/NodeGeometryBuilder.js';

/**
 * NodeDataBuilder - Converts D3 hierarchy nodes to Deck.gl format
 * Handles node coordinate validation, sizing, and polar data preparation.
 */
export class NodeDataBuilder {
  constructor() {
    this.geometryBuilder = new NodeGeometryBuilder();
  }

  /**
   * Convert D3 hierarchy tree to Deck.gl node data
   * @param {Object} tree - D3 hierarchy root
   * @param {Object} options - Configuration options for sizing
   * @returns {Array} Array of Deck.gl node objects
   */
  convertNodes(tree, options = {}) {
    const nodeDotSizes = this.geometryBuilder.calculateNodeDotSizes(tree, options);
    return tree.descendants().map(node => this._createNodeData(node, nodeDotSizes));
  }

  /**
   * Create single node data object
   * @private
   */
  _createNodeData(node, nodeDotSizes) {
    const nodeKey = getNodeKey(node);
    const dotSize = nodeDotSizes?.get(nodeKey) || 2;

    return {
      id: nodeKey,
      position: [node.x || 0, node.y || 0, 0],
      dotSize: dotSize,
      isLeaf: !node.children,
      isInternal: !!node.children,
      data: node.data,
      depth: node.depth,
      height: node.height,
      angle: node.rotatedAngle != null ? node.rotatedAngle : (node.angle || 0),
      polarPosition: node.radius,
      // Pass split_indices for movement analysis matching
      split_indices: node.data.split_indices,
      // Store reference to original node for ColorManager access
      originalNode: node
    };
  }


}
