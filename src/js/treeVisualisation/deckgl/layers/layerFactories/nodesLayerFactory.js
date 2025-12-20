/**
 * Factory for nodes layer
 */
import { createLayer } from './createLayer.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR, MIN_NODE_RADIUS } from '../layerConfigs.js';

/**
 * Create nodes layer (scatter plot for tree nodes)
 *
 * @param {Array} nodes - Node data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl ScatterplotLayer
 */
export function createNodesLayer(nodes, state, layerStyles) {
  const { taxaColorVersion, highlightVersion, nodeSize } = state;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.nodes, {
    data: nodes,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPosition: d => d.position,
    getRadius: d => layerStyles.getNodeRadius(d, MIN_NODE_RADIUS, cached),
    getFillColor: d => layerStyles.getNodeColor(d, cached),
    getLineColor: d => layerStyles.getNodeBorderColor(d, cached),
    updateTriggers: {
      getFillColor: [highlightVersion, taxaColorVersion],
      getLineColor: highlightVersion,
      getPosition: nodes.length,
      getRadius: [nodes.length, nodeSize, highlightVersion] // Added highlightVersion for radius boost
    }
  });
}
