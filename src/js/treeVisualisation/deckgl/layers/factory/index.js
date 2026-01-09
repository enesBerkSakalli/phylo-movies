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
  createHistoryLinksLayer,
  createHistoryLinksHaloLayer,
  createExtensionsLayer,
  getLinkOutlinesLayerProps,
  getLinksLayerProps,
  getHistoryLinksLayerProps,
  getExtensionsLayerProps
} from './links/LinkLayers.js';

export { createNodesLayer, getNodesLayerProps } from './nodes/NodeLayers.js';
export {
  createLabelsLayer,
  createSourceLabelsLayer,
  createDestinationLabelsLayer,
  getLabelsLayerProps,
  getHighlightLabelsLayerProps
} from './labels/LabelLayers.js';
export { createConnectorsLayer, getConnectorsLayerProps } from './connectors/ConnectorLayers.js';
