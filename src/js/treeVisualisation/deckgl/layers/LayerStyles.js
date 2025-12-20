import { useAppStore } from '../../../core/store.js';
import { colorToRgb } from '../../../services/ui/colorUtils.js';

/**
 * LayerStyles - Centralized style management for Deck.gl layers
 * Gets ColorManager from store for consistent coloring across all renderers
 *
 * Performance: Use getCachedState() to get a snapshot of store state and colorManager
 * at the start of a render cycle, then pass that to accessor methods to avoid
 * repeated store access per-item.
 */
export class LayerStyles {
  constructor() {
    // Cache for performance
    this._cache = {
      strokeWidth: null,
      fontSize: null,
      nodeSize: null
    };

    // Per-render-cycle cache to avoid repeated store access
    this._renderCache = null;

    // Subscribe to store changes
    this._setupStoreSubscription();
  }

  /**
   * Get cached state for the current render cycle
   * Call this once at the start of layer creation, then pass to accessors
   * @returns {Object} { state, colorManager }
   */
  getCachedState() {
    if (!this._renderCache) {
      const state = useAppStore.getState();
      this._renderCache = {
        state,
        colorManager: state.getColorManager?.(),
        dimmingEnabled: state.dimmingEnabled,
        dimmingOpacity: state.dimmingOpacity
      };
    }
    return this._renderCache;
  }

