/**
 * Factory for nodes layer
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR, MIN_NODE_RADIUS, HISTORY_Z_OFFSET } from '../../layerConfigs.js';

const getHistoryOffset = (cached, node) =>
  cached?.colorManager?.isNodeHistorySubtree?.(node) ? HISTORY_Z_OFFSET : 0;

const addZOffset = (position, offset) => {
  if (!offset) return position;
  return [position[0], position[1], (position[2] || 0) + offset];
};

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
 * Build props for the nodes layer so callers can reuse base instances via clone
 *
 * @param {Array} nodes - Node data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Object} props for ScatterplotLayer
 */
export function getNodesLayerProps(nodes = [], state, layerStyles) {
  const { taxaColorVersion, colorVersion, nodeSize, upcomingChangesEnabled, highlightColorMode } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
    data: nodes,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPosition: d => {
      const p = d?.position;
      const x = p?.[0] ?? 0;
      const y = p?.[1] ?? 0;
      const z = p?.[2] ?? 0;
      return addZOffset([x, y, z], getHistoryOffset(cached, d));
    },
    getRadius: d => layerStyles.getNodeRadius(d, MIN_NODE_RADIUS, cached),
    getFillColor: d => layerStyles.getNodeColor(d, cached),
    getLineColor: d => layerStyles.getNodeBorderColor(d, cached),
    updateTriggers: {
      getFillColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled, highlightColorMode],
      getLineColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled, highlightColorMode],
      getPosition: [colorVersion],
      getRadius: [nodeSize, colorVersion]
    }
  };
}
