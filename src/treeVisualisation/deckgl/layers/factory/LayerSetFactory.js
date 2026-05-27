import { LAYER_CONFIGS } from '../config/layerConfigs.js';
import { createLayer } from './base/createLayer.js';
import { getConnectorsLayerProps } from './connectors/ConnectorLayers.js';
import { getExtensionsLayerProps } from './extensions/ExtensionLayers.js';
import { getLabelDotsLayerProps, LABEL_DOTS_CONFIG } from './labels/LabelDotsLayer.js';
import { getLabelsLayerProps } from './labels/LabelLayers.js';
import { buildSupportLabelData, getSupportLabelsLayerProps } from './labels/SupportLabelLayers.js';
import { getLinkOutlinesLayerProps, getLinksLayerProps } from './links/LinkLayers.js';
import { getNodesLayerProps } from './nodes/NodeLayers.js';
import { withSideSuffix } from '../styles/labels/labelUtils.js';
import { BRANCH_ANNOTATION_NONE } from '../../../../domain/tree/branchSupportIndex.js';

export const DEFAULT_LAYER_SET_CONFIGS = {
  ...LAYER_CONFIGS,
  labelDots: LABEL_DOTS_CONFIG,
};

const addTreeSide = (items, treeSide) => {
  return treeSide ? items.map((item) => ({ ...item, treeSide })) : items;
};

const shouldCreateLayer = (data, skipEmpty) => {
  return !skipEmpty || data.length > 0;
};

const semanticConfig = (config, suffix) => ({
  ...config,
  id: `${config.id}-${suffix}`,
});

const withOptionalModelMatrix = (props, modelMatrix) => {
  return modelMatrix ? { ...props, modelMatrix } : props;
};

