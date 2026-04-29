import { getNodeKey } from '../utils/KeyGenerator.js';

export function createLayoutResult(root, metadata = {}) {
  const layoutTree = normalizeLayoutNode(root);
  const nodes = [];
  const leaves = [];
  const links = [];

  collectLayoutData(layoutTree, nodes, leaves, links);

  return {
    layoutTree,
    nodes,
    links,
    leaves,
    max_radius: metadata.max_radius ?? getMaxRadius(nodes),
    width: metadata.width,
    height: metadata.height,
    margin: metadata.margin,
    scale: metadata.scale,
    layoutCacheKey: metadata.layoutCacheKey
  };
}

function normalizeLayoutNode(node, parent = null, path = []) {
  const data = node?.data || {};
  const splitIndices = copySplitIndices(data.split_indices);
  const id = getNodeKey({ split_indices: splitIndices });
  const parentId = parent?.id ?? null;
  const name = data.name || data.id || '';
  const currentPath = [...path, name || `depth_${node?.depth ?? 0}`];
  const angle = node?.rotatedAngle ?? node?.angle ?? 0;
  const radius = Number.isFinite(node?.radius) ? node.radius : 0;
  const x = Number.isFinite(node?.x) ? node.x : 0;
  const y = Number.isFinite(node?.y) ? node.y : 0;
  const children = [];

  const normalized = {
    id,
    parentId,
    name,
    length: data.length ?? 0,
    split_indices: splitIndices,
    depth: node?.depth ?? 0,
    height: node?.height ?? 0,
    x,
    y,
    angle,
    radius,
    polarPosition: radius,
    position: [x, y, 0],
    isLeaf: !Array.isArray(node?.children) || node.children.length === 0,
    isInternal: Array.isArray(node?.children) && node.children.length > 0,
    path: currentPath,
    children,
    child_split_indices: []
  };

  if (Array.isArray(node?.children)) {
    for (const child of node.children) {
      children.push(normalizeLayoutNode(child, normalized, currentPath));
    }
  }

  normalized.child_split_indices = children
    .map(child => child.split_indices)
    .filter(indices => Array.isArray(indices) && indices.length > 0);

  return normalized;
}

function collectLayoutData(node, nodes, leaves, links) {
  nodes.push(node);
  if (node.isLeaf) {
    leaves.push(node);
  }

  for (const child of node.children) {
    links.push({
      id: child.id ? `link-${child.id.replace(/^node-/, '')}` : null,
      sourceId: node.id,
      targetId: child.id,
      sourcePosition: node.position,
      targetPosition: child.position,
      sourceSplitIndices: node.split_indices,
      targetSplitIndices: child.split_indices,
      split_indices: child.split_indices,
      name: child.name,
      targetName: child.name,
      depth: child.depth,
      isLeaf: child.isLeaf,
      isInternal: child.isInternal,
      source: toLinkEndpoint(node),
      target: toLinkEndpoint(child)
    });
    collectLayoutData(child, nodes, leaves, links);
  }
}

function toLinkEndpoint(node) {
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    angle: node.angle,
    radius: node.radius,
    split_indices: node.split_indices
  };
}

function copySplitIndices(splitIndices) {
  return Array.isArray(splitIndices) ? [...splitIndices] : [];
}

function getMaxRadius(nodes) {
  return nodes.reduce((maxRadius, node) => {
    const radius = Number(node.radius);
    return Number.isFinite(radius) ? Math.max(maxRadius, radius) : maxRadius;
  }, 0);
}
