import { BRANCH_ANNOTATION_NONE, formatBranchAnnotationLabel } from '../../../../../domain/tree/branchSupportIndex.js';

const SUPPORT_LABEL_Z_OFFSET = 0.18;
const SUPPORT_LABEL_SIZE_SCALE = 6;
const DEFAULT_SUPPORT_LABEL_SIZE = 11;
const SUPPORT_LABEL_TARGET_ANCHOR = 0.82;
const SUPPORT_LABEL_COLOR = [17, 24, 39, 235];
const SUPPORT_LABEL_OUTLINE_COLOR = [255, 255, 255, 225];

function isFinitePoint(point) {
  return Array.isArray(point)
    && Number.isFinite(point[0])
    && Number.isFinite(point[1]);
}

function branchNodeAnchor(source, target) {
  return [
    source[0] + (target[0] - source[0]) * SUPPORT_LABEL_TARGET_ANCHOR,
    source[1] + (target[1] - source[1]) * SUPPORT_LABEL_TARGET_ANCHOR,
    ((source[2] ?? 0) + ((target[2] ?? 0) - (source[2] ?? 0)) * SUPPORT_LABEL_TARGET_ANCHOR) + SUPPORT_LABEL_Z_OFFSET
  ];
}

function supportLabelSize(fontSize) {
  const numeric = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize);
  return Number.isFinite(numeric)
    ? Math.max(8, Math.min(18, numeric * SUPPORT_LABEL_SIZE_SCALE))
    : DEFAULT_SUPPORT_LABEL_SIZE;
}

export function buildSupportLabelData(links = [], supportValueKey = BRANCH_ANNOTATION_NONE) {
  return links
    .map((link) => {
      if (link?.isLeaf === true) return null;
      const text = formatBranchAnnotationLabel(link, supportValueKey);
      if (!text) return null;
      if (!isFinitePoint(link.sourcePosition) || !isFinitePoint(link.targetPosition)) return null;
      return {
        id: `support-${link.id ?? link.splitKey ?? text}`,
        text,
        position: branchNodeAnchor(link.sourcePosition, link.targetPosition),
        treeSide: link.treeSide,
        split_indices: link.split_indices,
        annotations: link.annotations
      };
    })
    .filter(Boolean);
}

export function getSupportLabelsLayerProps(supportLabels, state) {
  const { fontSize, branchAnnotationLabelKey } = state || {};
  const size = supportLabelSize(fontSize);

  return {
    data: supportLabels,
    visible: branchAnnotationLabelKey !== BRANCH_ANNOTATION_NONE,
    pickable: false,
    getPosition: d => d.position,
    getText: d => d.text,
    getSize: () => size,
    getColor: SUPPORT_LABEL_COLOR,
    outlineWidth: 2,
    outlineColor: SUPPORT_LABEL_OUTLINE_COLOR,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    characterSet: 'auto',
    fontSettings: {
      sdf: true
    },
    updateTriggers: {
      getSize: [fontSize],
      getPosition: [supportLabels],
      getText: [supportLabels]
    }
  };
}
