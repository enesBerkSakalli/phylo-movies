import { SYSTEM_TREE_COLORS } from '../../../constants/TreeColors.js';
import { calculateTaxaVisualScale } from '../../utils/visualScale.js';
import {
  getLinkColor as resolveLinkColor,
  getLinkDashArray as resolveLinkDashArray,
} from './styles/links/inner/linkInnerStyles.js';
import { getLinkWidth as resolveLinkWidth } from './styles/links/linkWidthStyles.js';
import {
  getLinkOutlineDashArray as resolveLinkOutlineDashArray,
  getLinkOutlineColor as resolveLinkOutlineColor,
  getLinkOutlineWidth as resolveLinkOutlineWidth,
} from './styles/links/outline/linkOutlineStyles.js';
import {
  getNodeColor as resolveNodeColor,
  getNodeBorderColor as resolveNodeBorderColor,
  getNodeRadius as resolveNodeRadius,
  getNodeLineWidth as resolveNodeLineWidth,
} from './styles/nodes/nodeStyles.js';
import {
  getLabelColor as resolveLabelColor,
  getLabelSize as resolveLabelSize,
} from './styles/labels/labelStyles.js';
import {
  getExtensionColor as resolveExtensionColor,
  getExtensionWidth as resolveExtensionWidth,
} from './styles/extensionStyles.js';
import { getReadableMetricScale } from './styles/readableMetricScale.js';
import { getRenderContextChangeCategory } from '../../RenderContextFields.js';

/**
 * LayerStyles - Centralized style management for Deck.gl layers
 * Receives a controller-built render context for consistent coloring across all renderers.
 *
 * Performance: Use getCachedState() to get a snapshot of render state and colorManager
 * at the start of a render cycle, then pass that to accessor methods to avoid
 * repeated store access per-item.
 */
export class LayerStyles {
  constructor(initialRenderContext = null) {
    // Cache for performance
    this._cache = {
      strokeWidth: null,
      fontSize: null,
      nodeSize: null,
    };

    // Per-render-cycle cache to avoid repeated store access
    this._renderCache = null;

    const getBaseOpacity = this._getBaseOpacity.bind(this);
    const getBaseStrokeWidth = this._getBaseStrokeWidth.bind(this);
    this._styleHelpers = { getBaseOpacity, getBaseStrokeWidth };
    this._nodeHelpers = { getBaseOpacity, getBaseStrokeWidth, nodeSize: 1 };
    this.onLayoutChange = null;
    this.onLayerDataChange = null;
    this.onPaintChange = null;

    this._renderContext = initialRenderContext;
    this._updateCachedStyleValues(initialRenderContext);
  }

  /**
   * Get cached state for the current render cycle
   * Call this once at the start of layer creation, then pass to accessors
   * @param {Object} [renderState] - Controller-built layer render context
   * @returns {Object} { state, colorManager }
   */
  getCachedState(renderState = this._renderContext) {
    if (!this._renderCache) {
      if (!renderState) {
        throw new Error('LayerStyles requires a LayerRenderContext');
      }

      this._renderContext = renderState;
      const state = renderState;
      const colorManager = state.getColorManager?.();
      const pulseEnabled = state.changePulseEnabled ?? true;
      const metricScale = Number.isFinite(state.metricScale) ? state.metricScale : 1;
      const readableMetricScale = getReadableMetricScale({ metricScale });
      const taxaCount = state.taxaCount ?? 0;
      const visualScale = this._calculateVisualScale(state);
      // Use ColorManager as single source of truth for subtree highlight data
      // This ensures correct highlighting during scrubbing when ColorManager is updated
      // with the scrub position's tree index but store's frameIndex is stale
      const highlightedSubtreeData = colorManager?.highlightedSubtreeSets || [];
      this._nodeHelpers.nodeSize = state.nodeSize ?? this._cache.nodeSize ?? 1;
      this._renderCache = {
        state,
        colorManager,
        dimmingEnabled: state.dimmingEnabled,
        dimmingOpacity: state.dimmingOpacity,
        subtreeDimmingEnabled: state.subtreeDimmingEnabled,
        subtreeDimmingOpacity: state.subtreeDimmingOpacity,
        highlightedSubtreeData,
        subtreeHighlightsEnabled: state.subtreeHighlightsEnabled ?? true,
        subtreeHighlightScope: state.subtreeHighlightScope ?? 'current',
        subtreeHighlightOpacity: state.subtreeHighlightOpacity ?? 0.5,
        pulseOpacity: pulseEnabled ? (state.getPulseOpacity?.() ?? 1.0) : 1.0,
        dashingEnabled: state.pivotEdgeDashingEnabled ?? true,
        upcomingChangesEnabled: state.upcomingChangesEnabled ?? false,
        highlightColorMode: state.highlightColorMode ?? 'solid',
        subtreeHighlightColor:
          state.subtreeHighlightColor ?? SYSTEM_TREE_COLORS.subtreeHighlightColor,
        linkConnectionOpacity: state.linkConnectionOpacity ?? 0.6,
        metricScale,
        readableMetricScale,
        taxaCount,
        visualScale,
        // Density-based scaling: reduce highlight thickness for dense trees
        densityScale: this._calculateDensityScale(state),
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
   * Receive a context change from the controller-owned store subscription.
   * @param {Object} state - Current layer render context
   * @param {Object} [prevState] - Previous layer render context
   */
  handleRenderContextChange(state, prevState = null) {
    this._renderContext = state;
    this._updateCachedStyleValues(state);
    if (!prevState) {
      this._renderCache = null;
      return;
    }

    const changeCategory = getRenderContextChangeCategory(state, prevState);
    if (changeCategory) {
      this._renderCache = null;
    }
    if (changeCategory === 'layout' && this.onLayoutChange) {
      this.onLayoutChange();
    } else if (changeCategory === 'layerData' && this.onLayerDataChange) {
      this.onLayerDataChange();
    } else if (changeCategory === 'paint' && this.onPaintChange) {
      this.onPaintChange();
    }
  }

  _updateCachedStyleValues(state) {
    if (!state) return;

    this._cache.strokeWidth = state.strokeWidth;
    this._cache.fontSize = state.fontSize;
    this._cache.nodeSize = state.nodeSize;
    this._nodeHelpers.nodeSize = state.nodeSize ?? 1;
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
   * Get label size from render state (optionally per-label for subtree highlighting)
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
    const taxaCount = state.taxaCount || 10;
    // Scale inversely to taxa count: 10 taxa -> 1.0, 100 taxa -> 0.1 (clamped to 0.3)
    return Math.max(0.3, Math.min(1.0, 10 / taxaCount));
  }

  _calculateVisualScale(state) {
    const taxaCount = state.taxaCount ?? 0;
    return calculateTaxaVisualScale(taxaCount);
  }

  /**
   * Base stroke width from the render cache
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
   * @param {Function|Object} callback - Function or categorized callbacks to call when styles change
   */
  setStyleChangeCallback(callback) {
    if (typeof callback === 'function') {
      this.onLayoutChange = callback;
      this.onLayerDataChange = callback;
      this.onPaintChange = callback;
      return;
    }

    this.onLayoutChange = callback?.onLayoutChange || null;
    this.onLayerDataChange = callback?.onLayerDataChange || null;
    this.onPaintChange = callback?.onPaintChange || null;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this._renderCache = null;
    this._renderContext = null;
  }
}
