/**
 * Factory for connectors layer (lines between trees in comparison mode)
 */
import { safeDeckPath } from '../../../utils/pathFormat.js';

/**
 * Create connectors layer (lines between trees)
 *
 * @param {Array} connectors - Connector data array
 * @param {Object} state - Store state snapshot
 * @returns {Layer|null} deck.gl PathLayer or null if no connectors
 */
export function getConnectorsLayerProps(connectors, state) {
  const { linkConnectionOpacity, colorVersion, taxaColorVersion, connectorStrokeWidth } =
    state || {};

  return {
    data: connectors,
    getPath: (d) => safeDeckPath(d.path),
    widthUnits: 'pixels',
    // Every connector carries its own RGBA color and base width (see ConnectorPathBuilder).
    getWidth: (d) => d.width * connectorStrokeWidth,
    getColor: (d) => d.color,
    updateTriggers: {
      getPath: [connectors],
      getWidth: [connectors.length, connectorStrokeWidth],
      getColor: [connectors.length, linkConnectionOpacity, colorVersion, taxaColorVersion],
    },
  };
}
