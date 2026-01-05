/**
 * Factory for nodes layer
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR, MIN_NODE_RADIUS } from '../../layerConfigs.js';

/**
 * Create nodes layer (scatter plot for tree nodes)
 *
 * @param {Array} nodes - Node data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl ScatterplotLayer
 */
export function createNodesLayer(nodes, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.nodes, getNodesLayerProps(nodes, state, layerStyles));
}

/**
 * Create ghost nodes layer (for move destination visualization)
 *
 * @param {Array} nodes - Node data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl ScatterplotLayer
 */
export function createGhostNodesLayer(nodes, state, layerStyles) {
  const props = getNodesLayerProps(nodes, state, layerStyles);
  return createLayer({ ...LAYER_CONFIGS.nodes, id: 'ghost-nodes' }, {
    ...props,
    pickable: false,
    autoHighlight: false,
    updateTriggers: {
      ...props.updateTriggers,
      getPosition: [nodes.length, nodes[0]?.id]
    }
  });
}

/**
 * Build props for the nodes layer so callers can reuse base instances via clone
 *
 * @param {Array} nodes - Node data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Object} props for ScatterplotLayer
 */
export function getNodesLayerProps(nodes, state, layerStyles) {
  const { taxaColorVersion, colorVersion, nodeSize, upcomingChangesEnabled } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
    data: nodes,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPosition: d => d.position,
    getRadius: d => layerStyles.getNodeRadius(d, MIN_NODE_RADIUS, cached),
    getFillColor: d => layerStyles.getNodeColor(d, cached),
    getLineColor: d => layerStyles.getNodeBorderColor(d, cached),
    updateTriggers: {
      getFillColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled],
      getLineColor: [colorVersion, upcomingChangesEnabled],
      getPosition: nodes.length,
      getRadius: [nodes.length, nodeSize, colorVersion]
    }
  };
}
