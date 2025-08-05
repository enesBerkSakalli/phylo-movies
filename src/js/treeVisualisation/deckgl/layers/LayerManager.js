import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { LayerStyles } from './LayerStyles.js';

/**
 * LayerManager - Creates and manages Deck.gl layers for tree visualization
 * Implements factory pattern for layer creation with separation of concerns
 */
export class LayerManager {
  constructor() {
    // Constants for consistent styling
    this.MIN_NODE_RADIUS = 8; // Matches maxRadius in DeckGLDataAdapter config

    this._layerConfigs = {
      linkOutlines: {
        id: 'phylo-link-outlines',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 3,
          jointRounded: true,
          capRounded: true
        }
      },
      links: {
        id: 'phylo-links',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 2,
          jointRounded: true,
          capRounded: true
        }
      },
      extensions: {
        id: 'phylo-extensions',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 1,
          jointRounded: true,
          capRounded: true
        }
      },
      nodes: {
        id: 'phylo-nodes',
        LayerClass: ScatterplotLayer,
        defaultProps: {
          lineWidthUnits: 'pixels',
          radiusUnits: 'pixels',
          radiusMinPixels: 1,
          getLineWidth: 2
        }
      },
      labels: {
        id: 'phylo-labels',
        LayerClass: TextLayer,
        defaultProps: {
          getAlignmentBaseline: 'center'
        }
      }
    };

    // Initialize LayerStyles for consistent styling
    this.layerStyles = new LayerStyles();
  }

  /**
   * Create all tree visualization layers
   * @param {Object} data - Tree data containing nodes, links, labels, extensions
   * @returns {Array} Array of Deck.gl layers
   */
  createTreeLayers(data) {
    const { nodes, links, labels, extensions = [] } = data;

    return [
      // Render outlines first (background layer)
      this.createLinkOutlinesLayer(links),
      // Main links render on top of outlines
      this.createLinksLayer(links),
      this.createExtensionsLayer(extensions),
      this.createNodesLayer(nodes),
      this.createLabelsLayer(labels)
    ].filter(Boolean); // Remove any null layers
  }

  /**
   * Create link outlines layer (for silhouette/highlighting effect)
   * @private
   */
  createLinkOutlinesLayer(links) {
    const config = this._layerConfigs.linkOutlines;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: links,
      pickable: false, // Outlines are not pickable
      getPath: d => d.path,
      getColor: d => this.layerStyles.getLinkOutlineColor(d),
      getWidth: d => this.layerStyles.getLinkOutlineWidth(d),
      updateTriggers: {
        getColor: [links, this.layerStyles._cache.highlightEdges],
        getWidth: [links, this.layerStyles._cache.strokeWidth],
        getPath: [links]
      }
    });
  }

  /**
   * Create links layer
   * @private
   */
  createLinksLayer(links) {
    const config = this._layerConfigs.links;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: links,
      pickable: true,
      getPath: d => d.path,
      getColor: d => this.layerStyles.getLinkColor(d),
      getWidth: d => this.layerStyles.getLinkWidth(d),
      updateTriggers: {
        getColor: [links, this.layerStyles._cache.highlightEdges],
        getWidth: [links, this.layerStyles._cache.strokeWidth],
        getPath: [links]
      }
    });
  }

  /**
   * Create extensions layer
   * @private
   */
  createExtensionsLayer(extensions) {
    const config = this._layerConfigs.extensions;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: extensions,
      getPath: d => d.path,
      getColor: d => this.layerStyles.getExtensionColor(d.leaf),
      getWidth: d => this.layerStyles.getExtensionWidth(d),
      updateTriggers: {
        getColor: [extensions],
        getPath: [extensions],
        getWidth: [extensions, this.layerStyles._cache.strokeWidth],
      }
    });
  }

  /**
   * Create nodes layer
   * @private
   */
  createNodesLayer(nodes) {
    const config = this._layerConfigs.nodes;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: nodes,
      getPosition: d => d.position,
      getRadius: d => Math.max(d.radius, this.MIN_NODE_RADIUS),
      getFillColor: d => this.layerStyles.getNodeColor(d),
      getLineColor: d => this.layerStyles.getNodeBorderColor(d),
      updateTriggers: {
        getFillColor: [nodes, this.layerStyles._cache.highlightEdges],
        getLineColor: [nodes],
        getPosition: [nodes],
        getRadius: [nodes]
      }
    });
  }

  /**
   * Create labels layer
   * @private
   */
  createLabelsLayer(labels) {
    const config = this._layerConfigs.labels;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: labels,
      getPosition: d => d.position,
      getText: d => d.text,
      getSize: () => this.layerStyles.getLabelSize(),
      getColor: d => this.layerStyles.getLabelColor(d.leaf),
      getAngle: d => d.rotation,
      getTextAnchor: d => d.textAnchor,
      updateTriggers: {
        getColor: [labels],
        getSize: [this.layerStyles._cache.fontSize],
        getAngle: [labels],
        getTextAnchor: [labels],
        getPosition: [labels]
      }
    });
  }

  /**
   * Update layers with new data - deck.gl handles the diffing and optimization
   * No need for manual caching, just create new layers with same IDs
   * @param {Object} interpolatedData - New data to apply to layers
   * @returns {Array} New layers (deck.gl will handle updates internally)
   */
  updateLayersWithData(interpolatedData) {
    // Simply create new layers - deck.gl will diff against previous layers by ID
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
