/**
 * Factory for labels layer
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS } from '../../layerConfigs.js';

/**
 * Create labels layer (text labels for leaf nodes)
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl TextLayer
 */
export function createLabelsLayer(labels, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.labels, getLabelsLayerProps(labels, state, layerStyles));
}

/**
 * Build props for the labels layer to enable base+clone reuse
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Object} props for TextLayer
 */
export function getLabelsLayerProps(labels, state, layerStyles) {
  const { taxaColorVersion, colorVersion, fontSize } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
    data: labels,
    pickable: true,
    getPosition: d => d.position,
    getText: d => d.text,
    getSize: d => layerStyles.getLabelSize(d.leaf, cached),
    getColor: d => layerStyles.getLabelColor(d.leaf, cached),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => d.rotation * (180 / Math.PI),
    getTextAnchor: d => d.textAnchor,
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion],
      getSize: [fontSize, colorVersion, taxaColorVersion],
      getAngle: labels.length,
      getTextAnchor: labels.length,
      getPosition: labels.length
    }
  };
}
