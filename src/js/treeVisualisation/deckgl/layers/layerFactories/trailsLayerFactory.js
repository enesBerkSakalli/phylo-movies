/**
 * Factory for motion trails layer
 */
import { createLayer } from './createLayer.js';
import { LAYER_CONFIGS } from '../layerConfigs.js';

/**
 * Create flow trails layer (fading path segments showing recent motion)
 *
 * @param {Array} trails - Trail data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer|null} deck.gl PathLayer or null if no trails
 */
export function createFlowTrailsLayer(trails, state, layerStyles) {
  if (!trails || trails.length === 0) return null;

  const { trailThickness, strokeWidth, highlightVersion, taxaColorVersion } = state;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.trails, {
    data: trails,
    getPath: d => d.path,
    getWidth: () => Math.max(1, (strokeWidth || 3) * (trailThickness || 0.5)),
    getColor: d => {
      // Base color from node/label, then apply age-based alpha factor
      let rgba;
      if (d.kind === 'label') {
        rgba = layerStyles.getLabelColor(d.leaf, cached);
      } else {
        rgba = layerStyles.getNodeColor(d.node, cached);
      }
      const alphaFactor = d.alphaFactor ?? 0.5;
      const a = Math.max(0, Math.min(255, Math.round(((rgba[3] ?? 255)) * alphaFactor)));
      return [rgba[0], rgba[1], rgba[2], a];
    },
    updateTriggers: {
      getColor: [strokeWidth, highlightVersion, taxaColorVersion],
      getWidth: [strokeWidth, trailThickness]
    }
  });
}
