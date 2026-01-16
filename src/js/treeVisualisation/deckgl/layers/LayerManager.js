/**
 * LayerManager - Orchestrates deck.gl layer creation for tree visualization
 *
 * Delegates to modular layer factories for each layer type.
 * Maintains LayerStyles instance for consistent styling across layers.
 */
import { LayerStyles } from './LayerStyles.js';
import { useAppStore } from '../../../core/store.js';
import * as layerFactories from './factory/index.js';
import { CLIPBOARD_LAYER_CONFIGS } from './layerConfigs.js';

// ==========================================================================
// CONSTANTS
// ==========================================================================

const DEFAULT_CLIPBOARD_Z_OFFSET = 100;

export class LayerManager {
  constructor() {
    // Initialize LayerStyles for consistent styling
    this.layerStyles = new LayerStyles();
  }

  // ==========================================================================
  // PUBLIC API: Tree Layers
  // ==========================================================================

  /**
   * Create all tree visualization layers
   * @param {Object} data - Tree data containing nodes, links, labels, extensions
   * @returns {Array} Array of deck.gl layers
   */
  createTreeLayers(data) {
    const { nodes, links, labels, extensions = [], connectors = [], interpolationTime } = data;
    const storeState = useAppStore.getState();

    // Merge interpolationTime from data if present (for animations)
    const state = {
      ...storeState,
      interpolationTime: interpolationTime ?? storeState.interpolationTime ?? 0
    };

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    // Create layers directly - simpler and more reliable than cloning
    const layers = [
      layerFactories.createNodesLayer(nodes, state, this.layerStyles),
      layerFactories.createLinkOutlinesLayer(links, state, this.layerStyles),
      layerFactories.createLinksLayer(links, state, this.layerStyles),
      layerFactories.createExtensionsLayer(extensions, state, this.layerStyles),
      layerFactories.createConnectorsLayer(connectors || [], state),
      layerFactories.createLabelsLayer(labels, state, this.layerStyles),
      layerFactories.createSourceLabelsLayer(labels, state, this.layerStyles),
      layerFactories.createDestinationLabelsLayer(labels, state, this.layerStyles),
      layerFactories.createHistoryLinksHaloLayer(links, state, this.layerStyles),
      layerFactories.createHistoryLinksLayer(links, state, this.layerStyles)
    ];

    const filteredLayers = layers.filter(Boolean);

    // Clear render cache after creating layers (free memory)
    this.layerStyles.clearRenderCache();

    return filteredLayers;
  }

  /**
   * Update layers with new data - deck.gl handles the diffing and optimization
   * @param {Object} interpolatedData - New data to apply to layers
   * @returns {Array} New layers (deck.gl will handle updates internally)
   */
  updateLayersWithData(interpolatedData) {
    return this.createTreeLayers(this._cloneLayerData(interpolatedData));
  }

  _cloneLayerData(data) {
    if (!data) return data;
    const next = { ...data };
    if (Array.isArray(data.nodes)) next.nodes = [...data.nodes];
    if (Array.isArray(data.links)) next.links = [...data.links];
    if (Array.isArray(data.labels)) next.labels = [...data.labels];
    if (Array.isArray(data.extensions)) next.extensions = [...data.extensions];
    if (Array.isArray(data.connectors)) next.connectors = [...data.connectors];
    return next;
  }

  // ==========================================================================
  // PUBLIC API: Clipboard Layers
  // ==========================================================================

  /**
   * Create clipboard tree layers with Z-offset positioning
   * @param {Object} data - Tree data containing nodes, links, labels, extensions
   * @param {number} zOffset - Z-axis offset for clipboard layers (default: 100)
   * @param {number} xOffset - X-axis offset for clipboard position (default: 0)
   * @param {number} yOffset - Y-axis offset for clipboard position (default: 0)
   * @returns {Array} Array of deck.gl layers with offsets applied
   */
  createClipboardLayers(data, zOffset = DEFAULT_CLIPBOARD_Z_OFFSET, xOffset = 0, yOffset = 0) {
    // Optimization: Use modelMatrix/GPU for offsetting instead of CPU cloning
    const modelMatrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      xOffset, yOffset, zOffset, 1
    ];

    const state = useAppStore.getState();

    this.layerStyles.clearRenderCache();

    const { nodes, links, labels, extensions = [], connectors = [] } = data;

    // Create layers with 'clipboard-' prefix for identification and tag with side
    // Shallow copy objects to add 'treeSide' property without touching geometry arrays
    const clipNodes = nodes?.map(n => ({ ...n, treeSide: 'clipboard' }));
    const clipLinks = links?.map(l => ({ ...l, treeSide: 'clipboard' }));
    const clipLabels = labels?.map(l => ({ ...l, treeSide: 'clipboard' }));
    const clipExtensions = extensions?.map(e => ({ ...e, treeSide: 'clipboard' }));
    const clipConnectors = connectors?.map(c => ({ ...c, treeSide: 'clipboard' }));

    const layers = [
      this._createClipboardLinkOutlinesLayer(clipLinks, state, modelMatrix),
      this._createClipboardLinksLayer(clipLinks, state, modelMatrix),
      this._createClipboardExtensionsLayer(clipExtensions, state, modelMatrix),
      this._createClipboardConnectorsLayer(clipConnectors, state, modelMatrix),
      this._createClipboardNodesLayer(clipNodes, state, modelMatrix),
      this._createClipboardLabelsLayer(clipLabels, state, modelMatrix)
    ].filter(Boolean);

    this.layerStyles.clearRenderCache();

    return layers;
  }

  _createClipboardLinkOutlinesLayer(links, state, modelMatrix) {
    if (!links?.length) return null;
    const props = layerFactories.getLinkOutlinesLayerProps(links, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.linkOutlines },
      { ...props, modelMatrix }
    );
  }

  _createClipboardLinksLayer(links, state, modelMatrix) {
    if (!links?.length) return null;
    const props = layerFactories.getLinksLayerProps(links, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.links },
      { ...props, modelMatrix }
    );
  }

  _createClipboardExtensionsLayer(extensions, state, modelMatrix) {
    if (!extensions?.length) return null;
    const props = layerFactories.getExtensionsLayerProps(extensions, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.extensions },
      { ...props, modelMatrix }
    );
  }

  _createClipboardConnectorsLayer(connectors, state, modelMatrix) {
    if (!connectors?.length) return null;
    const props = layerFactories.getConnectorsLayerProps(connectors, state);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.connectors },
      { ...props, modelMatrix }
    );
  }

  _createClipboardNodesLayer(nodes, state, modelMatrix) {
    if (!nodes?.length) return null;
    const props = layerFactories.getNodesLayerProps(nodes, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.nodes },
      { ...props, modelMatrix }
    );
  }

  _createClipboardLabelsLayer(labels, state, modelMatrix) {
    if (!labels?.length) return null;
    const props = layerFactories.getLabelsLayerProps(labels, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.labels },
      { ...props, modelMatrix }
    );
  }





  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up resources
   */
  destroy() {
    if (this.layerStyles) {
      this.layerStyles.destroy();
      this.layerStyles = null;
    }
  }
}
