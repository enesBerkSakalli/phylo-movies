/**
 * Factory for labels layer
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS, LAYER_ID_PREFIX } from '../../config/layerConfigs.js';
import {
  SOURCE_LABEL_SCALE,
  DESTINATION_LABEL_SCALE,
  SOURCE_FONT_WEIGHT,
  DESTINATION_FONT_WEIGHT,
  SOURCE_ALPHA_SCALE,
  DESTINATION_ALPHA_SCALE,
  LABEL_HIGHLIGHT_Z_OFFSET,
  SOURCE_TEXT_PREFIX,
  DESTINATION_TEXT_SUFFIX
} from '../../config/LabelConfig.js';


import {
  getHistoryOffset,
  addZOffset,
  boostAlpha,
  isLabelSource,
  isLabelDestination,
  isSourceOrDestinationLabel,
  withSideSuffix,
  normalizeTextAnchor
} from '../../styles/labels/labelUtils.js';


/**
 * Create labels layer (text labels for leaf nodes)
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl TextLayer
 */
export function createLabelsLayer(labels, state, layerStyles) {
  return createLayer(
    { ...LAYER_CONFIGS.labels, id: withSideSuffix(LAYER_CONFIGS.labels.id, labels) },
    getLabelsLayerProps(labels, state, layerStyles)
  );
}

export function createSourceLabelsLayer(labels, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  const sourceLabels = labels.filter(
    (label) => isLabelSource(cached, label) && !isLabelDestination(cached, label)
  );
  if (!sourceLabels.length) return null;
  return createLayer(
    {
      ...LAYER_CONFIGS.labels,
      id: withSideSuffix(`${LAYER_ID_PREFIX}-labels-source`, sourceLabels)
    },
    getHighlightLabelsLayerProps(sourceLabels, state, layerStyles, cached, {
      sizeScale: SOURCE_LABEL_SCALE,
      fontWeight: SOURCE_FONT_WEIGHT,
      alphaScale: SOURCE_ALPHA_SCALE,
      textPrefix: SOURCE_TEXT_PREFIX
    })
  );
}

export function createDestinationLabelsLayer(labels, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  const destinationLabels = labels.filter((label) => isLabelDestination(cached, label));
  if (!destinationLabels.length) return null;
  return createLayer(
    {
      ...LAYER_CONFIGS.labels,
      id: withSideSuffix(`${LAYER_ID_PREFIX}-labels-destination`, destinationLabels)
    },
    getHighlightLabelsLayerProps(destinationLabels, state, layerStyles, cached, {
      sizeScale: DESTINATION_LABEL_SCALE,
      fontWeight: DESTINATION_FONT_WEIGHT,
      alphaScale: DESTINATION_ALPHA_SCALE,
      textSuffix: DESTINATION_TEXT_SUFFIX
    })
  );
}

/**
 * Build props for the labels layer to enable base+clone reuse
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Object} props for TextLayer
 */
export function getHighlightLabelsLayerProps(labels, state, layerStyles, cached, options) {
  const { taxaColorVersion, colorVersion, fontSize, highlightColorMode } = state || {};
  const {
    sizeScale = 1,
    fontWeight,
    alphaScale = 1,
    textPrefix = '',
    textSuffix = ''
  } = options;

  return {
    data: labels,
    pickable: true,
    fontWeight: fontWeight || 'bold',  // Bold to match node visual intensity
    getPosition: d =>
      addZOffset(d.position, getHistoryOffset(cached, d) + LABEL_HIGHLIGHT_Z_OFFSET),
    getText: d => `${textPrefix}${d.text || ''}${textSuffix}`,
    getSize: d => layerStyles.getLabelSize(d, cached) * sizeScale,
    getColor: d => boostAlpha(layerStyles.getLabelColor(d, cached), alphaScale),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: d => normalizeTextAnchor(d.textAnchor),

    // SDF disabled - bitmap fonts render cleaner at small sizes when zoomed out
    characterSet: 'auto',
    fontSettings: {
      sdf: false
    },

    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getSize: [fontSize, colorVersion, taxaColorVersion],
      getPosition: [colorVersion]
    }
  };
}

export function getLabelsLayerProps(labels, state, layerStyles) {
  const { taxaColorVersion, colorVersion, fontSize, highlightColorMode } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();
  // Render all labels in single layer (source/destination styling handled conditionally)

  return {
    data: labels,
    pickable: true,
    fontWeight: 'bold',  // Bold to match node visual intensity
    getPosition: d => addZOffset(d.position, getHistoryOffset(cached, d)),
    getText: d => d.text,
    getSize: d => layerStyles.getLabelSize(d, cached),
    getColor: d => {
      const color = layerStyles.getLabelColor(d, cached);
      return color;
    },
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: d => normalizeTextAnchor(d.textAnchor),

    // SDF disabled - bitmap fonts render cleaner at small sizes when zoomed out
    characterSet: 'auto',
    fontSettings: {
      sdf: false
    },

    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getSize: [fontSize, colorVersion, taxaColorVersion],
      getPosition: [colorVersion]
    }
  };
}
