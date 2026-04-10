import { INNER_NODE_STROKE_WIDTH, OUTER_NODE_STROKE_WIDTH } from '@/core/treeVisualisation/deckgl/layers/config/layerConfigs.js';
import { toColorManagerNode } from '@/core/treeVisualisation/deckgl/layers/styles/nodes/nodeUtils.js';

/**
 * Calculates node line width (stroke/border thickness)
 *
 * @param {Object} node - Node data object
 * @param {Object} cached - Cached state
 * @returns {number} Stroke width in pixels
 */
export function getNodeLineWidth(node, cached) {
  const nodeData = toColorManagerNode(node);

  // Outer nodes are leaves
  const isOuter = node.leaf || (node.children && node.children.length === 0);

  return isOuter ? OUTER_NODE_STROKE_WIDTH : INNER_NODE_STROKE_WIDTH;
}
