/**
 * Factory for links-related layers
 * - Link Outlines (Highlight/Glow)
 * - Main Links
 * - Leaf Extensions
 */
import { hasLifecycleHighlightedLinks } from '../../styles/links/linkUtils.js';
import { selectLeafNamesByIndex } from '../../../../../state/phyloStore/selectors/treeSelectors.js';

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// LAYER: Link Outlines
// ============================================================================

export function getLinkOutlinesLayerProps(links, state, layerStyles) {
  const {
    colorVersion, strokeWidth, changePulsePhase, changePulseEnabled,
    pivotEdgeDashingEnabled, upcomingChangesEnabled, subtreeHighlightsEnabled,
    highlightColorMode,
    dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity,
    subtreeHighlightOpacity, metricScale
  } = state || {};

  const colorManager = state?.getColorManager?.();

  // Highlight Visibility Logic
  // Only show outlines when there are active highlights/changes to minimize overhead
  const hasHighlights = !!(
    colorManager?.hasPivotEdges?.() ||
    (colorManager?.highlightedSubtreeSets?.length > 0) ||
    (upcomingChangesEnabled && colorManager?.hasUpcomingChangeEdges?.()) ||
    (upcomingChangesEnabled && colorManager?.hasCompletedChangeEdges?.()) ||
    hasLifecycleHighlightedLinks(links)
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
        subtreeHighlightsEnabled, highlightColorMode, dimmingEnabled, dimmingOpacity,
        subtreeDimmingEnabled, subtreeDimmingOpacity,
        subtreeHighlightOpacity
      ],
      getWidth: [
        colorVersion, strokeWidth, changePulsePhase, changePulseEnabled,
        upcomingChangesEnabled, subtreeHighlightsEnabled, highlightColorMode, metricScale
      ],
      getDashArray: [colorVersion, pivotEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [links]
    }
  };
}

// ============================================================================
// LAYER: Links (Main)
// ============================================================================

export function getLinksLayerProps(links, state, layerStyles) {
  const {
    taxaColorVersion, colorVersion, strokeWidth, pivotEdgeDashingEnabled,
    upcomingChangesEnabled, subtreeHighlightsEnabled, highlightColorMode,
    dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled, subtreeDimmingOpacity,
    metricScale
  } = state || {};

  const cached = layerStyles.getCachedState(state);
  const taxaCount = (selectLeafNamesByIndex(state || {}) ?? []).length;

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
        colorVersion, taxaColorVersion, upcomingChangesEnabled, subtreeHighlightsEnabled,
        highlightColorMode, dimmingEnabled, dimmingOpacity, subtreeDimmingEnabled,
        subtreeDimmingOpacity, taxaCount
      ],
      getWidth: [
        colorVersion, strokeWidth, upcomingChangesEnabled, subtreeHighlightsEnabled,
        highlightColorMode, metricScale, taxaCount
      ],
      getDashArray: [colorVersion, pivotEdgeDashingEnabled, upcomingChangesEnabled],
      getPath: [links]
    }
  };
}
