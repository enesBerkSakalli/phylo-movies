import { getSplitKey } from '../../../../../domain/tree/splits.js';
import { NodeGeometryBuilder } from '../../geometry/nodes/NodeGeometryBuilder.js';
import { Z_NODE } from '../../../constants/zOffsets.js';

/**
 * NodeDataBuilder - Converts normalized layout nodes to Deck.gl format
 * Handles node coordinate validation, sizing, and polar data preparation.
 */
export class NodeDataBuilder {
  constructor() {
    this.geometryBuilder = new NodeGeometryBuilder();
  }

  /**
   * Convert layout nodes to Deck.gl node data
   * @param {Array} nodes - Normalized layout nodes
   * @param {Object} options - Configuration options for sizing
   * @returns {Array} Array of Deck.gl node objects
   */
  convertNodes(nodes, options) {
    const nodeDotSizes = this.geometryBuilder.calculateNodeDotSizes(nodes, options);
    return nodes.map((node) => this._createNodeData(node, nodeDotSizes)).filter(Boolean);
  }

  /**
   * Create single node data object
   * @private
   */
  _createNodeData(node, nodeDotSizes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      console.warn(
        '[NodeDataBuilder] Skipping node with invalid layout coordinates:',
        node.split_indices
      );
      return null;
    }

    const splitIndices = node.split_indices;
    const nodeKey = node.id;
    if (!nodeKey) {
      console.warn('[NodeDataBuilder] Skipping node without normalized id:', node.name);
      return null;
    }
    const dotSize = nodeDotSizes.get(nodeKey);
    const splitKey = node.splitKey || getSplitKey({ split_indices: splitIndices });

    const isLeaf = node.isLeaf === true;

    return {
      id: nodeKey,
      parentId: node.parentId,
      position: [node.x, node.y, 0],
      renderPosition: [node.x, node.y, Z_NODE],
      dotSize: dotSize,
      isLeaf,
      isInternal: !isLeaf,
      name: node.name,
      length: node.length,
      metricBranchLength: node.metricBranchLength,
      visualBranchLength: node.visualBranchLength,
      annotations: node.annotations ?? null,
      ...(Number.isFinite(node.opacity) ? { opacity: node.opacity } : {}),
      ...(node.isEntering === true ? { isEntering: true } : {}),
      ...(node.isExiting === true ? { isExiting: true } : {}),
      ...(node.lifecycle ? { lifecycle: node.lifecycle } : {}),
      ...(Number.isFinite(node.transitionPhase) ? { transitionPhase: node.transitionPhase } : {}),
      depth: node.depth,
      height: node.height,
      angle: node.angle,
      polarPosition: node.radius,
      split_indices: splitIndices,
      splitKey,
      child_split_indices: node.child_split_indices,
    };
  }
}
