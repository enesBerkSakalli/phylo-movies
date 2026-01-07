import { getNodeKey } from '../../utils/KeyGenerator.js';

/**
 * Handles conversion of D3 hierarchy nodes to Deck.gl layer format
 * Manages node coordinate validation and polar coordinate export
 */
export class NodeConverter {
  constructor() {
    // Node converter doesn't need instance state currently
  }

  /**
   * Convert nodes from D3 hierarchy to Deck.gl format
   */
  convertNodes(tree, adaptiveRadii) {
    return tree.descendants().map(node => this.createNodeData(node, adaptiveRadii));
  }

  /**
   * Create node data object from D3 hierarchy node
   */
  createNodeData(node, adaptiveRadii) {
    if (this._hasInvalidCoordinates(node)) {
      console.warn('[NodeConverter] Found NaN coordinates:', node);
      return this._createInvalidNodeData(node, adaptiveRadii);
    }

    const nodeKey = getNodeKey(node);
    const adaptiveRadius = adaptiveRadii?.get(nodeKey) || 2;

    return {
      id: nodeKey,
      position: [node.x || 0, node.y || 0, 0],
      radius: adaptiveRadius,
      isLeaf: !node.children,
      isInternal: !!node.children,
      data: node.data,
      depth: node.depth,
      height: node.height,
      angle: node.rotatedAngle != null ? node.rotatedAngle : (node.angle || 0),
      polarRadius: node.radius,
      // Pass split_indices for movement analysis matching
      split_indices: node.data.split_indices,
      // Store reference to original node for ColorManager access
      originalNode: node
    };
  }

  /**
   * Create node data for invalid coordinates
   * @private
   */
  _createInvalidNodeData(node, adaptiveRadii) {
    const nodeKey = getNodeKey(node);
    const adaptiveRadius = adaptiveRadii?.get(nodeKey) || 2;

    return {
      id: nodeKey,
      position: [0, 0, 0],
      radius: adaptiveRadius,
      isLeaf: !node.children,
      isInternal: !!node.children,
      data: node.data,
      depth: node.depth,
      height: node.height,
      hasInvalidPosition: true,
      // Export polar coordinates for radial interpolation (fallback values)
      angle: node.angle || 0,
      polarRadius: node.radius || 0,
      // Store reference to original node for ColorManager access
      originalNode: node
    };
  }

  /**
   * Check if node has invalid coordinates
   * @private
   */
  _hasInvalidCoordinates(node) {
    return isNaN(node.x) || isNaN(node.y);
  }
}
