/**
 * Factory for labels layer
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS, HISTORY_Z_OFFSET, LAYER_ID_PREFIX } from '../../layerConfigs.js';

const getHistoryOffset = (cached, label) => {
  const node = label?.leaf || label;
  return cached?.colorManager?.isNodeHistorySubtree?.(node) ? HISTORY_Z_OFFSET : 0;
};

const addZOffset = (position, offset) => {
  if (!offset) return position;
  return [position[0], position[1], (position[2] || 0) + offset];
};

const boostAlpha = (color, scale) => {
  if (!scale || scale === 1) return color;
  const next = [...color];
  next[3] = Math.min(255, Math.round(next[3] * scale));
  return next;
};

const isLabelSource = (cached, label) => {
  const node = label?.leaf || label;
  const cm = cached?.colorManager;
  if (!cm || label?.treeSide === 'right' || label?.treeSide === 'clipboard') return false;
  if (cm.isNodeMovingSubtree?.(node)) return false;
  return !!cm.isNodeSourceEdge?.(node);
};

const isLabelDestination = (cached, label) => {
  const node = label?.leaf || label;
  const cm = cached?.colorManager;
  if (!cm || label?.treeSide === 'right' || label?.treeSide === 'clipboard') return false;
  if (cm.isNodeMovingSubtree?.(node)) return false;
  return !!cm.isNodeDestinationEdge?.(node);
};

const isSourceOrDestinationLabel = (cached, label) =>
  isLabelSource(cached, label) || isLabelDestination(cached, label);

const getSingleTreeSide = (labels) => {
  if (!Array.isArray(labels) || labels.length === 0) return null;
  const side = labels[0]?.treeSide;
  if (typeof side !== 'string' || !side) return null;
  for (const label of labels) {
    if (label?.treeSide !== side) return null;
  }
  return side;
};

const withSideSuffix = (id, labels) => {
  const side = getSingleTreeSide(labels);
  return side ? `${id}-${side}` : id;
};

const normalizeTextAnchor = (anchor) => {
  switch (anchor) {
    case 'left':
      return 'start';
    case 'center':
      return 'middle';
    case 'right':
      return 'end';
    case 'start':
    case 'middle':
    case 'end':
      return anchor;
    default:
      return 'start';
  }
};

const SOURCE_LABEL_SCALE = 1.15;
const DESTINATION_LABEL_SCALE = 1.3;
const SOURCE_FONT_WEIGHT = '600';
const DESTINATION_FONT_WEIGHT = '800';
const SOURCE_ALPHA_SCALE = 1.2;
const DESTINATION_ALPHA_SCALE = 1.35;
const LABEL_HIGHLIGHT_Z_OFFSET = 0.2;
const SOURCE_TEXT_PREFIX = '';
const DESTINATION_TEXT_SUFFIX = '';

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

export function getHighlightLabelsLayerProps(labels, state, layerStyles, cached, options) {
  const { taxaColorVersion, colorVersion, fontSize } = state || {};
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
    fontWeight,
    getPosition: d =>
      addZOffset(d.position, getHistoryOffset(cached, d) + LABEL_HIGHLIGHT_Z_OFFSET),
    getText: d => `${textPrefix}${d.text || ''}${textSuffix}`,
    getSize: d => layerStyles.getLabelSize(d, cached) * sizeScale,
    getColor: d => boostAlpha(layerStyles.getLabelColor(d, cached), alphaScale),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: d => normalizeTextAnchor(d.textAnchor),
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion],
      getSize: [fontSize, colorVersion, taxaColorVersion],
      getPosition: [colorVersion]
    }
  };
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
  const baseLabels = labels.filter((label) => !isSourceOrDestinationLabel(cached, label));

  return {
    data: baseLabels,
    pickable: true,
    getPosition: d => addZOffset(d.position, getHistoryOffset(cached, d)),
    getText: d => d.text,
    getSize: d => layerStyles.getLabelSize(d, cached),
    getColor: d => layerStyles.getLabelColor(d, cached),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: d => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: d => normalizeTextAnchor(d.textAnchor),
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion],
      getSize: [fontSize, colorVersion, taxaColorVersion],
      getPosition: [colorVersion]
    }
  };
}
