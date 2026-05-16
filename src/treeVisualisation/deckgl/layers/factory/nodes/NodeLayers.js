/**
 * Factory for nodes layer
 */
import { createLayer } from '../base/createLayer.js';
import { selectLeafNamesByIndex } from '../../../../../state/phyloStore/selectors/treeSelectors.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR, MIN_NODE_RADIUS } from '../../config/layerConfigs.js';
import { getNodeHistoryZOffset } from '../../../utils/GeometryUtils.js';

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
  const { taxaColorVersion, colorVersion, nodeSize, upcomingChangesEnabled, highlightColorMode, metricScale } = state || {};
  const taxaCount = selectLeafNamesByIndex(state).length;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState(state);

  return {
    data: nodes,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPosition: d => {
      const p = d?.position;
      if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        throw new Error('Invalid node layer data: position must contain finite x/y values');
      }

      const historyOffset = getNodeHistoryZOffset(cached, d);
      if (!historyOffset) {
        return d.renderPosition;
      }

      return addZOffset(d.renderPosition, historyOffset);
    },
    getRadius: d => layerStyles.getNodeRadius(d, MIN_NODE_RADIUS, cached),
    getFillColor: d => layerStyles.getNodeColor(d, cached),
    getLineColor: d => layerStyles.getNodeBorderColor(d, cached),
    getLineWidth: d => layerStyles.getNodeLineWidth(d, cached),
    updateTriggers: {
      getFillColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled, highlightColorMode],
      getLineColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled, highlightColorMode],
      getPosition: [colorVersion],
      getRadius: [nodeSize, colorVersion, metricScale, taxaCount]
    }
  };
}
