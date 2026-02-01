import { useAppStore } from '../../../core/store.js';
import {
  getLinkColor as resolveLinkColor,
  getLinkDashArray as resolveLinkDashArray
} from './styles/links/inner/linkInnerStyles.js';
import { getLinkWidth as resolveLinkWidth } from './styles/links/linkWidthStyles.js';
import {
  getLinkOutlineDashArray as resolveLinkOutlineDashArray,
  getLinkOutlineColor as resolveLinkOutlineColor,
  getLinkOutlineWidth as resolveLinkOutlineWidth
} from './styles/links/outline/linkOutlineStyles.js';
import {
  getNodeColor as resolveNodeColor,
  getNodeBorderColor as resolveNodeBorderColor,
  getNodeRadius as resolveNodeRadius,
  getNodeLineWidth as resolveNodeLineWidth
} from './styles/nodes/nodeStyles.js';
import {
  getLabelColor as resolveLabelColor,
  getLabelSize as resolveLabelSize
} from './styles/labels/labelStyles.js';
import {
  getExtensionColor as resolveExtensionColor,
  getExtensionWidth as resolveExtensionWidth
} from './styles/extensionStyles.js';

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

    const getBaseOpacity = this._getBaseOpacity.bind(this);
    const getBaseStrokeWidth = this._getBaseStrokeWidth.bind(this);
    this._styleHelpers = { getBaseOpacity, getBaseStrokeWidth };
    this._nodeHelpers = { getBaseOpacity, getBaseStrokeWidth, nodeSize: 1 };

    const initialState = useAppStore.getState();
    this._cache.strokeWidth = initialState.strokeWidth;
    this._cache.fontSize = initialState.fontSize;
    this._cache.nodeSize = initialState.nodeSize;
    this._nodeHelpers.nodeSize = initialState.nodeSize ?? 1;

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
      const colorManager = state.getColorManager?.();
      const pulseEnabled = state.changePulseEnabled ?? true;
      // Use ColorManager as single source of truth for marked subtree data
      // This ensures correct highlighting during scrubbing when ColorManager is updated
      // with the scrub position's tree index but store's currentTreeIndex is stale
      const markedSubtreeData = colorManager?.sharedMarkedJumpingSubtrees || [];
      this._nodeHelpers.nodeSize = state.nodeSize ?? this._cache.nodeSize ?? 1;
      this._renderCache = {
        state,
        colorManager,
        dimmingEnabled: state.dimmingEnabled,
        dimmingOpacity: state.dimmingOpacity,
        subtreeDimmingEnabled: state.subtreeDimmingEnabled,
        subtreeDimmingOpacity: state.subtreeDimmingOpacity,
        markedSubtreeData,
        markedSubtreesEnabled: state.markedSubtreesEnabled ?? true,
        markedSubtreeOpacity: state.markedSubtreeOpacity ?? 0.8,
        highlightSourceEnabled: state.highlightSourceEnabled ?? false,
        highlightDestinationEnabled: state.highlightDestinationEnabled ?? false,
        pulseOpacity: pulseEnabled ? (state.getPulseOpacity?.() ?? 1.0) : 1.0,
        dashingEnabled: state.activeEdgeDashingEnabled ?? true,
        upcomingChangesEnabled: state.upcomingChangesEnabled ?? false,
        highlightColorMode: state.highlightColorMode ?? 'contrast',
        markedColor: state.markedColor ?? '#ff5722',
        linkConnectionOpacity: state.linkConnectionOpacity ?? 0.6,
        // Density-based scaling: reduce highlight thickness for dense trees
        densityScale: this._calculateDensityScale(state)
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

      if (
        state.dimmingEnabled !== prevState.dimmingEnabled ||
        state.dimmingOpacity !== prevState.dimmingOpacity ||
        state.subtreeDimmingEnabled !== prevState.subtreeDimmingEnabled ||
        state.subtreeDimmingOpacity !== prevState.subtreeDimmingOpacity ||
        state.markedSubtreesEnabled !== prevState.markedSubtreesEnabled ||
        state.markedSubtreeOpacity !== prevState.markedSubtreeOpacity ||
        state.highlightSourceEnabled !== prevState.highlightSourceEnabled ||
        state.highlightDestinationEnabled !== prevState.highlightDestinationEnabled ||
        state.activeEdgeDashingEnabled !== prevState.activeEdgeDashingEnabled ||
        state.upcomingChangesEnabled !== prevState.upcomingChangesEnabled ||
        state.highlightColorMode !== prevState.highlightColorMode ||
        state.markedColor !== prevState.markedColor ||
        state.linkConnectionOpacity !== prevState.linkConnectionOpacity ||
        state.changePulseEnabled !== prevState.changePulseEnabled ||
        state.changePulsePhase !== prevState.changePulsePhase ||
        state.colorVersion !== prevState.colorVersion ||
        state.taxaColorVersion !== prevState.taxaColorVersion ||
        (state.movieData?.sorted_leaves?.length || 0) !== (prevState.movieData?.sorted_leaves?.length || 0)
      ) {
        styleChanged = true;
      }

      // Notify listeners when styles change
      if (styleChanged) {
        this._renderCache = null;
      }
      if (styleChanged && this.onStyleChange) {
        this.onStyleChange();
      }
    });
  }

  /**
   * Get link color using ColorManager for consistent highlighting
   * History mode uses same color but different opacity for accessibility
   * Done: full opacity, Current: full, Next: semi-transparent
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkColor(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkColor(link, resolved, this._styleHelpers);
  }

  /**
   * Get link width with highlighting support
   * History mode: Done=thick, Current=thick, Next=medium
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Link width in pixels
   */
  getLinkWidth(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkWidth(link, resolved, this._styleHelpers);
  }

  /**
   * Get link dash array for dashed/dotted lines
   * History mode: Done=solid, Current=dashed, Next=dotted
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array|null} Dash array [on, off] or null for solid line
   */
  getLinkDashArray(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkDashArray(link, resolved);
  }

  /**
   * Get link outline dash array for dashed/dotted lines
   * Matches the inner line style for consistency
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array|null} Dash array [on, off] or null for solid line
   */
  getLinkOutlineDashArray(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkOutlineDashArray(link, resolved);
  }

  /**
   * Get link outline color for silhouette/highlighting effect
   * History mode: same color, different glow intensity
   * Done: strong static glow, Current: strong pulsing, Next: medium static
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLinkOutlineColor(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkOutlineColor(link, resolved);
  }

  /**
   * Get link outline width for silhouette effect
   * History mode: Done=large (same as current), Current=large pulsing, Next=medium
   * @param {Object} link - Link data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Outline width in pixels
   */
  getLinkOutlineWidth(link, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLinkOutlineWidth(link, resolved, this._styleHelpers);
  }

  /**
   * Get node color using ColorManager
   * Now handles dimming via opacity based on active change edges
   * @param {Object} node - Node data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeColor(node, cached) {
    const resolved = cached || this.getCachedState();
    return resolveNodeColor(node, resolved, this._styleHelpers);
  }

  /**
   * Get node border color - matches fill color for highlighted nodes
   * @param {Object} node - Node data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getNodeBorderColor(node, cached) {
    const resolved = cached || this.getCachedState();
    return resolveNodeBorderColor(node, resolved, this._styleHelpers);
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
    const resolved = cached || this.getCachedState();
    return resolveNodeRadius(node, minRadius, resolved, this._nodeHelpers);
  }

  /**
   * Get node line width (stroke/border thickness)
   * @param {Object} node - Node data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {number} Node line width in pixels
   */
  getNodeLineWidth(node, cached) {
    const resolved = cached || this.getCachedState();
    return resolveNodeLineWidth(node, resolved);
  }

  /**
   * Get label color with dimming support
   * @param {Object} label - Label data object
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getLabelColor(label, cached) {
    const resolved = cached || this.getCachedState();
    return resolveLabelColor(label, resolved, this._styleHelpers);
  }

  /**
   * Get extension line color with dimming support
   * @param {Object} extension - Extension data object (which is a leaf node)
   * @param {Object} [cached] - Optional cached state from getCachedState()
   * @returns {Array} RGBA color array for Deck.gl
   */
  getExtensionColor(extension, cached) {
    const resolved = cached || this.getCachedState();
    return resolveExtensionColor(extension, resolved, this._styleHelpers);
  }

  /**
   *
   * Get extension width
   * @param {Object} extension - Extension data object
   * @param {Object} [cached] - Optional cached state
   * @returns {number} Extension width in pixels
   */
  getExtensionWidth(extension, cached) {
    const resolved = cached || this.getCachedState();
    return resolveExtensionWidth(extension, this._getBaseStrokeWidth(), resolved);
  }

  /**
   * Get label size from store (optionally per-label for marked highlighting)
   * @param {Object} label - Optional label data for dynamic sizing
   * @param {Object} cached - Optional cached state
   * @returns {number} Label size in pixels
   */
  getLabelSize(label, cached) {
    const resolved = cached || this.getCachedState();
    const fontSize = resolved.state?.fontSize ?? this._cache.fontSize ?? '2.6em';
    return resolveLabelSize(label, fontSize, resolved);
  }


  /**
   * Calculate density scaling factor for highlights
   * Returns value between 0.3 (dense) and 1.0 (sparse)
   * @private
   */
  _calculateDensityScale(state) {
    const taxaCount = state.movieData?.sorted_leaves?.length || 10;
    // Scale inversely to taxa count: 10 taxa -> 1.0, 100 taxa -> 0.1 (clamped to 0.3)
    return Math.max(0.3, Math.min(1.0, 10 / taxaCount));
  }

  /**
   * Base stroke width from cache/store
   * @private
   */
  _getBaseStrokeWidth() {
    return this._renderCache?.state?.strokeWidth ?? this._cache.strokeWidth ?? 2;
  }

  /**
   * Normalize base opacity input (0-1 -> 0-255)
   * @private
   */
  _getBaseOpacity(opacityValue) {
    return opacityValue !== undefined ? Math.round(opacityValue * 255) : 255;
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
