import { H3_HEMISPHERE_AREA_SCALE, H3_LEAF_AREA } from './constants.js';
import { computeH3CircleArea, computeH3Radius } from './hyperboloidMath.js';

export const H3_LEAF_RADIUS = computeH3Radius(H3_LEAF_AREA);

export function assignH3SubtreeMetrics(root) {
  root.eachAfter((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const leafCount =
      children.length > 0 ? children.reduce((sum, child) => sum + (child.h3LeafCount || 1), 0) : 1;

    node.h3LeafCount = leafCount;
    if (children.length === 0) {
      node.h3Area = H3_LEAF_AREA;
      node.h3SubtreeRadius = H3_LEAF_RADIUS;
      return;
    }

    const area =
      H3_HEMISPHERE_AREA_SCALE *
      children.reduce((sum, child) => sum + computeH3CircleArea(child.h3SubtreeRadius), 0);

    node.h3Area = area;
    node.h3SubtreeRadius = computeH3Radius(area);
  });
}

export function sortH3Children(children) {
  return [...children].sort(compareH3StableOrder);
}

function compareH3StableOrder(a, b) {
  const keyDelta = String(a.h3StableSortKey || '').localeCompare(String(b.h3StableSortKey || ''));
  if (keyDelta !== 0) return keyDelta;
  return (a.h3SiblingIndex || 0) - (b.h3SiblingIndex || 0);
}

export function getH3StableSortKey(node) {
  const data = node?.data || {};
  const splitKey =
    canonicalSplitKey(data.split_indices) ||
    (typeof data.splitKey === 'string' && data.splitKey.length > 0 ? data.splitKey : null);
  if (splitKey) return `split:${splitKey}`;
  if (typeof node?.id === 'string' && node.id.length > 0) return `id:${node.id}`;
  if (typeof data.name === 'string' && data.name.length > 0) return `name:${data.name}`;
  return `sibling:${node?.h3SiblingIndex ?? 0}`;
}

function canonicalSplitKey(splitIndices) {
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return null;
  const values = splitIndices.map((value) => Number(value)).filter(Number.isFinite);
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  return values.map((value) => String(value).padStart(12, '0')).join(',');
}

export function getH3SplitValues(node) {
  const data = node?.data || node || {};
  return uniqueSortedNumbers(data.split_indices);
}

export function uniqueSortedNumbers(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  return [...new Set(values.map((value) => Number(value)).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
}
