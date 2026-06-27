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
    const position = normalizeNodePosition(node);
    if (!position) {
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
      position,
      renderPosition: [position[0], position[1], position[2] + Z_NODE],
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
      projectionMode: node.projectionMode,
      h3Direction: node.h3Direction,
      h3Distance: node.h3Distance,
      split_indices: splitIndices,
      splitKey,
      child_split_indices: node.child_split_indices,
    };
  }
}

function normalizeNodePosition(node) {
  if (!node) return null;

  const rawPosition = node.position;
  const x = Number(
    Array.isArray(rawPosition) || ArrayBuffer.isView(rawPosition) ? rawPosition[0] : node.x
  );
  const y = Number(
    Array.isArray(rawPosition) || ArrayBuffer.isView(rawPosition) ? rawPosition[1] : node.y
  );
  const z = Number(
    Array.isArray(rawPosition) || ArrayBuffer.isView(rawPosition) ? rawPosition[2] : node.z
  );

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y, Number.isFinite(z) ? z : 0];
}
