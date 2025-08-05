import { useAppStore } from '../../../core/store.js';

/**
 * LayerStyles - Centralized style management for Deck.gl layers
 * Gets ColorManager from store for consistent coloring across all renderers
 */
export class LayerStyles {
  constructor() {
    // Cache for performance
    this._cache = {
      strokeWidth: null,
      fontSize: null
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

      // Notify listeners when styles change
      if (styleChanged && this.onStyleChange) {
        this.onStyleChange();
      }
    });
  }

  /**
   * Get link color using ColorManager for consistent highlighting
   * @param {Object} link - Link data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkColor(link) {
    // Get ColorManager from store - same approach as WebGLMaterialFactory
    const cm = useAppStore.getState().getColorManager();
    // Check if link should be highlighted by testing if it gets a highlight color
    const baseColor = cm.getBranchColor(link);
    // Convert hex to RGBA array
    const rgb = this._hexToRgb(baseColor);
    const opacity = link.opacity !== undefined ? Math.round(link.opacity * 255) : 255;
    return [...rgb, opacity];
  }

  /**
   * Get link width with highlighting support
   * @param {Object} link - Link data object
   * @returns {number} Link width in pixels
   */
  getLinkWidth(link) {
    const baseWidth = this._cache.strokeWidth || useAppStore.getState().strokeWidth || 3;

    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    if (!cm) {
      return Math.max(baseWidth, 3); // Fallback without highlighting
    }

    // Check if link should be highlighted by testing if it gets a highlight color
    const baseColor = cm.getBranchColorWithHighlights(link);
    const highlightColor = cm.getBranchColorWithHighlights(link);
    const isHighlighted = baseColor !== highlightColor;

    return isHighlighted ? baseWidth * 2 : Math.max(baseWidth, 3);
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

    // Check if this branch should be highlighted by comparing colors
    const normalColor = cm.getBranchColor?.(link);
    const highlightedColor = cm.getBranchColorWithHighlights(link);

    // Only show outline if there's a highlighting difference
    if (normalColor === highlightedColor) {
      return [0, 0, 0, 0]; // Transparent for non-highlighted branches
    }

    // Convert hex to RGBA array
    const rgb = this._hexToRgb(highlightedColor);
    const opacity = link.opacity !== undefined ? Math.round(link.opacity * 255) : 255;
    return [...rgb, opacity];
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

    // Check if this branch should be highlighted
    const normalColor = cm.getBranchColor?.(link);
    const highlightedColor = cm.getBranchColorWithHighlights(link);

    // Only show outline for highlighted branches
    if (normalColor === highlightedColor) {
      return 0; // No outline for non-highlighted branches
    }

    // Make outline wider than the main link
    const baseWidth = this._cache.strokeWidth || useAppStore.getState().strokeWidth || 3;
    return Math.max(baseWidth + 4, 6); // At least 4px wider, minimum 6px
  }

  /**
   * Get node color using ColorManager
   * @param {Object} node - Node data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeColor(node) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();

    // Convert node data to format expected by ColorManager
    const nodeData = this._convertNodeToColorManagerFormat(node);

    const hexColor = cm.getNodeColor(nodeData);

    // Convert hex to RGBA array
    const rgb = this._hexToRgb(hexColor);
    const opacity = node.opacity !== undefined ? Math.round(node.opacity * 255) : 255;

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
   * Get label color
   * @param {Object} label - Label data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLabelColor(label) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();
    const hexColor = cm.getNodeColor(label);
    const rgb = this._hexToRgb(hexColor);
    const opacity = label.opacity !== undefined ? Math.round(label.opacity * 255) : 255;
    return [rgb[0], rgb[1], rgb[2], opacity];
  }

  /**
   * Get extension line color
   * @param {Object} extension - Extension data object (which is a leaf node)
   * @returns {Array} RGBA color array for Deck.gl
   */
  getExtensionColor(extension) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();
    const hexColor = cm.getNodeColor?.(extension, this._cache.highlightEdges);
    const rgb = this._hexToRgb(hexColor);
    const opacity = extension.opacity !== undefined ? Math.round(extension.opacity * 255) : 255;
    return [...rgb, opacity];
  }

  /**
   * Get extension width
   * @param {Object} extension - Extension data object
   * @returns {number} Extension width in pixels
   */
  getExtensionWidth(extension) {
    const baseWidth = this._cache.strokeWidth || useAppStore.getState().strokeWidth || 3;
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
    return {
      data: {
        split_indices: node.split_indices || [],
        name: node.name
      }
    };
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
   * Convert hex color to RGB array
   * @private
   */
  _hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
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
