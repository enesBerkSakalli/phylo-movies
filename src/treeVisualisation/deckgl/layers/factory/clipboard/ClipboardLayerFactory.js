import * as layerFactories from '../index.js';
import { CLIPBOARD_LAYER_CONFIGS } from '../../config/layerConfigs.js';

function createClipboardLinkOutlinesLayer(links, state, layerStyles, modelMatrix) {
  if (!links?.length) return null;
  const props = layerFactories.getLinkOutlinesLayerProps(links, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.linkOutlines },
    { ...props, modelMatrix }
  );
}

function createClipboardLinksLayer(links, state, layerStyles, modelMatrix) {
  if (!links?.length) return null;
  const props = layerFactories.getLinksLayerProps(links, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.links },
    { ...props, modelMatrix }
  );
}

function createClipboardExtensionsLayer(extensions, state, layerStyles, modelMatrix) {
  if (!extensions?.length) return null;
  const props = layerFactories.getExtensionsLayerProps(extensions, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.extensions },
    { ...props, modelMatrix }
  );
}

function createClipboardConnectorsLayer(connectors, state, modelMatrix) {
  if (!connectors?.length) return null;
  const props = layerFactories.getConnectorsLayerProps(connectors, state);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.connectors },
    { ...props, modelMatrix }
  );
}

function createClipboardNodesLayer(nodes, state, layerStyles, modelMatrix) {
  if (!nodes?.length) return null;
  const props = layerFactories.getNodesLayerProps(nodes, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.nodes },
    { ...props, modelMatrix }
  );
}

function createClipboardLabelsLayer(labels, state, layerStyles, modelMatrix) {
  if (!labels?.length) return null;
  const props = layerFactories.getLabelsLayerProps(labels, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.labels },
    { ...props, modelMatrix }
  );
}

function createClipboardLabelDotsLayer(labels, state, layerStyles, modelMatrix) {
  if (!labels?.length) return null;
  const props = layerFactories.getLabelDotsLayerProps(labels, state, layerStyles);
  return layerFactories.createLayer(
    { ...CLIPBOARD_LAYER_CONFIGS.labelDots },
    { ...props, modelMatrix }
  );
}

export function createClipboardLayers({ data, state, layerStyles, modelMatrix }) {
  if (!data) return [];
  const { nodes, links, labels, extensions = [], connectors = [] } = data;

  // Shallow copy objects to add 'treeSide' property without touching geometry arrays
  const clipNodes = nodes?.map(n => ({ ...n, treeSide: 'clipboard' }));
  const clipLinks = links?.map(l => ({ ...l, treeSide: 'clipboard' }));
  const clipLabels = labels?.map(l => ({ ...l, treeSide: 'clipboard' }));
  const clipExtensions = extensions?.map(e => ({ ...e, treeSide: 'clipboard' }));
  const clipConnectors = connectors?.map(c => ({ ...c, treeSide: 'clipboard' }));

  const labelsVisible = state.labelsVisible !== false;

  return [
    createClipboardLinkOutlinesLayer(clipLinks, state, layerStyles, modelMatrix),
    createClipboardLinksLayer(clipLinks, state, layerStyles, modelMatrix),
    createClipboardExtensionsLayer(clipExtensions, state, layerStyles, modelMatrix),
    createClipboardConnectorsLayer(clipConnectors, state, modelMatrix),
    createClipboardNodesLayer(clipNodes, state, layerStyles, modelMatrix),
    labelsVisible && createClipboardLabelsLayer(clipLabels, state, layerStyles, modelMatrix),
    !labelsVisible && createClipboardLabelDotsLayer(clipLabels, state, layerStyles, modelMatrix)
  ].filter(Boolean);
}
