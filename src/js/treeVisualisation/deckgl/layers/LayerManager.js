/**
 * LayerManager - Orchestrates deck.gl layer creation for tree visualization
 *
 * Delegates to modular layer factories for each layer type.
 * Maintains LayerStyles instance for consistent styling across layers.
 */
import { LayerStyles } from './LayerStyles.js';
import { useAppStore } from '../../../core/store.js';
import { ComparisonModeRenderer } from '../../comparison/ComparisonModeRenderer.js';
import { buildViewLinkMapping, derivePairKey } from '../../../domain/view/viewLinkMapper.js';
import * as layerFactories from './factory/index.js';
import { createClipboardLayers } from './factory/clipboard/ClipboardLayerFactory.js';

// ==========================================================================
// CONSTANTS
// ==========================================================================

const DEFAULT_CLIPBOARD_Z_OFFSET = 100;

export class LayerManager {
  constructor() {
    // Initialize LayerStyles for consistent styling
    this.layerStyles = new LayerStyles();
    this.comparisonRenderer = null;
    this._lastMappedLeftIndex = null;
    this._lastMappedRightIndex = null;
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
    // Merge interpolationTime from data if present (for animations)
    const state = {
      ...storeState,
      interpolationTime: interpolationTime ?? storeState.interpolationTime ?? 0,
      zoom: data?.zoom ?? storeState.viewState?.zoom // Prefer zoom from data/overrides, fallback to store
    };

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    // Create layers directly - simpler and more reliable than cloning
    const labelsVisible = state.labelsVisible !== false;
    const layers = [
      layerFactories.createConnectorsLayer(connectors || [], state),
      layerFactories.createLinkOutlinesLayer(links, state, this.layerStyles),
      layerFactories.createLinksLayer(links, state, this.layerStyles),
      layerFactories.createExtensionsLayer(extensions, state, this.layerStyles),
      layerFactories.createNodesLayer(nodes, state, this.layerStyles),
      labelsVisible && layerFactories.createLabelsLayer(labels, state, this.layerStyles),
      !labelsVisible && layerFactories.createLabelDotsLayer(labels, state, this.layerStyles),
      // History layers disabled for now
      // ...layerFactories.createHistoryLayers(links, state, this.layerStyles)
    ];

    const filteredLayers = layers.filter(Boolean);

    // Cache is cleared at start of next createTreeLayers() call, no need to clear here

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
    const layers = createClipboardLayers({
      data: { nodes, links, labels, extensions, connectors },
      state,
      layerStyles: this.layerStyles,
      modelMatrix
    });

    this.layerStyles.clearRenderCache();

    return layers;
  }

  // ==========================================================================
  // PUBLIC API: Comparison Mode
  // ==========================================================================

  setComparisonContext(controller) {
    this.comparisonRenderer = controller ? new ComparisonModeRenderer(controller) : null;
    this._lastMappedLeftIndex = null;
    this._lastMappedRightIndex = null;
  }

  renderComparisonStatic(leftIndex, rightIndex) {
    if (!this.comparisonRenderer) return null;
    this._updateViewLinkMapping(leftIndex, rightIndex);
    return this.comparisonRenderer.renderStatic(leftIndex, rightIndex);
  }

  renderComparisonAnimated({ interpolatedData, rightTree, rightIndex, leftIndex }) {
    if (!this.comparisonRenderer) return null;
    if (Number.isInteger(leftIndex) && Number.isInteger(rightIndex)) {
      this._updateViewLinkMapping(leftIndex, rightIndex);
    }
    return this.comparisonRenderer.renderAnimated(interpolatedData, rightTree, rightIndex);
  }

  _updateViewLinkMapping(leftIndex, rightIndex) {
    if (this._lastMappedLeftIndex === leftIndex && this._lastMappedRightIndex === rightIndex) {
      return;
    }

    const { treeList, pairSolutions, setViewLinkMapping, movieData } = useAppStore.getState();
    if (!setViewLinkMapping || !Array.isArray(treeList)) return;

    this._lastMappedLeftIndex = leftIndex;
    this._lastMappedRightIndex = rightIndex;

    const pairKey = derivePairKey(leftIndex, rightIndex, movieData?.tree_metadata);
    const pairSolution = pairKey ? pairSolutions?.[pairKey] : null;

    if (pairSolution) {
      const mapping = buildViewLinkMapping(leftIndex, rightIndex, pairSolution);
      setViewLinkMapping(mapping);
    } else {
      setViewLinkMapping(null);
    }
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
