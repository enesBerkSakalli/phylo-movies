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
 * Single-pass partitioning of labels into source and destination categories.
 * Avoids the O(2n) cost of calling filter() twice on the same array.
 *
 * @param {Array} labels - Label data array
 * @param {Object} cached - Cached state from layerStyles
 * @returns {{ source: Array, destination: Array }} Partitioned labels
 */
export function partitionLabels(labels, cached) {
  const source = [];
  const destination = [];

  for (let i = 0, len = labels.length; i < len; i++) {
    const label = labels[i];
    const isDest = isLabelDestination(cached, label);
    const isSrc = isLabelSource(cached, label);

    if (isDest) {
      destination.push(label);
    } else if (isSrc) {
      source.push(label);
    }
    // Labels that are neither source nor destination are not included in either array
  }

  return { source, destination };
}

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

/**
 * Create both source and destination label layers in a single pass.
 * More efficient than calling createSourceLabelsLayer + createDestinationLabelsLayer separately.
 *
 * @param {Array} labels - Label data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {{ sourceLayer: Layer|null, destinationLayer: Layer|null }}
 */
export function createHighlightLabelLayers(labels, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  const { source, destination } = partitionLabels(labels, cached);

  const sourceLayer = source.length > 0
    ? createLayer(
        {
          ...LAYER_CONFIGS.labels,
          id: withSideSuffix(`${LAYER_ID_PREFIX}-labels-source`, source)
        },
        getHighlightLabelsLayerProps(source, state, layerStyles, cached, {
          sizeScale: SOURCE_LABEL_SCALE,
          fontWeight: SOURCE_FONT_WEIGHT,
          alphaScale: SOURCE_ALPHA_SCALE,
          textPrefix: SOURCE_TEXT_PREFIX
        })
      )
    : null;

  const destinationLayer = destination.length > 0
    ? createLayer(
        {
          ...LAYER_CONFIGS.labels,
          id: withSideSuffix(`${LAYER_ID_PREFIX}-labels-destination`, destination)
        },
        getHighlightLabelsLayerProps(destination, state, layerStyles, cached, {
          sizeScale: DESTINATION_LABEL_SCALE,
          fontWeight: DESTINATION_FONT_WEIGHT,
          alphaScale: DESTINATION_ALPHA_SCALE,
          textSuffix: DESTINATION_TEXT_SUFFIX
        })
      )
    : null;

  return { sourceLayer, destinationLayer };
}

export function createSourceLabelsLayer(labels, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  // Use single-pass partition for efficiency
  const { source: sourceLabels } = partitionLabels(labels, cached);
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
  // Use single-pass partition for efficiency
  const { destination: destinationLabels } = partitionLabels(labels, cached);
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
