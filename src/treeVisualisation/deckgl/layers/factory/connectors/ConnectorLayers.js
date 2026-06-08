/**
 * Factory for connectors layer (lines between trees in comparison mode)
 */
import { safeDeckPath } from '../../../utils/pathFormat.js';

// Reusable output buffer to avoid per-call array allocations
const _connColorOut = [0, 0, 0, 0];

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
    getPath: (d) => safeDeckPath(d.path),
    widthUnits: 'pixels',
    widthMinPixels: 1,
    getWidth: (d) => {
      // Base width is d.width or defaults
      // Scale it by the global connectorStrokeWidth setting relative to a default base of 2px
      const baseWidth = d.width || (d.isLeafToLeaf ? 2 : 1);
      const scaleFactor = (connectorStrokeWidth || 1) / 1;
      return baseWidth * scaleFactor;
    },
    getColor: (d) => {
      const baseColor = d.color || (d.isLeafToLeaf ? [70, 130, 220] : [150, 150, 150]);
      const alpha =
        Array.isArray(baseColor) && Number.isFinite(baseColor[3])
          ? baseColor[3]
          : Math.round((linkConnectionOpacity ?? 0.6) * 255);
      _connColorOut[0] = baseColor[0];
      _connColorOut[1] = baseColor[1];
      _connColorOut[2] = baseColor[2];
      _connColorOut[3] = alpha;
      return _connColorOut;
    },
    updateTriggers: {
      getPath: [connectors],
      getWidth: [connectors.length, connectorStrokeWidth],
      getColor: [connectors.length, linkConnectionOpacity, colorVersion],
    },
  };
}
