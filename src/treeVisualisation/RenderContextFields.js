import { selectLeafNamesByIndex } from '../state/phyloStore/selectors/treeSelectors.js';

const renderContextFieldGroups = [
  [
    'layout',
    Object.entries({
      labelOffsetsDefault: (state) => state.styleConfig?.labelOffsets?.DEFAULT,
      labelOffsetsExtension: (state) => state.styleConfig?.labelOffsets?.EXTENSION,
    }),
  ],
  [
    'layerData',
    Object.entries({
      strokeWidth: (state) => state.strokeWidth,
      fontSize: (state) => state.fontSize,
      nodeSize: (state) => state.nodeSize,
      branchAnnotationLabelKey: (state) => state.branchAnnotationLabelKey,
      taxaCount: (state) => state.taxaCount ?? selectLeafNamesByIndex(state).length,
    }),
  ],
  [
    'paint',
    Object.entries({
      dimmingEnabled: (state) => state.dimmingEnabled,
      dimmingOpacity: (state) => state.dimmingOpacity,
      subtreeDimmingEnabled: (state) => state.subtreeDimmingEnabled,
      subtreeDimmingOpacity: (state) => state.subtreeDimmingOpacity,
      subtreeHighlightsEnabled: (state) => state.subtreeHighlightsEnabled,
      subtreeHighlightOpacity: (state) => state.subtreeHighlightOpacity,
      pivotEdgeDashingEnabled: (state) => state.pivotEdgeDashingEnabled,
      upcomingChangesEnabled: (state) => state.upcomingChangesEnabled,
      highlightColorMode: (state) => state.highlightColorMode,
      subtreeHighlightColor: (state) => state.subtreeHighlightColor,
      linkConnectionOpacity: (state) => state.linkConnectionOpacity,
      changePulseEnabled: (state) => state.changePulseEnabled,
      changePulsePhase: (state) => state.changePulsePhase,
      colorVersion: (state) => state.colorVersion,
      taxaColorVersion: (state) => state.taxaColorVersion,
    }),
  ],
];

export function selectRenderRelevantFields(state) {
  const selected = {};
  for (const [, fields] of renderContextFieldGroups) {
    for (const [fieldName, selectField] of fields) {
      selected[fieldName] = selectField(state);
    }
  }
  return selected;
}

export function getRenderContextChangeCategory(state, previousState) {
  for (const [category, fields] of renderContextFieldGroups) {
    if (fields.some(([, selectField]) => selectField(state) !== selectField(previousState))) {
      return category;
    }
  }
  return null;
}
