/**
 * Factory for extension-related layers
 * - Leaf Extensions (Dotted lines from leaves to alignment edge)
 */
import { addZOffsetToPath, getNodeHistoryZOffset } from '../../../utils/GeometryUtils.js';

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// LAYER: Extensions
// ============================================================================

export function getExtensionsLayerProps(extensions, state, layerStyles) {
  const { taxaColorVersion, colorVersion, strokeWidth, highlightColorMode, metricScale } = state || {};
  const cached = layerStyles.getCachedState(state);

  return {
    data: extensions,
    pickable: false,
    getPath: d => addZOffsetToPath(d.path, getNodeHistoryZOffset(cached, d)),
    getColor: d => layerStyles.getExtensionColor(d, cached),
    getWidth: d => layerStyles.getExtensionWidth(d, cached),
    getDashArray: [2, 3], // Dotted line
    dashJustified: true,
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getPath: [extensions, colorVersion],
      getWidth: [extensions.length, strokeWidth, colorVersion, metricScale]
    }
  };
}
