/**
 * LayerManager - Orchestrates deck.gl layer creation for tree visualization
 *
 * Delegates to modular layer factories for each layer type.
 * Maintains LayerStyles instance for consistent styling across layers.
 */
import { LayerStyles } from './LayerStyles.js';
import { createClipboardLayers } from './factory/clipboard/ClipboardLayerFactory.js';
import { createTreeLayerSet } from './factory/LayerSetFactory.js';
import { measureFrameStep } from '../../performance/frameInstrumentation.js';

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
  createTreeLayers(data, renderContext) {
    const { nodes, links, labels, extensions = [], connectors = [] } = data;

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    const filteredLayers = createTreeLayerSet({
      data: { nodes, links, labels, extensions, connectors: connectors || [] },
      state: renderContext,
      layerStyles: this.layerStyles,
    });

    // Cache is cleared at start of next createTreeLayers() call, no need to clear here

    return filteredLayers;
  }

  /**
   * Update layers with new data - deck.gl handles the diffing and optimization
   *
   * Note: No defensive cloning needed here. The interpolatedData from TreeInterpolator
   * is already ephemeral (created fresh for each animation frame) and safely isolated
   * from the store. Removing the clone eliminates unnecessary GC pressure at 60fps.
   *
   * @param {Object} interpolatedData - New data to apply to layers
   * @returns {Array} New layers (deck.gl will handle updates internally)
   */
  updateLayersWithData(interpolatedData, renderContext) {
    return measureFrameStep('layerManager.updateLayersWithData', () =>
      this.createTreeLayers(interpolatedData, renderContext)
    );
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
  createClipboardLayers(
    data,
    renderContext,
    zOffset = DEFAULT_CLIPBOARD_Z_OFFSET,
    xOffset = 0,
    yOffset = 0
  ) {
    // Optimization: Use modelMatrix/GPU for offsetting instead of CPU cloning
    const modelMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, xOffset, yOffset, zOffset, 1];

    this.layerStyles.clearRenderCache();

    const { nodes, links, labels, extensions = [], connectors = [] } = data;
    const layers = createClipboardLayers({
      data: { nodes, links, labels, extensions, connectors },
      state: renderContext,
      layerStyles: this.layerStyles,
      modelMatrix,
    });

    this.layerStyles.clearRenderCache();

    return layers;
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
