/**
 * Factory for links-related layers
 * - Link Outlines (Highlight/Glow)
 * - Main Links
 * - Leaf Extensions
 */
import { createLayer } from '../base/createLayer.js';
import {
  LAYER_CONFIGS,
} from '../../config/layerConfigs.js';

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// LAYER: Link Outlines
// ============================================================================

export function getLinkOutlinesLayerProps(links, state, layerStyles) {
  const {
    colorVersion, strokeWidth, changePulsePhase, changePulseEnabled,
    pivotEdgeDashingEnabled, upcomingChangesEnabled, markedSubtreesEnabled,
    highlightColorMode, highlightSourceEnabled, highlightDestinationEnabled,
    dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity,
    markedSubtreeOpacity, metricScale
  } = state || {};

  const colorManager = state?.getColorManager?.();

  // Highlight Visibility Logic
  // Only show outlines when there are active highlights/changes to minimize overhead
  const hasHighlights = !!(
    colorManager?.hasPivotEdges?.() ||
    (colorManager?.sharedMarkedJumpingSubtrees?.length > 0) ||
    (upcomingChangesEnabled && colorManager?.hasUpcomingChangeEdges?.()) ||
    (upcomingChangesEnabled && colorManager?.hasCompletedChangeEdges?.())
  );

  const cached = layerStyles.getCachedState(state);

  return {
    data: links,
    visible: hasHighlights,
    pickable: false,
    getPath: d => d.path,
    getColor: d => layerStyles.getLinkOutlineColor(d, cached),
    getWidth: d => layerStyles.getLinkOutlineWidth(d, cached),
    getDashArray: d => layerStyles.getLinkOutlineDashArray(d, cached),
    dashJustified: false,
    updateTriggers: {
      getColor: [
        colorVersion, changePulsePhase, changePulseEnabled, upcomingChangesEnabled,
        markedSubtreesEnabled, highlightColorMode, highlightSourceEnabled,
        highlightDestinationEnabled, dimmingEnabled, dimmingOpacity,
        subtreeDimmingEnabled, subtreeDimmingOpacity,
        markedSubtreeOpacity
      ],
      getWidth: [
        colorVersion, strokeWidth, changePulsePhase, changePulseEnabled,
        upcomingChangesEnabled, markedSubtreesEnabled, highlightColorMode,
        highlightSourceEnabled, highlightDestinationEnabled, metricScale
      ],
      getDashArray: [colorVersion, pivotEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [links]
    }
  };
}

export function createLinkOutlinesLayer(links, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.linkOutlines, getLinkOutlinesLayerProps(links, state, layerStyles));
}

// ============================================================================
// LAYER: Links (Main)
// ============================================================================

export function getLinksLayerProps(links, state, layerStyles) {
  const {
    taxaColorVersion, colorVersion, strokeWidth, pivotEdgeDashingEnabled,
    upcomingChangesEnabled, markedSubtreesEnabled, highlightColorMode,
    highlightSourceEnabled, highlightDestinationEnabled, dimmingEnabled,
    dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity, metricScale
  } = state || {};

  const cached = layerStyles.getCachedState(state);

  return {
    data: links,
    pickable: false,
    getPath: d => d.path,
    getColor: d => layerStyles.getLinkColor(d, cached),
    getWidth: d => layerStyles.getLinkWidth(d, cached),
    getDashArray: d => layerStyles.getLinkDashArray(d, cached),
    dashJustified: false,
    updateTriggers: {
      getColor: [
        colorVersion, taxaColorVersion, upcomingChangesEnabled, markedSubtreesEnabled,
        highlightColorMode, highlightSourceEnabled, highlightDestinationEnabled,
        dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity
      ],
      getWidth: [
        colorVersion, strokeWidth, upcomingChangesEnabled, markedSubtreesEnabled,
        highlightColorMode, highlightSourceEnabled, highlightDestinationEnabled, metricScale
      ],
      getDashArray: [colorVersion, pivotEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [links]
    }
  };
}

export function createLinksLayer(links, state, layerStyles) {
  return createLayer(LAYER_CONFIGS.links, getLinksLayerProps(links, state, layerStyles));
}