  /**
   * Clear per-render-cycle cache
   * Call this after layer creation is complete
   */
  clearRenderCache() {
    this._renderCache = null;
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
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkColor(link, cached) {
    // Use cached state if provided, otherwise get fresh (less efficient)
    const { colorManager: cm, dimmingEnabled, dimmingOpacity } = cached || this.getCachedState();

    // Get color with highlighting (no dimming in color)
    const rgb = colorToRgb(cm.getBranchColor(link));

    // Calculate opacity based on active change edges and downstream status
    let opacity = this._getBaseOpacity(link.opacity);
    opacity = this._applyDimmingWithCache(opacity, cm, link, false, dimmingEnabled, dimmingOpacity);

    return [...rgb, opacity];
  }

  /**
   * Get link width with highlighting support
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Link width in pixels
   */
  getLinkWidth(link, cached) {
    const baseWidth = this._getBaseStrokeWidth();
    const { colorManager: cm } = cached || this.getCachedState();

    if (!cm) {
      return Math.max(baseWidth, 2); // Fallback without highlighting
    }

    // Check if link should be highlighted
    const isHighlighted = this._isLinkHighlighted(link, cm);

    return isHighlighted ? baseWidth * 1.5 : baseWidth;
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
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkOutlineColor(link, cached) {
    const { colorManager: cm } = cached || this.getCachedState();

    if (!cm) {
      return [0, 0, 0, 0]; // Transparent if no ColorManager
    }

    // Only show outline if highlighted
    if (!this._isLinkHighlighted(link, cm)) {
      return [0, 0, 0, 0]; // Transparent for non-highlighted branches
    }

    // Convert the highlight color to RGB
    const rgb = colorToRgb(cm.getBranchColorWithHighlights(link));

    // Glow effect: 50% opacity for visible but non-competing outline
    const baseOpacity = link.opacity !== undefined ? link.opacity : 1;
    const glowOpacity = Math.round(baseOpacity * 128); // 50% of base opacity

    return [rgb[0], rgb[1], rgb[2], glowOpacity];
  }

  /**
   * Get link outline width for silhouette effect
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Outline width in pixels
   */
  getLinkOutlineWidth(link, cached) {
    const { colorManager: cm } = cached || this.getCachedState();

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
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeColor(node, cached) {
    const { colorManager: cm, dimmingEnabled, dimmingOpacity } = cached || this.getCachedState();

    // Convert node data to format expected by ColorManager
    const nodeData = this._convertNodeToColorManagerFormat(node);

    // Get color with highlighting (no dimming in color)
    const hexColor = cm?.getNodeColor?.(nodeData) || '#000000';
    const rgb = colorToRgb(hexColor);

    // Calculate opacity with unified dimming logic
    let opacity = this._getBaseOpacity(node.opacity);
    opacity = this._applyDimmingWithCache(opacity, cm, nodeData, true, dimmingEnabled, dimmingOpacity);

    return [...rgb, opacity];
  }

  /**
   * Get node border color - matches fill color for highlighted nodes
   * @param {Object} node - Node data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeBorderColor(node, cached) {
    const { colorManager: cm, dimmingEnabled, dimmingOpacity } = cached || this.getCachedState();
    const nodeData = this._convertNodeToColorManagerFormat(node);

    // Check if node is highlighted
    const isHighlighted = this._isNodeHighlighted(nodeData, cm);

    let opacity = this._getBaseOpacity(node.opacity);
    opacity = this._applyDimmingWithCache(opacity, cm, nodeData, true, dimmingEnabled, dimmingOpacity);

    if (isHighlighted) {
      // Use a darker version of the highlight color for the border
      const hexColor = cm?.getNodeColor?.(nodeData) || '#000000';
      const rgb = colorToRgb(hexColor);
      // Darken by reducing each channel by 30%
      return [Math.round(rgb[0] * 0.7), Math.round(rgb[1] * 0.7), Math.round(rgb[2] * 0.7), opacity];
    }

    return [20, 20, 20, opacity];
  }

  /**
   * Get node radius with size multiplier applied
   * Highlighted nodes get a slight radius boost for visibility
   * @param {Object} node - Node data object
   * @param {number} minRadius - Minimum radius (default 3)
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Node radius in pixels
   */
  getNodeRadius(node, minRadius = 3, cached) {
    const { colorManager: cm } = cached || this.getCachedState();
    const nodeSize = this._cache.nodeSize || useAppStore.getState().nodeSize || 1;
    const baseRadius = node.radius || minRadius;
    const scaledRadius = baseRadius * nodeSize;

    // Boost radius for highlighted nodes (similar to link width boost)
    const nodeData = this._convertNodeToColorManagerFormat(node);
    const isHighlighted = this._isNodeHighlighted(nodeData, cm);

    return isHighlighted ? scaledRadius * 1.3 : scaledRadius;
  }

  /**
   * Get label color with dimming support
   * @param {Object} label - Label data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLabelColor(label, cached) {
    return this._getNodeBasedRgba(label, label.opacity, cached);
  }

  /**
   * Get extension line color with dimming support
   * @param {Object} extension - Extension data object (which is a leaf node)
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getExtensionColor(extension, cached) {
    return this._getNodeBasedRgba(extension, extension.opacity, cached);
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
    return baseWidth * 0.5;
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
  _getNodeBasedRgba(entity, baseOpacity, cached) {
    const { colorManager: cm, dimmingEnabled, dimmingOpacity } = cached || this.getCachedState();
    const node = this._convertNodeToColorManagerFormat(entity);
    const rgb = colorToRgb(cm?.getNodeColor?.(node) || '#000000');
    let opacity = this._getBaseOpacity(baseOpacity);
    opacity = this._applyDimmingWithCache(opacity, cm, node, true, dimmingEnabled, dimmingOpacity);
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
   * Is a node highlighted (marked or active change edge)?
   * @private
   */
  _isNodeHighlighted(nodeData, cm) {
    if (!cm) return false;
    // Check if node color differs from base (meaning it's highlighted)
    const baseColor = cm.getNodeColor?.(nodeData, [], { skipHighlights: true });
    const highlightedColor = cm.getNodeColor?.(nodeData);
    // Fallback: check marked or active edge directly
    const isMarked = cm.marked?.some(set => {
      const splitIndices = nodeData?.data?.split_indices || nodeData?.split_indices;
      return splitIndices?.some(idx => set.has(idx));
    });
    const isActiveEdge = cm.currentActiveChangeEdges?.size > 0 &&
      cm.isNodeDownstreamOfAnyActiveChangeEdge?.(nodeData);
    return isMarked || isActiveEdge || (baseColor !== highlightedColor);
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
   * Legacy method - prefer _applyDimmingWithCache for better performance
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
   * Apply dimming with cached state for better performance
   * @private
   * @param {number} opacity - Base opacity (0-255)
   * @param {Object} cm - ColorManager instance
   * @param {Object} entity - Link or node data
   * @param {boolean} isNode - True if entity is a node, false if link
   * @param {boolean} dimmingEnabled - From cached state
   * @param {number} dimmingOpacity - From cached state
   * @returns {number} Adjusted opacity
   */
  _applyDimmingWithCache(opacity, cm, entity, isNode, dimmingEnabled, dimmingOpacity) {
    if (!dimmingEnabled || !cm?.hasActiveChangeEdges?.()) {
      return opacity;
    }

    const isDownstream = isNode
      ? cm.isNodeDownstreamOfAnyActiveChangeEdge?.(entity)
      : cm.isDownstreamOfAnyActiveChangeEdge?.(entity);

    if (!isDownstream) {
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
    this._cache.nodeSize = null;
    this._renderCache = null;

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
