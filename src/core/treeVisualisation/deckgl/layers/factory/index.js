/**
 * Layer factories barrel export
 * Re-exports all layer factory functions from their respective subdirectories
 */

// Base utilities
export { createLayer, resetPerf, getPerfSnapshot } from '@/core/treeVisualisation/deckgl/layers/factory/base/createLayer.js';

// Specific layer factories
export {
  createLinkOutlinesLayer,
  createLinksLayer,

  getLinkOutlinesLayerProps,
  getLinksLayerProps,
} from '@/core/treeVisualisation/deckgl/layers/factory/links/LinkLayers.js';

export {
  createExtensionsLayer,
  getExtensionsLayerProps
} from '@/core/treeVisualisation/deckgl/layers/factory/extensions/ExtensionLayers.js';

export { createHistoryLayers } from '@/core/treeVisualisation/deckgl/layers/factory/links/HistoryLinkLayers.js';

export { createNodesLayer, getNodesLayerProps } from '@/core/treeVisualisation/deckgl/layers/factory/nodes/NodeLayers.js';
export {
  createLabelsLayer,
  createSourceLabelsLayer,
  createDestinationLabelsLayer,
  createHighlightLabelLayers,
  partitionLabels,
  getLabelsLayerProps,
  getHighlightLabelsLayerProps
} from '@/core/treeVisualisation/deckgl/layers/factory/labels/LabelLayers.js';
export { createLabelDotsLayer, getLabelDotsLayerProps } from '@/core/treeVisualisation/deckgl/layers/factory/labels/LabelDotsLayer.js';
export { createConnectorsLayer, getConnectorsLayerProps } from '@/core/treeVisualisation/deckgl/layers/factory/connectors/ConnectorLayers.js';
