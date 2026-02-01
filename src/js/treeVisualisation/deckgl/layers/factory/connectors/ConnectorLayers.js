/**
 * Factory for connectors layer (lines between trees in comparison mode)
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS } from '../../config/layerConfigs.js';

/**
 * Create connectors layer (lines between trees)
 *
 * @param {Array} connectors - Connector data array
 * @param {Object} state - Store state snapshot
 * @returns {Layer|null} deck.gl PathLayer or null if no connectors
 */
export function getConnectorsLayerProps(connectors, state) {
  const { linkConnectionOpacity, colorVersion, connectorStrokeWidth } = state || {};

  return {
    data: connectors,
    getPath: d => d.path,
    widthUnits: 'pixels',
    widthMinPixels: 1,
    getWidth: d => {
      // Base width is d.width or defaults
      // Scale it by the global connectorStrokeWidth setting relative to a default base of 2px
      const baseWidth = d.width || (d.isLeafToLeaf ? 2 : 1);
      const scaleFactor = (connectorStrokeWidth || 1) / 1;
      return baseWidth * scaleFactor;
    },
    getColor: d => {
      const baseColor = d.color || (d.isLeafToLeaf ? [70, 130, 220] : [150, 150, 150]);
      // If baseColor has 4 components, use its alpha (unless overridden)
      // For active edges, we want them to pop, so we use their assigned alpha.
      // For others, we apply global opacity.

      // Apply global opacity to ALL connectors, including active/moving ones
      // This allows the slider to control visibility of highlighted elements as well
      const alpha = Math.round((linkConnectionOpacity ?? 0.6) * 255);
      return [baseColor[0], baseColor[1], baseColor[2], alpha];
    },
    updateTriggers: {
      getPath: connectors.length,
      getWidth: [connectors.length, connectorStrokeWidth],
      getColor: [connectors.length, linkConnectionOpacity, colorVersion]
    }
  };
}

export function createConnectorsLayer(connectors, state) {
  return createLayer(LAYER_CONFIGS.connectors, getConnectorsLayerProps(connectors, state));
}
