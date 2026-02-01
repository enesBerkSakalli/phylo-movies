/**
 * Factory for label dots layer - shows dots instead of text labels
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_ID_PREFIX } from '../../config/layerConfigs.js';
import { ScatterplotLayer } from '@deck.gl/layers';
import { getHistoryOffset, addZOffset, withSideSuffix } from '../../styles/labels/labelUtils.js';

// Scale factor to convert font size to dot radius (adjust as needed)
const FONT_SIZE_TO_DOT_RADIUS_SCALE = 0.25;

/**
 * Layer config for label dots
 */
const LABEL_DOTS_CONFIG = {
  id: `${LAYER_ID_PREFIX}-label-dots`,
  LayerClass: ScatterplotLayer,
  defaultProps: {
    radiusUnits: 'common',
    radiusMinPixels: 2,
    radiusMaxPixels: 12,
    stroked: true,
    lineWidthUnits: 'common',
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    billboard: true
  }
};

/**
 * Create label dots layer (dots at label positions when text is hidden)
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl ScatterplotLayer
 */
export function createLabelDotsLayer(labels, state, layerStyles) {
  if (!labels || labels.length === 0) return null;

  return createLayer(
    { ...LABEL_DOTS_CONFIG, id: withSideSuffix(LABEL_DOTS_CONFIG.id, labels) },
    getLabelDotsLayerProps(labels, state, layerStyles)
  );
}

/**
 * Build props for the label dots layer
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Object} props for ScatterplotLayer
 */
export function getLabelDotsLayerProps(labels, state, layerStyles) {
  const { taxaColorVersion, colorVersion, fontSize, highlightColorMode } = state || {};
  const cached = layerStyles.getCachedState();

  return {
    data: labels,
    pickable: true,
    getPosition: d => addZOffset(d.position, getHistoryOffset(cached, d)),
    // Scale dot radius based on label size (which uses fontSize from state)
    getRadius: d => layerStyles.getLabelSize(d, cached) * FONT_SIZE_TO_DOT_RADIUS_SCALE,
    getFillColor: d => layerStyles.getLabelColor(d, cached),
    // Black stroke outline
    getLineColor: [0, 0, 0, 255],
    getLineWidth: d => layerStyles.getLabelSize(d, cached) * FONT_SIZE_TO_DOT_RADIUS_SCALE * 0.15,
    updateTriggers: {
      getFillColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getPosition: [colorVersion],
      getRadius: [fontSize, colorVersion, taxaColorVersion],
      getLineWidth: [fontSize, colorVersion, taxaColorVersion]
    }
  };
}
