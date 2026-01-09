/**
 * Factory for links-related layers (links, linkOutlines, extensions)
 */
import { createLayer } from '../base/createLayer.js';
import {
  LAYER_CONFIGS,
  HOVER_HIGHLIGHT_COLOR,
  HISTORY_Z_OFFSET,
  HISTORY_LAYER_ID_PREFIX
} from '../../layerConfigs.js';

const getHistoryLinkOffset = (cached, link) =>
  cached?.colorManager?.isLinkHistorySubtree?.(link) ? HISTORY_Z_OFFSET : 0;

const getHistoryNodeOffset = (cached, node) =>
  cached?.colorManager?.isNodeHistorySubtree?.(node) ? HISTORY_Z_OFFSET : 0;

const addZOffset = (position, offset) => {
  if (!offset) return position;
  return [position[0], position[1], (position[2] || 0) + offset];
};

const isTypedArray = (value) =>
  ArrayBuffer.isView(value) && typeof value?.BYTES_PER_ELEMENT === 'number';

const addZOffsetToFlatPath = (path, offset) => {
  const length = path?.length ?? 0;
  if (!length) return path;
  const useTypedArray = isTypedArray(path);
  const createArray = (size) => (useTypedArray ? new path.constructor(size) : new Array(size));
  const isXYZ = length % 3 === 0;

  if (isXYZ) {
    const next = createArray(length);
    for (let i = 0; i < length; i += 3) {
      next[i] = path[i];
      next[i + 1] = path[i + 1];
      next[i + 2] = (path[i + 2] || 0) + offset;
    }
    return next;
  }

  if (length % 2 === 0) {
    const next = createArray((length / 2) * 3);
    for (let i = 0, j = 0; i < length; i += 2, j += 3) {
      next[j] = path[i];
      next[j + 1] = path[i + 1];
      next[j + 2] = offset;
    }
    return next;
  }

  return path;
};

const addZOffsetToPath = (path, offset) => {
  if (!offset) return path;
  if (!path) return path;
  if (Array.isArray(path)) {
    if (!path.length) return path;
    if (Array.isArray(path[0])) {
      return path.map((point) => addZOffset(point, offset));
    }
    if (typeof path[0] === 'number') {
      return addZOffsetToFlatPath(path, offset);
    }
    return path;
  }
  if (isTypedArray(path)) {
    return addZOffsetToFlatPath(path, offset);
  }
  return path;
};

const isHistoryLink = (cached, link) => {
  if (!cached?.colorManager?.isLinkHistorySubtree?.(link)) return false;
  return link?.treeSide !== 'right';
};

const getHistoryLinks = (links, cached) => links.filter((link) => isHistoryLink(cached, link));

const HISTORY_DEPTH_PARAMETERS = {
  depthCompare: 'always',
  depthWriteEnabled: false
};

const HISTORY_LINKS_CONFIG = {
  ...LAYER_CONFIGS.links,
  id: `${HISTORY_LAYER_ID_PREFIX}-links`,
  defaultProps: {
    ...LAYER_CONFIGS.links.defaultProps,
    parameters: HISTORY_DEPTH_PARAMETERS
  }
};

const HISTORY_LINKS_HALO_CONFIG = {
  ...LAYER_CONFIGS.links,
  id: `${HISTORY_LAYER_ID_PREFIX}-links-halo`,
  defaultProps: {
    ...LAYER_CONFIGS.links.defaultProps,
    parameters: HISTORY_DEPTH_PARAMETERS
  }
};

const getHistoryLinkColor = (link, layerStyles, cached, alphaScale = 1) => {
  const color = layerStyles.getLinkColor(link, cached);
  if (alphaScale === 1) return color;
  if (!Array.isArray(color)) return color;
  const next = [...color];
  next[3] = Math.round(next[3] * alphaScale);
  return next;
};

const getHistoryLinkWidth = (link, layerStyles, cached, scale = 1) =>
  layerStyles.getLinkWidth(link, cached) * scale;

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
      getPath: [links]
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
    getPath: d => addZOffsetToPath(d.path, getHistoryLinkOffset(cached, d)),
    getColor: d => layerStyles.getLinkColor(d, cached),
    getWidth: d => layerStyles.getLinkWidth(d, cached),
    getDashArray: d => layerStyles.getLinkDashArray(d, cached),
    dashJustified: true,
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled],
      getWidth: [colorVersion, strokeWidth],
      getDashArray: [colorVersion, activeEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [links, colorVersion]
    }
  };
}

export function createLinksLayer(links, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.links, getLinksLayerProps(links, state, layerStyles));
}

export function getHistoryLinksLayerProps(historyLinks, state, layerStyles, cached, options = {}) {
  const { taxaColorVersion, colorVersion, strokeWidth, activeEdgeDashingEnabled, upcomingChangesEnabled } = state || {};
  const { alphaScale = 1, widthScale = 1 } = options;

  return {
    data: historyLinks,
    pickable: false,
    getPath: d => d.path,
    getColor: d => getHistoryLinkColor(d, layerStyles, cached, alphaScale),
    getWidth: d => getHistoryLinkWidth(d, layerStyles, cached, widthScale),
    getDashArray: d => layerStyles.getLinkDashArray(d, cached),
    dashJustified: true,
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, upcomingChangesEnabled],
      getWidth: [colorVersion, strokeWidth],
      getDashArray: [colorVersion, activeEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [historyLinks]
    }
  };
}

export function createHistoryLinksLayer(links, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  const historyLinks = getHistoryLinks(links, cached);
  if (!historyLinks.length) return null;

  const props = getHistoryLinksLayerProps(historyLinks, state, layerStyles, cached, {
    alphaScale: 1,
    widthScale: 1.0
  });
  return createLayer(HISTORY_LINKS_CONFIG, props);
}

export function createHistoryLinksHaloLayer(links, state, layerStyles) {
  const cached = layerStyles.getCachedState();
  const historyLinks = getHistoryLinks(links, cached);
  if (!historyLinks.length) return null;

  const props = getHistoryLinksLayerProps(historyLinks, state, layerStyles, cached, {
    alphaScale: 0.35,
    widthScale: 1.4
  });
  return createLayer(HISTORY_LINKS_HALO_CONFIG, props);
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
    getPath: d => addZOffsetToPath(d.path, getHistoryNodeOffset(cached, d.leaf || d)),
    getColor: d => layerStyles.getExtensionColor(d.leaf, cached),
    getWidth: d => layerStyles.getExtensionWidth(d.leaf, cached),
    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion],
      getPath: [extensions, colorVersion],
      getWidth: [extensions.length, strokeWidth, colorVersion]
    }
  };
}

export function createExtensionsLayer(extensions, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.extensions, getExtensionsLayerProps(extensions, state, layerStyles));
}
