/**
 * Factory for links-related layers (links, linkOutlines, extensions)
 */
import { createLayer } from '../base/createLayer.js';
import { LAYER_CONFIGS, HOVER_HIGHLIGHT_COLOR } from '../../layerConfigs.js';

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
export function getLinkOutlinesLayerProps(links, state, layerStyles) {
  const { colorVersion, strokeWidth, changePulsePhase, activeEdgeDashingEnabled, changePulseEnabled, upcomingChangesEnabled } = state || {};
  const colorManager = state?.getColorManager?.();

  // Only show outlines when there are active highlights, upcoming changes, or completed changes
  const hasHighlights = !!(
    colorManager?.hasActiveChangeEdges?.() ||
    (colorManager?.sharedMarkedJumpingSubtrees?.length > 0) ||
    (upcomingChangesEnabled && colorManager?.hasUpcomingChangeEdges?.()) ||
    (upcomingChangesEnabled && colorManager?.hasCompletedChangeEdges?.())
  );

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
    data: links,
    visible: hasHighlights, // Conditionally visible for performance
    pickable: false, // Outlines are not pickable
    getPath: d => d.path,
    getColor: d => layerStyles.getLinkOutlineColor(d, cached),
    getWidth: d => layerStyles.getLinkOutlineWidth(d, cached),
    getDashArray: d => layerStyles.getLinkOutlineDashArray(d, cached),
    dashJustified: false, // Don't justify dashes
    updateTriggers: {
      getColor: [colorVersion, changePulsePhase, changePulseEnabled, upcomingChangesEnabled],
      getWidth: [colorVersion, strokeWidth, changePulsePhase, changePulseEnabled, upcomingChangesEnabled],
      getDashArray: [colorVersion, activeEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: links.length
    }
  };
}

export function createLinkOutlinesLayer(links, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.linkOutlines, getLinkOutlinesLayerProps(links, state, layerStyles));
}

/**
 * Create main links layer
 *
 * @param {Array} links - Link data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl PathLayer
 */
export function getLinksLayerProps(links, state, layerStyles) {
  const { taxaColorVersion, colorVersion, strokeWidth, activeEdgeDashingEnabled, upcomingChangesEnabled } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
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
      getColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled],
      getWidth: [colorVersion, strokeWidth],
      getDashArray: [colorVersion, activeEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: links.length
    }
  };
}

export function createLinksLayer(links, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.links, getLinksLayerProps(links, state, layerStyles));
}

/**
 * Create extensions layer (dashed lines extending from leaves)
 *
 * @param {Array} extensions - Extension data array
 * @param {Object} state - Store state snapshot
 * @param {Object} layerStyles - LayerStyles instance
 * @returns {Layer} deck.gl PathLayer
 */
export function getExtensionsLayerProps(extensions, state, layerStyles) {
  const { taxaColorVersion, colorVersion, strokeWidth } = state || {};

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState();

  return {
    data: extensions,
    pickable: true,
    autoHighlight: true,
    highlightColor: HOVER_HIGHLIGHT_COLOR,
    getPath: d => d.path,
    getColor: d => layerStyles.getExtensionColor(d.leaf, cached),
    getWidth: d => layerStyles.getExtensionWidth(d.leaf, cached),
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion],
      getPath: extensions.length,
      getWidth: [extensions.length, strokeWidth]
    }
  };
}

export function createExtensionsLayer(extensions, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.extensions, getExtensionsLayerProps(extensions, state, layerStyles));
}
