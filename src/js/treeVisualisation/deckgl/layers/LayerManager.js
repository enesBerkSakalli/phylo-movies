import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { LayerStyles } from './LayerStyles.js';
import { useAppStore } from '../../../core/store.js';

/**
 * LayerManager - Creates and manages Deck.gl layers for tree visualization
 * Implements factory pattern for layer creation with separation of concerns
 */
export class LayerManager {
  constructor() {
    // Constants for consistent styling
    this.MIN_NODE_RADIUS = 3; // Smaller minimum to allow tiny internal nodes

    this._layerConfigs = {
      linkOutlines: {
        id: 'phylo-link-outlines',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 4,
          jointRounded: true,
          capRounded: true
        }
      },
      links: {
        id: 'phylo-links',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 3,
          jointRounded: true,
          capRounded: true
        }
      },
      extensions: {
        id: 'phylo-extensions',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 2,
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
          radiusMinPixels: 3,
          getLineWidth: 3
        }
      },
      labels: {
        id: 'phylo-labels',
        LayerClass: TextLayer,
        defaultProps: {
          getAlignmentBaseline: 'center'
        }
      },
      trails: {
        id: 'phylo-motion-trails',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 1,
          jointRounded: true,
          capRounded: true,
          pickable: false
        }
      },
      connectors: {
        id: 'phylo-connectors',
        LayerClass: PathLayer,
        defaultProps: {
          widthUnits: 'pixels',
          widthMinPixels: 1,
          jointRounded: true,
          capRounded: true,
          pickable: true
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
    const { nodes, links, labels, extensions = [], trails = [], connectors = [] } = data;

    return [
      // Render outlines first (background layer)
      this.createLinkOutlinesLayer(links),
      // Main links render on top of outlines
      this.createLinksLayer(links),
      this.createExtensionsLayer(extensions),
      this.createConnectorsLayer(connectors),
      this.createNodesLayer(nodes),
      this.createFlowTrailsLayer(trails),
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
    const taxaColorVersion = useAppStore.getState().taxaColorVersion;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: links,
      pickable: true,
      getPath: d => d.path,
      getColor: d => this.layerStyles.getLinkColor(d),
      getWidth: d => this.layerStyles.getLinkWidth(d),
      getDashArray: d => this.layerStyles.getLinkDashArray(d),
      dashJustified: true,
      updateTriggers: {
        getColor: [links, this.layerStyles._cache.highlightEdges, taxaColorVersion],
        getWidth: [links, this.layerStyles._cache.strokeWidth],
        getDashArray: [links, this.layerStyles._cache.strokeWidth, this.layerStyles._cache.highlightEdges],
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
    const taxaColorVersion = useAppStore.getState().taxaColorVersion;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: extensions,
      getPath: d => d.path,
      getColor: d => this.layerStyles.getExtensionColor(d.leaf),
      getWidth: d => this.layerStyles.getExtensionWidth(d),
      updateTriggers: {
        getColor: [extensions, taxaColorVersion],
        getPath: [extensions],
        getWidth: [extensions, this.layerStyles._cache.strokeWidth],
      }
    });
  }

  /**
   * Create connectors layer (lines between trees)
   */
  createConnectorsLayer(connectors) {
    if (!connectors || connectors.length === 0) return null;
    const config = this._layerConfigs.connectors;
    console.log('[LayerManager] Rendering connectors layer', connectors.length);
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: connectors,
      getPath: d => d.path,
      getWidth: d => d.width || (d.isLeafToLeaf ? 2 : 1),
      getColor: d => d.color || (d.isLeafToLeaf ? [70, 130, 220, 200] : [150, 150, 150, 100]),
      updateTriggers: {
        getPath: [connectors],
        getWidth: [connectors],
        getColor: [connectors]
      }
    });
  }

  /**
   * Create nodes layer
   * @private
   */
  createNodesLayer(nodes) {
    const config = this._layerConfigs.nodes;
    const taxaColorVersion = useAppStore.getState().taxaColorVersion;
    const layer = new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: nodes,
      pickable: true, // Enable picking for node interactions
      getPosition: d => d.position,
      getRadius: d => this.layerStyles.getNodeRadius(d, this.MIN_NODE_RADIUS),
      getFillColor: d => this.layerStyles.getNodeColor(d),
      getLineColor: d => this.layerStyles.getNodeBorderColor(d),
      updateTriggers: {
        getFillColor: [nodes, this.layerStyles._cache.highlightEdges, taxaColorVersion],
        getLineColor: [nodes],
        getPosition: [nodes],
        getRadius: [nodes, this.layerStyles._cache.nodeSize]
      }
    });
    return layer;
  }

  /**
   * Create labels layer
   * @private
   */
  createLabelsLayer(labels) {
    const config = this._layerConfigs.labels;
    const taxaColorVersion = useAppStore.getState().taxaColorVersion;
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: labels,
      getPosition: d => d.position,
      getText: d => d.text,
      getSize: () => this.layerStyles.getLabelSize(),
      getColor: d => this.layerStyles.getLabelColor(d.leaf),
      // Convert rotation from radians (used in data) to degrees (expected by Deck.gl)
      getAngle: d => d.rotation * (180 / Math.PI),
      getTextAnchor: d => d.textAnchor,
      updateTriggers: {
        getColor: [labels, taxaColorVersion],
        getSize: [this.layerStyles._cache.fontSize],
        getAngle: [labels],
        getTextAnchor: [labels],
        getPosition: [labels]
      }
    });
  }


  /**
   * Create Flow Trails layer (fading path segments showing recent motion)
   */
  createFlowTrailsLayer(trails) {
    if (!trails || trails.length === 0) return null;
    const config = this._layerConfigs.trails;
    const { trailThickness } = useAppStore.getState();
    return new config.LayerClass({
      ...config.defaultProps,
      id: config.id,
      data: trails,
      getPath: d => d.path,
      getWidth: d => Math.max(1, (this.layerStyles._cache.strokeWidth || 3) * (trailThickness || 0.5)),
      getColor: d => {
        // Base color from node/label, then apply age-based alpha factor
        let rgba;
        if (d.kind === 'label') {
          rgba = this.layerStyles.getLabelColor(d.leaf);
        } else {
          rgba = this.layerStyles.getNodeColor(d.node);
        }
        const alphaFactor = d.alphaFactor ?? 0.5;
        const a = Math.max(0, Math.min(255, Math.round(((rgba[3] ?? 255)) * alphaFactor)));
        return [rgba[0], rgba[1], rgba[2], a];
      },
      updateTriggers: {
        getPath: [trails],
        getColor: [trails, this.layerStyles._cache.strokeWidth]
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
