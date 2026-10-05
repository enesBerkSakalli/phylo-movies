import { findLowestCommonAncestorById } from '../../builders/geometry/connectors/CommonAncestorBuilder.js';

export const ensureOutside = (pt, center, minRadius, depthOffset = 0) => {
  const dx = pt[0] - center[0];
  const dy = pt[1] - center[1];
  const r = Math.hypot(dx, dy);

  // Base radius plus offset based on hierarchy depth
  // The deeper in the tree (higher depth value), the closer to the base radius.
  // The shallower (closer to root), the further out.
  // We assume max offset
  const targetRadius = minRadius + depthOffset;

  if (r < 1e-9) {
    return [center[0], center[1] - targetRadius, 0];
  }

  const scale = Math.max(1, targetRadius / r);
  return [center[0] + dx * scale, center[1] + dy * scale, 0];
};

export const pushOutward = (pt, center, factor = 1.05) => {
  const dx = pt[0] - center[0];
  const dy = pt[1] - center[1];
  return [center[0] + dx * factor, center[1] + dy * factor, 0];
};

export function getBundleAncestor(entry, entryById, targetDepth = 2) {
  let current = entry;

  while (current.parentId && getDepth(current) > targetDepth) {
    const next = entryById.get(current.parentId);
    if (!next) break;
    current = next;
  }
  return current;
}

export const chooseBundlePoint = (connections, center, radius, isLeft, entryById) => {
  const entries = connections.map((c) => (isLeft ? c.sourceInfo : c.targetInfo)).filter(Boolean);
  const lca = findLowestCommonAncestorById(entries, entryById);

  // Hierarchical layering: shallow common ancestors bundle further out, deep ones closer in.
  // Assumes a typical tree depth of ~15 and 5 units between lanes.
  const depthOffset = Math.max(0, 15 - getDepth(lca, 5)) * 5;

  return ensureOutside(lca.position, center, radius || 0, depthOffset);
};

function getDepth(entry, fallback = 0) {
  const depth = entry.depth;
  return Number.isFinite(depth) ? depth : fallback;
}
