/**
 * Factory for connectors layer (lines between trees in comparison mode)
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS } from '../../layerConfigs.js';

/**
 * Create connectors layer (lines between trees)
 *
 * @param {Array} connectors - Connector data array
 * @param {Object} state - Store state snapshot
 * @returns {Layer|null} deck.gl PathLayer or null if no connectors
 */
export function getConnectorsLayerProps(connectors, state) {
  const { linkConnectionOpacity, colorVersion } = state || {};

  return {
    data: connectors,
    getPath: d => d.path,
    getWidth: d => d.width || (d.isLeafToLeaf ? 2 : 1),
    getColor: d => {
      const baseColor = d.color || (d.isLeafToLeaf ? [70, 130, 220] : [150, 150, 150]);
      const alpha = Math.round((linkConnectionOpacity ?? 0.6) * 255);
      return [baseColor[0], baseColor[1], baseColor[2], alpha];
    },
    updateTriggers: {
      getPath: connectors.length,
      getWidth: connectors.length,
      getColor: [connectors.length, linkConnectionOpacity, colorVersion]
    }
  };
}

export function createConnectorsLayer(connectors, state) {
  // If connectors empty, create an empty layer with no data (avoids nulls for base layers)
  const safeConnectors = connectors || [];
  return createLayer(LAYER_CONFIGS.connectors, getConnectorsLayerProps(safeConnectors, state));
}
