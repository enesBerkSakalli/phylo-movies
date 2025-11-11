import { useAppStore } from '../../../core/store.js';
import { colorToRgb } from '../../../utils/colorUtils.js';

/**
 * LayerStyles - Centralized style management for Deck.gl layers
 * Gets ColorManager from store for consistent coloring across all renderers
 */
export class LayerStyles {
  constructor() {
    // Cache for performance
    this._cache = {
      strokeWidth: null,
      fontSize: null,
      nodeSize: null
    };

    // Subscribe to store changes
    this._setupStoreSubscription();
  }

  /**
   * Set up store subscription for reactive updates
   * @private
   */
  _setupStoreSubscription() {
    this.unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Track if any style properties changed
      let styleChanged = false;

      // Update cache when relevant values change
      if (state.strokeWidth !== prevState.strokeWidth) {
        this._cache.strokeWidth = state.strokeWidth;
        styleChanged = true;
      }
      if (state.fontSize !== prevState.fontSize) {
        this._cache.fontSize = state.fontSize;
        styleChanged = true;
      }
      if (state.nodeSize !== prevState.nodeSize) {
        this._cache.nodeSize = state.nodeSize;
        styleChanged = true;
      }

      // Notify listeners when styles change
      if (styleChanged && this.onStyleChange) {
        this.onStyleChange();
      }
    });
  }

  /**
   * Get link color using ColorManager for consistent highlighting
   * Now handles dimming via opacity based on active change edges
   * @param {Object} link - Link data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkColor(link) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager();

    // Get color with highlighting (no dimming in color)
    const rgb = colorToRgb(cm.getBranchColor(link));

    // Calculate opacity based on active change edges and downstream status
    let opacity = this._getBaseOpacity(link.opacity);
    opacity = this._applyDimming(opacity, cm.hasActiveChangeEdges(), cm.isDownstreamOfAnyActiveChangeEdge(link));

    return [...rgb, opacity];
  }

  /**
   * Get link width with highlighting support
   * @param {Object} link - Link data object
   * @returns {number} Link width in pixels
   */
  getLinkWidth(link) {
    const baseWidth = this._cache.strokeWidth || useAppStore.getState().strokeWidth || 2;

    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    if (!cm) {
      return Math.max(baseWidth, 2); // Fallback without highlighting
    }

    // Check if link should be highlighted
    const isHighlighted = this._isLinkHighlighted(link, cm);

    return isHighlighted ? baseWidth * 1.5 : Math.max(baseWidth, 2);
  }

  /**
   * Get link dash array for dashed/dotted lines
   * Can be used to distinguish certain types of branches
   * @param {Object} link - Link data object
   * @returns {Array|null} Dash array [on, off] or null for solid line
   */
  getLinkDashArray(link) {
    // Currently returning null for solid lines
    // This can be extended to return dash patterns based on link properties
    // For example: return link.dashed ? [4, 2] : null;
    return null;
  }

  /**
   * Get link outline color for silhouette/highlighting effect
   * Only visible when there are changes to highlight
   * @param {Object} link - Link data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkOutlineColor(link) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    if (!cm) {
      return [0, 0, 0, 0]; // Transparent if no ColorManager
    }

    // Only show outline if highlighted
    if (!this._isLinkHighlighted(link, cm)) {
      return [0, 0, 0, 0]; // Transparent for non-highlighted branches
    }

    // Convert the highlight color to RGB
    const rgb = colorToRgb(cm.getBranchColorWithHighlights(link));

    // Return the same color but with a lower opacity for a "glow" effect
    const baseOpacity = link.opacity !== undefined ? link.opacity : 1;
    const glowOpacity = Math.round(baseOpacity * 100); // ~40% opacity for the glow

    return [rgb[0], rgb[1], rgb[2], glowOpacity];
  }

  /**
   * Get link outline width for silhouette effect
   * @param {Object} link - Link data object
   * @returns {number} Outline width in pixels
   */
  getLinkOutlineWidth(link) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    if (!cm) {
      return 0; // No outline if no ColorManager
    }

    // Only show outline for highlighted branches
    if (!this._isLinkHighlighted(link, cm)) {
      return 0; // No outline for non-highlighted branches
    }

    // Make outline significantly wider than the link to create a "halo"
    const baseWidth = this._getBaseStrokeWidth();
    const highlightedWidth = baseWidth * 1.5; // Based on the highlighted value in getLinkWidth
    return highlightedWidth + 6; // Add 6px for a 3px glow on each side
  }

  /**
   * Get node color using ColorManager
   * Now handles dimming via opacity based on active change edges
   * @param {Object} node - Node data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeColor(node) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    // Convert node data to format expected by ColorManager
    const nodeData = this._convertNodeToColorManagerFormat(node);

    // Get color with highlighting (no dimming in color)
    const hexColor = cm.getNodeColor(nodeData);
    const rgb = colorToRgb(hexColor);

    // Calculate opacity based on active change edges and downstream status
    let opacity = node.opacity !== undefined ? Math.round(node.opacity * 255) : 255;

    // Apply dimming only if dimming is enabled, there are active change edges, and this node is not downstream
    const { dimmingEnabled, dimmingOpacity } = useAppStore.getState();
    if (dimmingEnabled && cm.hasActiveChangeEdges() && !cm.isNodeDownstreamOfAnyActiveChangeEdge(nodeData)) {
        opacity = Math.round(opacity * dimmingOpacity);
    }

    return [...rgb, opacity];
  }

  /**
   * Get node border color
   * @param {Object} node - Node data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeBorderColor(node) {
    const opacity = node.opacity !== undefined ? Math.round(node.opacity * 255) : 255;
    return [20, 20, 20, opacity];
  }

  /**
   * Get node radius with size multiplier applied
   * @param {Object} node - Node data object
   * @param {number} minRadius - Minimum radius (default 3)
   * @returns {number} Node radius in pixels
   */
  getNodeRadius(node, minRadius = 3) {
    const nodeSize = this._cache.nodeSize || useAppStore.getState().nodeSize || 1;
    const baseRadius = node.radius || minRadius;
    return Math.max(baseRadius * nodeSize, minRadius);
  }

  /**
   * Get label color with dimming support
   * @param {Object} label - Label data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLabelColor(label) {
    return this._getNodeBasedRgba(label, label.opacity);
  }

  /**
   * Get extension line color with dimming support
   * @param {Object} extension - Extension data object (which is a leaf node)
   * @returns {Array} RGBA color array for Deck.gl
   */
  getExtensionColor(extension) {
    return this._getNodeBasedRgba(extension, extension.opacity);
  }

  /**
   *
   * Get extension width
   * @param {Object} extension - Extension data object
   * @returns {number} Extension width in pixels
   */
  getExtensionWidth(extension) {
    const baseWidth = this._getBaseStrokeWidth();
    // Extensions are typically thinner than main branches
    return Math.max(baseWidth * 0.5, 1);
  }

  /**
   * Get label size from store
   * @returns {number} Label size in pixels
   */
  getLabelSize() {
    const fontSize = this._cache.fontSize || useAppStore.getState().fontSize || '2.6em';
    return parseFloat(fontSize) * 10 || 16;
  }


  /**
   * Convert Deck.gl node format to ColorManager format
   * @private
   */
  _convertNodeToColorManagerFormat(node) {
    // If the node has an originalNode reference (from NodeConverter), use that
    if (node.originalNode) {
      return node.originalNode;
    }

    // Fallback for direct D3 hierarchy nodes
    return node;
  }



  /**
   * Get node/label/extension RGBA with dimming rules applied
   * @private
   */
  _getNodeBasedRgba(entity, baseOpacity) {
    const cm = useAppStore.getState().getColorManager?.();
    const node = this._convertNodeToColorManagerFormat(entity);
    const rgb = colorToRgb(cm?.getNodeColor?.(node));
    let opacity = this._getBaseOpacity(baseOpacity);
    const hasActive = cm?.hasActiveChangeEdges?.() || false;
    const isDownstream = cm?.isNodeDownstreamOfAnyActiveChangeEdge?.(node) || false;
    opacity = this._applyDimming(opacity, hasActive, isDownstream);
    return [...rgb, opacity];
  }

  /**
   * Is a link highlighted (color diff between base and highlighted)?
   * @private
   */
  _isLinkHighlighted(link, cm) {
    const normalColor = cm?.getBranchColor?.(link);
    const highlightedColor = cm?.getBranchColorWithHighlights?.(link);
    return normalColor !== highlightedColor;
  }

  /**
   * Base stroke width from cache/store
   * @private
   */
  _getBaseStrokeWidth() {
    return this._cache.strokeWidth || useAppStore.getState().strokeWidth || 2;
  }

  /**
   * Normalize base opacity input (0-1 -> 0-255)
   * @private
   */
  _getBaseOpacity(opacityValue) {
    return opacityValue !== undefined ? Math.round(opacityValue * 255) : 255;
  }

  /**
   * Apply dimming per store settings and active-change/downstream flags
   * @private
   */
  _applyDimming(opacity, hasActiveChangeEdges, isDownstream) {
    const { dimmingEnabled, dimmingOpacity } = useAppStore.getState();
    if (dimmingEnabled && hasActiveChangeEdges && !isDownstream) {
      return Math.round(opacity * dimmingOpacity);
    }
    return opacity;
  }

  /**
   * Invalidate cache and trigger style updates
   * Called when external factors change that affect styling
   */
  invalidateCache() {
    // Force cache refresh on next access
    this._cache.strokeWidth = null;
    this._cache.fontSize = null;
    this._cache.highlightEdges = null;

    // Notify listeners
    if (this.onStyleChange) {
      this.onStyleChange();
    }
  }

  /**
   * Set style change callback
   * @param {Function} callback - Function to call when styles change
   */
  setStyleChangeCallback(callback) {
    this.onStyleChange = callback;
  }





  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // No need to destroy ColorManager since it belongs to the store
  }
}
