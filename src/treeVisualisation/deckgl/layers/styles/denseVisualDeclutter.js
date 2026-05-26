import { TREE_HIGHLIGHT_ROLE } from './highlightResolver.js';

const MIN_DENSE_BASE_OPACITY_SCALE = 0.45;
const DENSE_BASE_OPACITY_MULTIPLIER = 1.4;
const DENSE_INTERNAL_NODE_VISUAL_SCALE_CUTOFF = 0.4;

export function applyDenseBaseOpacity(opacity, cached, highlight) {
  if (highlight?.role !== TREE_HIGHLIGHT_ROLE.BASE) return opacity;

  const opacityScale = getDenseBaseOpacityScale(cached);
  if (opacityScale >= 1) return opacity;

  return Math.round(opacity * opacityScale);
}

export function applyDenseInternalNodeOpacity(opacity, node, cached, highlight) {
  if (!isDenseBaseInternalNode(node, cached, highlight)) return opacity;
  return applyDenseBaseOpacity(opacity, cached, highlight);
}

export function isDenseBaseInternalNode(node, cached, highlight) {
  if (node?.isLeaf !== false) return false;
  if (highlight?.role !== TREE_HIGHLIGHT_ROLE.BASE) return false;

  const visualScale = Number(cached?.visualScale);
  return Number.isFinite(visualScale) && visualScale <= DENSE_INTERNAL_NODE_VISUAL_SCALE_CUTOFF;
}

function getDenseBaseOpacityScale(cached) {
  const visualScale = Number(cached?.visualScale);
  if (!Number.isFinite(visualScale) || visualScale >= 1) return 1;

  return Math.max(MIN_DENSE_BASE_OPACITY_SCALE, Math.min(1, visualScale * DENSE_BASE_OPACITY_MULTIPLIER));
}
