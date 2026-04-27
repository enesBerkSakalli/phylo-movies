/**
 * Layer factories barrel export
 * Re-exports all layer factory functions from their respective subdirectories
 */

// Base utilities
export { createLayer, resetPerf, getPerfSnapshot } from './base/createLayer.js';

// Specific layer factories
export {
  createLinkOutlinesLayer,
  createLinksLayer,

  getLinkOutlinesLayerProps,
  getLinksLayerProps,
} from './links/LinkLayers.js';

export {
  createExtensionsLayer,
  getExtensionsLayerProps
} from './extensions/ExtensionLayers.js';

export { createHistoryLayers } from './links/HistoryLinkLayers.js';

export { createNodesLayer, getNodesLayerProps } from './nodes/NodeLayers.js';
export {
  createLabelsLayer,
  createSourceLabelsLayer,
  createDestinationLabelsLayer,
  createHighlightLabelLayers,
  partitionLabels,
  getLabelsLayerProps,
  getHighlightLabelsLayerProps
} from './labels/LabelLayers.js';
export { createLabelDotsLayer, getLabelDotsLayerProps } from './labels/LabelDotsLayer.js';
export { createConnectorsLayer, getConnectorsLayerProps } from './connectors/ConnectorLayers.js';
