/**
 * Factory for history links layers
 * Renders "ghost" traces of previous tree states using high-performance techniques.
 *
 * OPTIMIZATION NOTES:
 * 1. Uses `modelMatrix` for Z-offsetting to avoid O(N) CPU array allocation per frame.
 * 2. Filters the dataset exactly once for both Halo and Main layers.
 * 3. Uses pure functional accessors for maximum performance.
 */
import { createLayer } from '../base/createLayer.js';
import {
  HISTORY_LINK_Z_OFFSET,
  HISTORY_LINKS_CONFIG,
  HISTORY_LINKS_HALO_CONFIG
} from '../../config/layerConfigs.js';

// Pre-allocate model matrix for Z-offset
const HISTORY_MODEL_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, HISTORY_LINK_Z_OFFSET, 1
];

/**
 * Predicate to check if a link belongs to the history subtree.
 * Used for filtering the dataset once.
 */
const isHistoryLink = (link, cached) => {
  return (
    link?.treeSide !== 'right' &&
    cached?.colorManager?.isLinkHistorySubtree?.(link)
  );
};

/**
 * Optimized color accessor
 */
const getHistoryLinkColor = (link, layerStyles, cached, alphaScale) => {
  const color = layerStyles.getLinkColor(link, cached);

  // Fast path for invalid or opaque colors
  if (alphaScale === 1 || !Array.isArray(color)) return color;

  // Create new array only when necessary (color change)
  // Note: We might want to cache this if performance is still an issue,
  // but this is much lighter than re-allocating geometry.
  return [color[0], color[1], color[2], Math.round(color[3] * alphaScale)];
};

/**
 * Optimized width accessor
 */
const getHistoryLinkWidth = (link, layerStyles, cached, scale) =>
  layerStyles.getLinkWidth(link, cached) * scale;

/**
 * Internal prop builder to avoid repetition
 */
const getLayerProps = (historyLinks, state, layerStyles, cached, { alphaScale, widthScale }) => {
  const { taxaColorVersion, colorVersion, strokeWidth, activeEdgeDashingEnabled, upcomingChangesEnabled } = state || {};

  return {
    data: historyLinks,
    pickable: false,
    modelMatrix: HISTORY_MODEL_MATRIX, // GPU-side offset
    getPath: d => d.path, // Direct access, zero allocation
    getColor: d => getHistoryLinkColor(d, layerStyles, cached, alphaScale),
    getWidth: d => getHistoryLinkWidth(d, layerStyles, cached, widthScale),
    getDashArray: d => layerStyles.getLinkDashArray(d, cached),
    dashJustified: false,
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled],
      getWidth: [colorVersion, strokeWidth],
      getDashArray: [colorVersion, activeEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [historyLinks] // Only update if filtered list changes
    }
  };
};

/**
 * Creates both history layers (Halo and Main) in one pass.
 *
 * @param {Array} links - The full links dataset
 * @param {Object} state - The Redux state
 * @param {Object} layerStyles - The style manager
 * @returns {Array} Array containing [haloLayer, mainLayer] (or nulls)
 */
export function createHistoryLayers(links, state, layerStyles) {
  // History layers deactivated
  return [];

  /* Original implementation:
  const cached = layerStyles.getCachedState();

  // Single pass filtering
  const historyLinks = links.filter(link => isHistoryLink(link, cached));

  if (historyLinks.length === 0) {
    return [];
  }

  // Create props sharing the same filtered data
  const haloProps = getLayerProps(historyLinks, state, layerStyles, cached, {
    alphaScale: 0.03,
    widthScale: 0.2
  });

  const mainProps = getLayerProps(historyLinks, state, layerStyles, cached, {
    alphaScale: 0.1,
    widthScale: 0.3
  });

  return [
    createLayer(HISTORY_LINKS_HALO_CONFIG, haloProps),
    createLayer(HISTORY_LINKS_CONFIG, mainProps)
  ];
  */
}
