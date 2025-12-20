/**
 * Factory for labels layer
 */
import { createLayer } from './createLayer.js';
import { LAYER_CONFIGS } from '../layerConfigs.js';

/**
 * Create labels layer (text labels for leaf nodes)
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl TextLayer
 */
export function createLabelsLayer(labels, state, layerStyles) {
  const { taxaColorVersion, highlightVersion, fontSize } = state;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.labels, {
    data: labels,
    getPosition: d => d.position,
    getText: d => d.text,
    getSize: () => layerStyles.getLabelSize(),
    getColor: d => layerStyles.getLabelColor(d.leaf, cached),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => d.rotation * (180 / Math.PI),
    getTextAnchor: d => d.textAnchor,
    updateTriggers: {
      getColor: [highlightVersion, taxaColorVersion],
      getSize: fontSize,
      getAngle: labels.length,
      getTextAnchor: labels.length,
      getPosition: labels.length
    }
  });
}
