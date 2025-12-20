/**
 * LayerManager - Orchestrates deck.gl layer creation for tree visualization
 *
 * Delegates to modular layer factories for each layer type.
 * Maintains LayerStyles instance for consistent styling across layers.
 */
import { LayerStyles } from './LayerStyles.js';
import { useAppStore } from '../../../core/store.js';
import {
  createLinkOutlinesLayer,
  createLinksLayer,
  createExtensionsLayer,
  createNodesLayer,
  createLabelsLayer,
  createFlowTrailsLayer,
  createConnectorsLayer
} from './layerFactories/index.js';

export class LayerManager {
  constructor() {
    // Initialize LayerStyles for consistent styling
    this.layerStyles = new LayerStyles();
  }

  /**
   * Create all tree visualization layers
   * @param {Object} data - Tree data containing nodes, links, labels, extensions
   * @returns {Array} Array of deck.gl layers
   */
  createTreeLayers(data) {
    const { nodes, links, labels, extensions = [], trails = [], connectors = [] } = data;
    const state = useAppStore.getState();

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    const layers = [
      // Render outlines first (background layer)
      createLinkOutlinesLayer(links, state, this.layerStyles),
      // Main links render on top of outlines
      createLinksLayer(links, state, this.layerStyles),
      createExtensionsLayer(extensions, state, this.layerStyles),
      createConnectorsLayer(connectors, state),
      createNodesLayer(nodes, state, this.layerStyles),
      createFlowTrailsLayer(trails, state, this.layerStyles),
      createLabelsLayer(labels, state, this.layerStyles)
    ].filter(Boolean); // Remove any null layers

    // Clear render cache after creating layers (free memory)
    this.layerStyles.clearRenderCache();

    return layers;
  }

  /**
   * Update layers with new data - deck.gl handles the diffing and optimization
   * @param {Object} interpolatedData - New data to apply to layers
   * @returns {Array} New layers (deck.gl will handle updates internally)
   */
  updateLayersWithData(interpolatedData) {
    return this.createTreeLayers(interpolatedData);
  }

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