const createConfiguredLayer = ({
  config,
  props,
  modelMatrix,
  sideSuffixData = null,
  useSideSuffix = true,
}) => {
  const layerConfig =
    useSideSuffix && sideSuffixData
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
  useSideSuffix = true,
}) {
  if (!data) return [];

  const nodes = addTreeSide(data.nodes, treeSide);
  const links = addTreeSide(data.links, treeSide);
  const labels = addTreeSide(data.labels, treeSide);
  const extensions = addTreeSide(data.extensions, treeSide);
  const connectors = addTreeSide(data.connectors, treeSide);
  const labelsVisible = state.labelsVisible !== false;
  const supportValueKey = state.branchAnnotationLabelKey ?? BRANCH_ANNOTATION_NONE;
  const supportLabelsVisible = supportValueKey !== BRANCH_ANNOTATION_NONE;
  const supportLabels = supportLabelsVisible ? buildSupportLabelData(links, supportValueKey) : [];
  const cached = layerStyles.getCachedState(state);
  const partitioned = partitionTreeLayerData(
    {
      nodes,
      links,
      labels,
      extensions,
    },
    cached
  );

  return [
    shouldCreateLayer(connectors, skipEmpty) &&
      createConfiguredLayer({
        config: configs.connectors,
        props: getConnectorsLayerProps(connectors, state),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.linkOutlines, 'base'),
        props: getLinkOutlinesLayerProps(partitioned.links.base, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.linkOutlines, 'history'),
        props: getLinkOutlinesLayerProps(partitioned.links.history, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.linkOutlines, 'marked'),
        props: getLinkOutlinesLayerProps(partitioned.links.marked, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.links, 'base'),
        props: getLinksLayerProps(partitioned.links.base, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.links, 'history'),
        props: getLinksLayerProps(partitioned.links.history, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.links.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.links, 'marked'),
        props: getLinksLayerProps(partitioned.links.marked, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.extensions.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.extensions, 'base'),
        props: getExtensionsLayerProps(partitioned.extensions.base, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.extensions.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.extensions, 'history'),
        props: getExtensionsLayerProps(partitioned.extensions.history, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.extensions.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.extensions, 'marked'),
        props: getExtensionsLayerProps(partitioned.extensions.marked, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.extensions.movingMarked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.extensions, 'moving-marked'),
        props: getExtensionsLayerProps(partitioned.extensions.movingMarked, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.nodes.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.nodes, 'base'),
        props: getNodesLayerProps(partitioned.nodes.base, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.nodes.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.nodes, 'history'),
        props: getNodesLayerProps(partitioned.nodes.history, state, layerStyles),
        modelMatrix,
      }),
    shouldCreateLayer(partitioned.nodes.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.nodes, 'marked'),
        props: getNodesLayerProps(partitioned.nodes.marked, state, layerStyles),
        modelMatrix,
      }),
    supportLabelsVisible &&
      shouldCreateLayer(supportLabels, skipEmpty) &&
      createConfiguredLayer({
        config: configs.supportLabels,
        props: getSupportLabelsLayerProps(supportLabels, state),
        modelMatrix,
        sideSuffixData: supportLabels,
        useSideSuffix,
      }),
    labelsVisible &&
      shouldCreateLayer(partitioned.labels.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labels, 'base'),
        props: getLabelsLayerProps(partitioned.labels.base, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.base,
        useSideSuffix,
      }),
    labelsVisible &&
      shouldCreateLayer(partitioned.labels.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labels, 'history'),
        props: getLabelsLayerProps(partitioned.labels.history, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.history,
        useSideSuffix,
      }),
    labelsVisible &&
      shouldCreateLayer(partitioned.labels.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labels, 'marked'),
        props: getLabelsLayerProps(partitioned.labels.marked, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.marked,
        useSideSuffix,
      }),
    !labelsVisible &&
      shouldCreateLayer(partitioned.labels.base, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labelDots, 'base'),
        props: getLabelDotsLayerProps(partitioned.labels.base, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.base,
        useSideSuffix,
      }),
    !labelsVisible &&
      shouldCreateLayer(partitioned.labels.history, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labelDots, 'history'),
        props: getLabelDotsLayerProps(partitioned.labels.history, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.history,
        useSideSuffix,
      }),
    !labelsVisible &&
      shouldCreateLayer(partitioned.labels.marked, skipEmpty) &&
      createConfiguredLayer({
        config: semanticConfig(configs.labelDots, 'marked'),
        props: getLabelDotsLayerProps(partitioned.labels.marked, state, layerStyles),
        modelMatrix,
        sideSuffixData: partitioned.labels.marked,
        useSideSuffix,
      }),
  ].filter(Boolean);
}

function createBuckets(extra = {}) {
  return {
    base: [],
    history: [],
    marked: [],
    ...extra,
  };
}

function partitionTreeLayerData(data, cached = {}) {
  const cm = cached?.colorManager;
  const nodes = createBuckets();
  const links = createBuckets();
  const labels = createBuckets();
  const extensions = createBuckets({ movingMarked: [] });

  for (const node of data.nodes) {
    nodes[classifyNodeLike(node, cached)].push(node);
  }
  for (const link of data.links) {
    links[classifyLink(link, cached)].push(link);
  }
  for (const label of data.labels) {
    labels[classifyNodeLike(label, cached)].push(label);
  }
  for (const extension of data.extensions) {
    const bucket = classifyNodeLike(extension, cached);
    if (bucket === 'marked' && cm?.isNodeInActiveMoverSubtree?.(extension)) {
      extensions.movingMarked.push(extension);
    } else {
      extensions[bucket].push(extension);
    }
  }

  return { nodes, links, labels, extensions };
}

function classifyNodeLike(datum, cached) {
  const cm = cached?.colorManager;
  if (cm?.isNodeInHighlightedSubtreeFast?.(datum)) return 'marked';
  if (cm?.isNodeHistorySubtree?.(datum)) return 'history';
  return 'base';
}

function classifyLink(link, cached) {
  const cm = cached?.colorManager;
  if (cm?.isLinkInHighlightedSubtreeFast?.(link)) return 'marked';
  if (cm?.isLinkHistorySubtree?.(link)) return 'history';
  return 'base';
}
