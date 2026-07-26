import { selectLeafNamesByIndex } from '../../state/phyloStore/selectors/treeSelectors.js';

/**
 * Build the complete state snapshot consumed by deck.gl layer creation.
 *
 * The controller owns the store read. Layer modules receive this immutable-for-a-render
 * context and therefore do not depend on application state themselves.
 */
export function createLayerRenderContext(state, layerData = {}) {
  return {
    ...state,
    metricScale: Number.isFinite(layerData.metricScale) ? layerData.metricScale : 1,
    zoom: layerData.zoom ?? state.viewState?.zoom,
    taxaCount: selectLeafNamesByIndex(state).length,
  };
}

/**
 * The store fields LayerStyles.handleRenderContextChange() compares to decide
 * whether a re-render is needed. Exported so the controller's store
 * subscription can cheaply gate on "did anything render-relevant change"
 * using raw state, without building a full render context (a spread of the
 * entire store) for every store mutation just to find out most of them
 * don't matter here. Keep this in sync with the field lists inside
 * LayerStyles.js's handleRenderContextChange.
 */
export function selectRenderRelevantFields(state) {
  const labelOffsets = state.styleConfig?.labelOffsets || {};
  return {
    labelOffsetsDefault: labelOffsets.DEFAULT,
    labelOffsetsExtension: labelOffsets.EXTENSION,
    strokeWidth: state.strokeWidth,
    fontSize: state.fontSize,
    nodeSize: state.nodeSize,
    branchAnnotationLabelKey: state.branchAnnotationLabelKey,
    taxaCount: selectLeafNamesByIndex(state).length,
    dimmingEnabled: state.dimmingEnabled,
    dimmingOpacity: state.dimmingOpacity,
    subtreeDimmingEnabled: state.subtreeDimmingEnabled,
    subtreeDimmingOpacity: state.subtreeDimmingOpacity,
    subtreeHighlightsEnabled: state.subtreeHighlightsEnabled,
    subtreeHighlightOpacity: state.subtreeHighlightOpacity,
    pivotEdgeDashingEnabled: state.pivotEdgeDashingEnabled,
    upcomingChangesEnabled: state.upcomingChangesEnabled,
    highlightColorMode: state.highlightColorMode,
    subtreeHighlightColor: state.subtreeHighlightColor,
    linkConnectionOpacity: state.linkConnectionOpacity,
    changePulseEnabled: state.changePulseEnabled,
    changePulsePhase: state.changePulsePhase,
    colorVersion: state.colorVersion,
    taxaColorVersion: state.taxaColorVersion,
  };
}
