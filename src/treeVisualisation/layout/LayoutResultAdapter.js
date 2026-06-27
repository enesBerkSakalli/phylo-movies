import { getMetricBranchLength, getVisualBranchLength } from '../../domain/tree/branchTransform.js';

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
    uniformScale: metadata.uniformScale,
    projectionMode: metadata.projectionMode,
    hyperbolicProjectionStrength: metadata.hyperbolicProjectionStrength,
    is3dLayout: metadata.is3dLayout,
    layoutCacheKey: metadata.layoutCacheKey,
  };
}

function normalizeLayoutNode(node, parent = null, path = []) {
  const data = node?.data || {};
  const splitIndices = copySplitIndices(data.split_indices);
  const id = node.id;
  const splitKey = resolveSplitKey(data, id);
  const parentId = parent?.id ?? null;
  const name = data.name || data.id || '';
  const currentPath = [...path, name || `depth_${node?.depth ?? 0}`];
  const angle = node?.rotatedAngle ?? node?.angle ?? 0;
  const radius = Number.isFinite(node?.radius) ? node.radius : 0;
  const position = normalizePosition(node);
  const x = position[0];
  const y = position[1];
  const z = position[2];
  const nodeMetricBranchLength = Number(node?.metricBranchLength);
  const nodeVisualBranchLength = Number(node?.visualBranchLength);
  const metricBranchLength = Number.isFinite(nodeMetricBranchLength)
    ? nodeMetricBranchLength
    : getMetricBranchLength(data);
  const visualBranchLength = Number.isFinite(nodeVisualBranchLength)
    ? nodeVisualBranchLength
    : getVisualBranchLength(data);
  const children = [];

  const normalized = {
    id,
    parentId,
    name,
    length: data.length ?? 0,
    metricBranchLength,
    visualBranchLength,
    annotations: data.annotations ?? null,
    split_indices: splitIndices,
    ...(splitKey === null ? {} : { splitKey }),
    depth: node?.depth ?? 0,
    height: node?.height ?? 0,
    x,
    y,
    z,
    angle,
    radius,
    polarPosition: radius,
    position,
    projectionMode: node?.projectionMode,
    hyperbolicProjectionStrength: node?.hyperbolicProjectionStrength,
    hyperbolicOriginalRadius: node?.hyperbolicOriginalRadius,
    h3OriginalRadius: node?.h3OriginalRadius,
    h3ProjectionRadius: node?.h3ProjectionRadius,
    h3ProjectedUnitRadius: node?.h3ProjectedUnitRadius,
    h3Distance: node?.h3Distance,
    h3SubtreeRadius: node?.h3SubtreeRadius,
    h3Direction: copyVector(node?.h3Direction),
    isLeaf: !Array.isArray(node?.children) || node.children.length === 0,
    isInternal: Array.isArray(node?.children) && node.children.length > 0,
    path: currentPath,
    children,
    child_split_indices: [],
  };

  if (Array.isArray(node?.children)) {
    for (const child of node.children) {
      children.push(normalizeLayoutNode(child, normalized, currentPath));
    }
  }

  normalized.child_split_indices = children
    .map((child) => child.split_indices)
    .filter((indices) => Array.isArray(indices) && indices.length > 0);

  return normalized;
}

function collectLayoutData(node, nodes, leaves, links) {
  nodes.push(node);
  if (node.isLeaf) {
    leaves.push(node);
  }

  for (const child of node.children) {
    links.push({
      sourceId: node.id,
      targetId: child.id,
      sourcePosition: node.position,
      targetPosition: child.position,
      sourceSplitIndices: node.split_indices,
      targetSplitIndices: child.split_indices,
      sourceSplitKey: node.splitKey,
      targetSplitKey: child.splitKey,
      split_indices: child.split_indices,
      splitKey: child.splitKey,
      length: child.length,
      metricBranchLength: child.metricBranchLength,
      visualBranchLength: child.visualBranchLength,
      annotations: child.annotations ?? null,
      name: child.name,
      targetName: child.name,
      depth: child.depth,
      isLeaf: child.isLeaf,
      isInternal: child.isInternal,
      source: toLinkEndpoint(node),
      target: toLinkEndpoint(child),
    });
    collectLayoutData(child, nodes, leaves, links);
  }
}

function toLinkEndpoint(node) {
  return {
    id: node.id,
    x: node.x,
    y: node.y,
    z: node.z,
    position: node.position,
    angle: node.angle,
    radius: node.radius,
    length: node.length,
    metricBranchLength: node.metricBranchLength,
    visualBranchLength: node.visualBranchLength,
    split_indices: node.split_indices,
    splitKey: node.splitKey,
    annotations: node.annotations ?? null,
  };
}

function copySplitIndices(splitIndices) {
  return Array.isArray(splitIndices) ? [...splitIndices] : [];
}

function copyVector(vector) {
  if (!Array.isArray(vector) && !ArrayBuffer.isView(vector)) return undefined;
  const copied = Array.from(vector, (value) => Number(value));
  return copied.every((value) => Number.isFinite(value)) ? copied : undefined;
}

function normalizePosition(node) {
  const explicitPosition = copyVector(node?.position);
  if (explicitPosition && explicitPosition.length >= 3) {
    return [explicitPosition[0], explicitPosition[1], explicitPosition[2]];
  }

  const x = Number(node?.x);
  const y = Number(node?.y);
  const z = Number(node?.z);
  return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0, Number.isFinite(z) ? z : 0];
}

function resolveSplitKey(data, nodeId) {
  if (typeof data.splitKey === 'string' && data.splitKey.length > 0) return data.splitKey;
  if (typeof nodeId === 'string' && nodeId.startsWith('node-')) return nodeId.slice(5);
  return null;
}

function getMaxRadius(nodes) {
  return nodes.reduce((maxRadius, node) => {
    const radius = Number(node.radius);
    return Number.isFinite(radius) ? Math.max(maxRadius, radius) : maxRadius;
  }, 0);
}
