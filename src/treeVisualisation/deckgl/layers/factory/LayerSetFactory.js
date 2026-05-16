import { LAYER_CONFIGS } from '../config/layerConfigs.js';
import { createLayer } from './base/createLayer.js';
import { getConnectorsLayerProps } from './connectors/ConnectorLayers.js';
import { getExtensionsLayerProps } from './extensions/ExtensionLayers.js';
import { getLabelDotsLayerProps, LABEL_DOTS_CONFIG } from './labels/LabelDotsLayer.js';
import { getLabelsLayerProps } from './labels/LabelLayers.js';
import { getLinkOutlinesLayerProps, getLinksLayerProps } from './links/LinkLayers.js';
import { getNodesLayerProps } from './nodes/NodeLayers.js';
import { withSideSuffix } from '../styles/labels/labelUtils.js';

export const DEFAULT_LAYER_SET_CONFIGS = {
  ...LAYER_CONFIGS,
  labelDots: LABEL_DOTS_CONFIG
};

const addTreeSide = (items, treeSide) => {
  return treeSide ? items.map((item) => ({ ...item, treeSide })) : items;
};

const shouldCreateLayer = (data, skipEmpty) => {
  return !skipEmpty || data.length > 0;
};

const withOptionalModelMatrix = (props, modelMatrix) => {
  return modelMatrix ? { ...props, modelMatrix } : props;
};

const createConfiguredLayer = ({
  config,
  props,
  modelMatrix,
  sideSuffixData = null,
  useSideSuffix = true
}) => {
  const layerConfig = useSideSuffix && sideSuffixData
    ? { ...config, id: withSideSuffix(config.id, sideSuffixData) }
    : config;

  return createLayer(layerConfig, withOptionalModelMatrix(props, modelMatrix));
};

export function createTreeLayerSet({
  data,
  state,
  layerStyles,
  configs = DEFAULT_LAYER_SET_CONFIGS,
  modelMatrix = null,
  treeSide = null,
  skipEmpty = false,
  useSideSuffix = true
}) {
  if (!data) return [];

  const nodes = addTreeSide(data.nodes, treeSide);
  const links = addTreeSide(data.links, treeSide);
  const labels = addTreeSide(data.labels, treeSide);
  const extensions = addTreeSide(data.extensions, treeSide);
  const connectors = addTreeSide(data.connectors, treeSide);
  const labelsVisible = state.labelsVisible !== false;

  return [
    shouldCreateLayer(connectors, skipEmpty) && createConfiguredLayer({
      config: configs.connectors,
      props: getConnectorsLayerProps(connectors, state),
      modelMatrix
    }),
    shouldCreateLayer(links, skipEmpty) && createConfiguredLayer({
      config: configs.linkOutlines,
      props: getLinkOutlinesLayerProps(links, state, layerStyles),
      modelMatrix
    }),
    shouldCreateLayer(links, skipEmpty) && createConfiguredLayer({
      config: configs.links,
      props: getLinksLayerProps(links, state, layerStyles),
      modelMatrix
    }),
    shouldCreateLayer(extensions, skipEmpty) && createConfiguredLayer({
      config: configs.extensions,
      props: getExtensionsLayerProps(extensions, state, layerStyles),
      modelMatrix
    }),
    shouldCreateLayer(nodes, skipEmpty) && createConfiguredLayer({
      config: configs.nodes,
      props: getNodesLayerProps(nodes, state, layerStyles),
      modelMatrix
    }),
    labelsVisible && shouldCreateLayer(labels, skipEmpty) && createConfiguredLayer({
      config: configs.labels,
      props: getLabelsLayerProps(labels, state, layerStyles),
      modelMatrix,
      sideSuffixData: labels,
      useSideSuffix
    }),
    !labelsVisible && shouldCreateLayer(labels, skipEmpty) && createConfiguredLayer({
      config: configs.labelDots,
      props: getLabelDotsLayerProps(labels, state, layerStyles),
      modelMatrix,
      sideSuffixData: labels,
      useSideSuffix
    })
  ].filter(Boolean);
}
