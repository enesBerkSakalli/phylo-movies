/**
 * LayerManager - Orchestrates deck.gl layer creation for tree visualization
 *
 * Delegates to modular layer factories for each layer type.
 * Maintains LayerStyles instance for consistent styling across layers.
 */
import { LayerStyles } from './LayerStyles.js';
import { useAppStore } from '../../../state/phyloStore/store.js';
import { ComparisonModeRenderer } from '../../comparison/ComparisonModeRenderer.js';
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
    this.comparisonRenderer = null;
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
      interpolationTime: interpolationTime ?? storeState.interpolationTime ?? 0,
      metricScale: Number.isFinite(data?.metricScale) ? data.metricScale : 1,
      zoom: data?.zoom ?? storeState.viewState?.zoom, // Prefer zoom from data/overrides, fallback to store
    };

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    const filteredLayers = createTreeLayerSet({
      data: { nodes, links, labels, extensions, connectors: connectors || [] },
      state,
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
  updateLayersWithData(interpolatedData) {
    return measureFrameStep('layerManager.updateLayersWithData', () =>
      this.createTreeLayers(interpolatedData)
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
  createClipboardLayers(data, zOffset = DEFAULT_CLIPBOARD_Z_OFFSET, xOffset = 0, yOffset = 0) {
    // Optimization: Use modelMatrix/GPU for offsetting instead of CPU cloning
    const modelMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, xOffset, yOffset, zOffset, 1];

    const state = useAppStore.getState();

    this.layerStyles.clearRenderCache();

    const { nodes, links, labels, extensions = [], connectors = [] } = data;
    const layers = createClipboardLayers({
      data: { nodes, links, labels, extensions, connectors },
      state,
      layerStyles: this.layerStyles,
      modelMatrix,
    });

    this.layerStyles.clearRenderCache();

    return layers;
  }

  // ==========================================================================
  // PUBLIC API: Comparison Mode
  // ==========================================================================

  setComparisonContext(controller) {
    this.comparisonRenderer = controller ? new ComparisonModeRenderer(controller) : null;
  }

  renderComparisonStatic(leftIndex, rightIndex) {
    if (!this.comparisonRenderer) return null;
    return this.comparisonRenderer.renderStatic(leftIndex, rightIndex);
  }

  renderComparisonAnimated({
    interpolatedData,
    rightTree,
    rightIndex,
    activeTreeIndex,
    isCancelled,
  }) {
    if (!this.comparisonRenderer) return null;
    return this.comparisonRenderer.renderAnimated(interpolatedData, rightTree, rightIndex, {
      activeTreeIndex,
      isCancelled,
    });
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
