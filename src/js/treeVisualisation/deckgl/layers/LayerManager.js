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
import { isNodeInSubtree, isLinkInSubtree } from './styles/subtreeMatching.js';

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
   * @param {Object} ghostData - Optional data for ghost subtree visualization
   * @returns {Array} Array of deck.gl layers
   */
  createTreeLayers(data, ghostData = null) {
    const { nodes, links, labels, extensions = [], connectors = [] } = data;
    const state = useAppStore.getState();

    // Clear render cache before creating layers (ensures fresh state snapshot)
    this.layerStyles.clearRenderCache();

    // Create layers directly - simpler and more reliable than cloning
    const layers = [
      layerFactories.createLinkOutlinesLayer(links, state, this.layerStyles),
      layerFactories.createLinksLayer(links, state, this.layerStyles),
      layerFactories.createExtensionsLayer(extensions, state, this.layerStyles),
      layerFactories.createConnectorsLayer(connectors || [], state),
      layerFactories.createNodesLayer(nodes, state, this.layerStyles),
      layerFactories.createLabelsLayer(labels, state, this.layerStyles)
    ];

    // Add ghost layers if data is provided
    if (ghostData) {
      layers.push(
        layerFactories.createGhostLinksLayer(ghostData.links || [], state, this.layerStyles),
        layerFactories.createGhostNodesLayer(ghostData.nodes || [], state, this.layerStyles)
      );
    }

    const filteredLayers = layers.filter(Boolean);

    // Clear render cache after creating layers (free memory)
    this.layerStyles.clearRenderCache();

    return filteredLayers;
  }

  /**
   * Update layers with new data - deck.gl handles the diffing and optimization
   * @param {Object} interpolatedData - New data to apply to layers
   * @param {Object} ghostData - Optional data for ghost subtree visualization
   * @returns {Array} New layers (deck.gl will handle updates internally)
   */
  updateLayersWithData(interpolatedData, ghostData = null) {
    return this.createTreeLayers(interpolatedData, ghostData);
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
    const offsetData = this._applyZOffset(data, zOffset, xOffset, yOffset);
    const state = useAppStore.getState();

    this.layerStyles.clearRenderCache();

    const { nodes, links, labels, extensions = [], connectors = [] } = offsetData;

    // Create layers with 'clipboard-' prefix for identification and tag with side
    const clipNodes = nodes.map(n => ({ ...n, treeSide: 'clipboard' }));
    const clipLinks = links.map(l => ({ ...l, treeSide: 'clipboard' }));
    const clipLabels = labels.map(l => ({ ...l, treeSide: 'clipboard' }));
    const clipExtensions = extensions.map(e => ({ ...e, treeSide: 'clipboard' }));
    const clipConnectors = connectors.map(c => ({ ...c, treeSide: 'clipboard' }));

    const layers = [
      this._createClipboardLinkOutlinesLayer(clipLinks, state),
      this._createClipboardLinksLayer(clipLinks, state),
      this._createClipboardExtensionsLayer(clipExtensions, state),
      this._createClipboardConnectorsLayer(clipConnectors, state),
      this._createClipboardNodesLayer(clipNodes, state),
      this._createClipboardLabelsLayer(clipLabels, state)
    ].filter(Boolean);

    this.layerStyles.clearRenderCache();

    return layers;
  }

  _createClipboardLinkOutlinesLayer(links, state) {
    if (!links?.length) return null;
    const props = layerFactories.getLinkOutlinesLayerProps(links, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.linkOutlines },
      props
    );
  }

  _createClipboardLinksLayer(links, state) {
    if (!links?.length) return null;
    const props = layerFactories.getLinksLayerProps(links, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.links },
      props
    );
  }

  _createClipboardExtensionsLayer(extensions, state) {
    if (!extensions?.length) return null;
    const props = layerFactories.getExtensionsLayerProps(extensions, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.extensions },
      props
    );
  }

  _createClipboardConnectorsLayer(connectors, state) {
    if (!connectors?.length) return null;
    const props = layerFactories.getConnectorsLayerProps(connectors, state);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.connectors },
      props
    );
  }

  _createClipboardNodesLayer(nodes, state) {
    if (!nodes?.length) return null;
    const props = layerFactories.getNodesLayerProps(nodes, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.nodes },
      props
    );
  }

  _createClipboardLabelsLayer(labels, state) {
    if (!labels?.length) return null;
    const props = layerFactories.getLabelsLayerProps(labels, state, this.layerStyles);
    return layerFactories.createLayer(
      { ...CLIPBOARD_LAYER_CONFIGS.labels },
      props
    );
  }

  // ==========================================================================
  // HELPERS: Z-Offset
  // ==========================================================================

  /**
   * Apply Z-offset and optional X-Y offset to all layer data positions
   * @param {Object} data - Original layer data
   * @param {number} zOffset - Z-axis offset value
   * @param {number} xOffset - X-axis offset value (default: 0)
   * @param {number} yOffset - Y-axis offset value (default: 0)
   * @returns {Object} Layer data with offsets applied
   */
  _applyZOffset(data, zOffset, xOffset = 0, yOffset = 0) {
    const { nodes = [], links = [], labels = [], extensions = [], connectors = [] } = data;

    return {
      nodes: this._offsetNodePositions(nodes, zOffset, xOffset, yOffset),
      links: this._offsetLinkPaths(links, zOffset, xOffset, yOffset),
      labels: this._offsetLabelPositions(labels, zOffset, xOffset, yOffset),
      extensions: this._offsetExtensionPaths(extensions, zOffset, xOffset, yOffset),
      connectors: this._offsetConnectorPositions(connectors, zOffset, xOffset, yOffset)
    };
  }

  /**
   * Offset node positions to [x + xOffset, y + yOffset, zOffset]
   */
  _offsetNodePositions(nodes, zOffset, xOffset = 0, yOffset = 0) {
    return nodes.map(node => ({
      ...node,
      position: [node.position[0] + xOffset, node.position[1] + yOffset, zOffset]
    }));
  }

  /**
   * Offset link path points to include Z coordinate and X-Y offset
   */
  _offsetLinkPaths(links, zOffset, xOffset = 0, yOffset = 0) {
    return links.map(link => ({
      ...link,
      path: link.path.map(point => [point[0] + xOffset, point[1] + yOffset, zOffset])
    }));
  }

  /**
   * Offset label positions to [x + xOffset, y + yOffset, zOffset]
   */
  _offsetLabelPositions(labels, zOffset, xOffset = 0, yOffset = 0) {
    return labels.map(label => ({
      ...label,
      position: [label.position[0] + xOffset, label.position[1] + yOffset, zOffset]
    }));
  }

  /**
   * Offset extension path points to include Z coordinate and X-Y offset
   */
  _offsetExtensionPaths(extensions, zOffset, xOffset = 0, yOffset = 0) {
    return extensions.map(ext => ({
      ...ext,
      path: ext.path.map(point => [point[0] + xOffset, point[1] + yOffset, zOffset])
    }));
  }

  /**
   * Offset connector positions to include Z coordinate and X-Y offset
   */
  _offsetConnectorPositions(connectors, zOffset, xOffset = 0, yOffset = 0) {
    return connectors.map(conn => ({
      ...conn,
      sourcePosition: [conn.sourcePosition[0] + xOffset, conn.sourcePosition[1] + yOffset, zOffset],
      targetPosition: [conn.targetPosition[0] + xOffset, conn.targetPosition[1] + yOffset, zOffset]
    }));
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
