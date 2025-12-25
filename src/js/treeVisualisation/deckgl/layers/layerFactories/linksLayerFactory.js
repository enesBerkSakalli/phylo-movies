/**
 * Factory for links-related layers (links, linkOutlines, extensions)
 */
import { createLayer } from './createLayer.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR } from '../layerConfigs.js';

/**
 * Create link outlines layer (for silhouette/highlighting effect)
 * Only renders when there are active highlights for better performance.
 * Includes pulse animation support for breathing effect.
 *
 * @param {Array} links - Link data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl PathLayer
 */
export function createLinkOutlinesLayer(links, state, layerStyles) {
  const { highlightVersion, strokeWidth, highlightPulsePhase, activeEdgeDashingEnabled, highlightPulseEnabled } = state;
  const colorManager = state.getColorManager?.();

  // Only show outlines when there are active highlights
  const hasHighlights = colorManager?.hasActiveChangeEdges?.() ||
    (colorManager?.marked?.length > 0);

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.linkOutlines, {
    data: links,
    visible: hasHighlights, // Conditionally visible for performance
    pickable: false, // Outlines are not pickable
    getPath: d => d.path,
    getColor: d => layerStyles.getLinkOutlineColor(d, cached),
    getWidth: d => layerStyles.getLinkOutlineWidth(d, cached),
    getDashArray: d => layerStyles.getLinkOutlineDashArray(d, cached),
    dashJustified: false, // Don't justify dashes
    updateTriggers: {
      getColor: [highlightVersion, highlightPulsePhase, highlightPulseEnabled], // Include pulse phase and enabled state
      getWidth: [highlightVersion, strokeWidth, highlightPulsePhase, highlightPulseEnabled], // Width also pulses
      getDashArray: [highlightVersion, activeEdgeDashingEnabled], // Update when highlights or dashing toggle changes
      getPath: links.length
    }
  });
}

/**
 * Create main links layer
 *
 * @param {Array} links - Link data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl PathLayer
 */
export function createLinksLayer(links, state, layerStyles) {
  const { taxaColorVersion, highlightVersion, strokeWidth, activeEdgeDashingEnabled } = state;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.links, {
    data: links,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPath: d => d.path,
    getColor: d => layerStyles.getLinkColor(d, cached),
    getWidth: d => layerStyles.getLinkWidth(d, cached),
    getDashArray: d => layerStyles.getLinkDashArray(d, cached),
    dashJustified: true,
    updateTriggers: {
      getColor: [highlightVersion, taxaColorVersion],
      getWidth: [highlightVersion, strokeWidth],
      getDashArray: [highlightVersion, activeEdgeDashingEnabled], // Update when highlights or dashing toggle changes
      getPath: links.length
    }
  });
}

/**
 * Create extensions layer (dashed lines extending from leaves)
 *
 * @param {Array} extensions - Extension data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl PathLayer
 */
export function createExtensionsLayer(extensions, state, layerStyles) {
  const { taxaColorVersion, highlightVersion, strokeWidth } = state;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return createLayer(LAYER_CONFIGS.extensions, {
    data: extensions,
    getPath: d => d.path,
    getColor: d => layerStyles.getExtensionColor(d.leaf, cached),
    getWidth: d => layerStyles.getExtensionWidth(d),
    updateTriggers: {
      getColor: [highlightVersion, taxaColorVersion],
      getPath: extensions.length,
      getWidth: [extensions.length, strokeWidth]
    }
  });
}
