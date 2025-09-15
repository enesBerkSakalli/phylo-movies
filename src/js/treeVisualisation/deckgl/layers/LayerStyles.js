import { useAppStore } from '../../../core/store.js';
import { getLinkKey, getNodeKey } from '../../utils/KeyGenerator.js';

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
   * Now handles dimming via opacity based on active change edges
   * @param {Object} link - Link data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkColor(link) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager();

    // Get color with highlighting (no dimming in color)
    const hexColor = cm.getBranchColor(link);
    const rgb = this._hexToRgb(hexColor);

    // Calculate opacity based on active change edges and downstream status
    let opacity = link.opacity !== undefined ? Math.round(link.opacity * 255) : 255;

    // Apply dimming only if dimming is enabled, there are active change edges, and this link is not downstream
    const { dimmingEnabled } = useAppStore.getState();
    if (dimmingEnabled && cm.hasActiveChangeEdges() && !cm.isDownstreamOfAnyActiveChangeEdge(link)) {
        opacity = Math.round(opacity * 0.3); // 30% opacity for dimmed elements
    }

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

    // Check if link should be highlighted by comparing base vs highlighted colors
    const baseColor = cm.getBranchColor?.(link);
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

    // Convert the highlight color to RGB
    const rgb = this._hexToRgb(highlightedColor);

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

    // Check if this branch should be highlighted
    const normalColor = cm.getBranchColor?.(link);
    const highlightedColor = cm.getBranchColorWithHighlights(link);

    // Only show outline for highlighted branches
    if (normalColor === highlightedColor) {
      return 0; // No outline for non-highlighted branches
    }

    // Make outline significantly wider than the link to create a "halo"
    const baseWidth = this._cache.strokeWidth || useAppStore.getState().strokeWidth || 3;
    const highlightedWidth = baseWidth * 2; // Based on the original non-experimental value in getLinkWidth
    return highlightedWidth + 8; // Add 8px for a 4px glow on each side
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
    const rgb = this._hexToRgb(hexColor);

    // Calculate opacity based on active change edges and downstream status
    let opacity = node.opacity !== undefined ? Math.round(node.opacity * 255) : 255;

    // Apply dimming only if dimming is enabled, there are active change edges, and this node is not downstream
    const { dimmingEnabled } = useAppStore.getState();
    if (dimmingEnabled && cm.hasActiveChangeEdges() && !cm.isNodeDownstreamOfAnyActiveChangeEdge(nodeData)) {
        opacity = Math.round(opacity * 0.3); // 30% opacity for dimmed elements
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
   * Get label color with dimming support
   * @param {Object} label - Label data object
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLabelColor(label) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();
    // Normalize to node format for consistent highlighting
    const node = this._convertNodeToColorManagerFormat(label);
    const hexColor = cm.getNodeColor(node);
    const rgb = this._hexToRgb(hexColor);

    // Calculate base opacity
    let opacity = label.opacity !== undefined ? Math.round(label.opacity * 255) : 255;

    // Apply dimming if enabled, there are active change edges, and this label's node is not downstream
    const { dimmingEnabled } = useAppStore.getState();
    if (dimmingEnabled && cm.hasActiveChangeEdges() && !cm.isNodeDownstreamOfAnyActiveChangeEdge(node)) {
        opacity = Math.round(opacity * 0.3); // 30% opacity for dimmed elements
    }

    return [rgb[0], rgb[1], rgb[2], opacity];
  }

  /**
   * Get extension line color with dimming support
   * @param {Object} extension - Extension data object (which is a leaf node)
   * @returns {Array} RGBA color array for Deck.gl
   */
  getExtensionColor(extension) {
    // Get ColorManager from store
    const cm = useAppStore.getState().getColorManager?.();
    // Normalize to node format for consistent highlighting
    const extensionNode = this._convertNodeToColorManagerFormat(extension);
    const hexColor = cm.getNodeColor?.(extensionNode);
    const rgb = this._hexToRgb(hexColor);

    // Calculate base opacity
    let opacity = extension.opacity !== undefined ? Math.round(extension.opacity * 255) : 255;

    // Apply dimming if enabled, there are active change edges, and this extension's node is not downstream
    const { dimmingEnabled } = useAppStore.getState();
    if (dimmingEnabled && cm.hasActiveChangeEdges() && !cm.isNodeDownstreamOfAnyActiveChangeEdge(extensionNode)) {
        opacity = Math.round(opacity * 0.3); // 30% opacity for dimmed elements
    }

    return [...rgb, opacity];
  }

  /**
   *
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
    // If the node has an originalNode reference (from NodeConverter), use that
    if (node.originalNode) {
      return node.originalNode;
    }

    // Fallback for direct D3 hierarchy nodes
    return node;
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
   * Convert color to RGB array (handles both hex and HSL formats)
   * @private
   */
  _hexToRgb(color) {
    // Handle HSL format
    if (color.startsWith('hsl(')) {
      return this._hslToRgb(color);
    }

    // Handle hex format
    let hex = color.replace('#', '');

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
  }

  /**
   * Convert HSL color string to RGB array
   * @private
   */
  _hslToRgb(hslString) {
    // Parse HSL string like "hsl(144, 70%, 60%)"
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) {
      return [0, 0, 0]; // Fallback to black without logging
    }

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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
