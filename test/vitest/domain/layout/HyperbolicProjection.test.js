import { hierarchy } from 'd3-hierarchy';
import { describe, expect, it } from 'vitest';
import {
  LAYOUT_PROJECTION_MODES,
  applyHyperbolicRadialProjection,
  applyWalrus3dProjection,
  normalizeHyperbolicProjectionStrength,
  normalizeLayoutProjectionMode,
} from '../../../../src/treeVisualisation/layout/hyperbolicProjection/index.js';

function makeRoot() {
  const root = hierarchy({
    name: 'root',
    children: [
      {
        name: 'internal',
        children: [{ name: 'leaf' }],
      },
    ],
  });

  const [rootNode, internalNode, leafNode] = root.descendants();
  rootNode.radius = 0;
  rootNode.rotatedAngle = 0;
  internalNode.radius = 50;
  internalNode.rotatedAngle = Math.PI / 4;
  leafNode.radius = 100;
  leafNode.rotatedAngle = Math.PI / 4;

  for (const node of root.descendants()) {
    node.x = node.radius * Math.cos(node.rotatedAngle);
    node.y = node.radius * Math.sin(node.rotatedAngle);
  }

  return { root, internalNode, leafNode };
}

function makeFlatRoot(childCount) {
  const root = hierarchy({
    name: 'root',
    children: Array.from({ length: childCount }, (_value, index) => ({
      name: `leaf-${index}`,
    })),
  });

  root.descendants().forEach((node, index) => {
    node.radius = index === 0 ? 0 : 100;
    node.rotatedAngle = index;
    node.x = node.radius * Math.cos(node.rotatedAngle);
    node.y = node.radius * Math.sin(node.rotatedAngle);
  });

  return root;
}

function makeSplitRoot(order) {
  const root = hierarchy({
    name: 'root',
    split_indices: [0, 1],
    children: order.map((index) => ({
      name: `leaf-${index}`,
      split_indices: [index],
    })),
  });

  root.descendants().forEach((node, index) => {
    node.radius = index === 0 ? 0 : 100;
    node.rotatedAngle = index;
    node.x = node.radius * Math.cos(node.rotatedAngle);
    node.y = node.radius * Math.sin(node.rotatedAngle);
  });

  return root;
}

function makeBalancedSplitClade(indices) {
  if (indices.length <= 1) {
    const [index] = indices;
    return {
      name: `leaf-${index}`,
      split_indices: [index],
    };
  }

  const midpoint = Math.floor(indices.length / 2);
  const left = indices.slice(0, midpoint);
  const right = indices.slice(midpoint);
  return {
    name: `clade-${indices[0]}-${indices[indices.length - 1]}`,
    split_indices: indices,
    children: [makeBalancedSplitClade(left), makeBalancedSplitClade(right)],
  };
}

function makeNearTieSplitRoot() {
  const smallerClade = Array.from({ length: 8 }, (_value, index) => index);
  const largerClade = Array.from({ length: 9 }, (_value, index) => index + 100);
  const root = hierarchy({
    name: 'root',
    split_indices: [...smallerClade, ...largerClade],
    children: [makeBalancedSplitClade(smallerClade), makeBalancedSplitClade(largerClade)],
  });

  root.descendants().forEach((node, index) => {
    node.radius = index === 0 ? 0 : 100;
    node.rotatedAngle = index;
    node.x = node.radius * Math.cos(node.rotatedAngle);
    node.y = node.radius * Math.sin(node.rotatedAngle);
  });

  return root;
}

function makeSiblingSplitTransitionRoot(splitSibling) {
  const stableClade = makeBalancedSplitClade([0, 1, 2, 3]);
  const siblingClade = splitSibling
    ? [makeBalancedSplitClade([4, 5]), makeBalancedSplitClade([6, 7])]
    : [makeBalancedSplitClade([4, 5, 6, 7])];
  const root = hierarchy({
    name: 'root',
    split_indices: [0, 1, 2, 3, 4, 5, 6, 7, 100, 101],
    children: [
      makeBalancedSplitClade([100, 101]),
      {
        name: 'movie-parent',
        split_indices: [0, 1, 2, 3, 4, 5, 6, 7],
        children: [stableClade, ...siblingClade],
      },
    ],
  });

  root.descendants().forEach((node, index) => {
    node.radius = index === 0 ? 0 : 100;
    node.rotatedAngle = index;
    node.x = node.radius * Math.cos(node.rotatedAngle);
    node.y = node.radius * Math.sin(node.rotatedAngle);
  });

  return root;
}

function findBySplit(root, splitIndex) {
  return root.descendants().find((node) => node.data?.split_indices?.[0] === splitIndex);
}

function findExactSplit(root, splitIndices) {
  return root.descendants().find((node) => {
    const candidate = node.data?.split_indices;
    return (
      Array.isArray(candidate) &&
      candidate.length === splitIndices.length &&
      candidate.every((value, index) => value === splitIndices[index])
    );
  });
}

const H3_TEST_K = 2;
const H3_TEST_HEMISPHERE_AREA_SCALE = 7.2;
const H3_TEST_LEAF_AREA = 0.005;

function h3CircleArea(radius) {
  return 2 * Math.PI * (Math.cosh(radius / H3_TEST_K) - 1);
}

function h3Radius(area) {
  return H3_TEST_K * Math.asinh(Math.sqrt(area / (2 * Math.PI * H3_TEST_K * H3_TEST_K)));
}

function h3EuclideanDistance(distance) {
  const y = Math.cosh(distance / 2);
  return Math.sqrt(1 - 1 / (y * y));
}

function angularDistance(a, b) {
  const delta = Math.abs(a - b) % (Math.PI * 2);
  return delta > Math.PI ? Math.PI * 2 - delta : delta;
}

describe('hyperbolic radial projection', () => {
  it('normalizes projection options at the boundary', () => {
    expect(normalizeLayoutProjectionMode('hyperbolic')).toBe(LAYOUT_PROJECTION_MODES.HYPERBOLIC);
    expect(normalizeLayoutProjectionMode('walrus-3d')).toBe(LAYOUT_PROJECTION_MODES.WALRUS_3D);
    expect(normalizeLayoutProjectionMode('other')).toBe(LAYOUT_PROJECTION_MODES.RADIAL);
    expect(normalizeHyperbolicProjectionStrength(-1)).toBe(0);
    expect(normalizeHyperbolicProjectionStrength(2)).toBe(1);
  });

  it('magnifies interior radii while preserving the outer boundary', () => {
    const { root, internalNode, leafNode } = makeRoot();

    applyHyperbolicRadialProjection(root, { strength: 1, maxRadius: 100 });

    expect(internalNode.radius).toBeGreaterThan(50);
    expect(leafNode.radius).toBeCloseTo(100);
    expect(internalNode.hyperbolicOriginalRadius).toBe(50);
    expect(internalNode.projectionMode).toBe(LAYOUT_PROJECTION_MODES.HYPERBOLIC);
    expect(Math.hypot(internalNode.x, internalNode.y)).toBeCloseTo(internalNode.radius);
  });

  it('leaves geometry unchanged at zero strength', () => {
    const { root, internalNode, leafNode } = makeRoot();

    applyHyperbolicRadialProjection(root, { strength: 0, maxRadius: 100 });

    expect(internalNode.radius).toBe(50);
    expect(leafNode.radius).toBe(100);
    expect(internalNode.hyperbolicProjectionStrength).toBe(0);
  });

  it('assigns Walrus-style 3D ball coordinates', () => {
    const { root, internalNode, leafNode } = makeRoot();

    applyWalrus3dProjection(root, { strength: 1, maxRadius: 100 });

    expect(internalNode.projectionMode).toBe(LAYOUT_PROJECTION_MODES.WALRUS_3D);
    expect(leafNode.position).toHaveLength(3);
    expect(leafNode.position.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...leafNode.position)).toBeCloseTo(leafNode.radius);
    expect(leafNode.radius).toBeCloseTo(100);
    expect(internalNode.h3SubtreeRadius).toBeGreaterThan(0);
    expect(leafNode.h3Distance).toBeGreaterThan(internalNode.h3Distance);
  });

  it('uses true 3D depth when H3 places a branching hemisphere', () => {
    const root = makeFlatRoot(3);

    applyWalrus3dProjection(root, { strength: 1, maxRadius: 100 });

    expect(root.children.some((child) => Math.abs(child.position[2]) > 1e-9)).toBe(true);
  });

  it('uses Walrus H3 subtree radii rather than leaf-count area estimates', () => {
    const root = makeFlatRoot(2);

    applyWalrus3dProjection(root, { strength: 1, maxRadius: 100 });

    const [firstLeaf, secondLeaf] = root.children;
    const expectedLeafRadius = h3Radius(H3_TEST_LEAF_AREA);
    const expectedRootRadius = h3Radius(
      H3_TEST_HEMISPHERE_AREA_SCALE *
        (h3CircleArea(expectedLeafRadius) + h3CircleArea(expectedLeafRadius))
    );

    expect(firstLeaf.h3SubtreeRadius).toBeCloseTo(expectedLeafRadius, 12);
    expect(secondLeaf.h3SubtreeRadius).toBeCloseTo(expectedLeafRadius, 12);
    expect(root.h3SubtreeRadius).toBeCloseTo(expectedRootRadius, 12);
  });

  it('places a single child at the H3 parent cone mouth in the Klein ball', () => {
    const root = makeFlatRoot(1);

    applyWalrus3dProjection(root, { strength: 1, maxRadius: 100 });

    const [leaf] = root.children;
    const expectedUnitRadius = h3EuclideanDistance(root.h3SubtreeRadius);

    expect(leaf.h3ProjectedUnitRadius).toBeCloseTo(expectedUnitRadius, 12);
    expect(leaf.h3KleinPosition[0]).toBeCloseTo(expectedUnitRadius, 12);
    expect(leaf.h3KleinPosition[1]).toBeCloseTo(0, 12);
    expect(leaf.h3KleinPosition[2]).toBeCloseTo(0, 12);
  });

  it('uses split identity instead of parser child order for equal H3 radii', () => {
    const forward = makeSplitRoot([0, 1]);
    const reversed = makeSplitRoot([1, 0]);

    applyWalrus3dProjection(forward, { strength: 1, maxRadius: 100 });
    applyWalrus3dProjection(reversed, { strength: 1, maxRadius: 100 });

    const forwardZero = findBySplit(forward, 0);
    const reversedZero = findBySplit(reversed, 0);
    const forwardOne = findBySplit(forward, 1);
    const reversedOne = findBySplit(reversed, 1);

    expect(reversedZero.position).toEqual(forwardZero.position);
    expect(reversedOne.position).toEqual(forwardOne.position);
  });

  it('keeps stable clade order for near-tie H3 radii', () => {
    const root = makeNearTieSplitRoot();

    applyWalrus3dProjection(root, { strength: 1, maxRadius: 100 });

    const smallerStableFirstClade = findExactSplit(
      root,
      Array.from({ length: 8 }, (_value, index) => index)
    );
    const largerStableSecondClade = findExactSplit(
      root,
      Array.from({ length: 9 }, (_value, index) => index + 100)
    );
    const relativeRadiusDelta =
      Math.abs(smallerStableFirstClade.h3SubtreeRadius - largerStableSecondClade.h3SubtreeRadius) /
      Math.max(smallerStableFirstClade.h3SubtreeRadius, largerStableSecondClade.h3SubtreeRadius);

    expect(relativeRadiusDelta).toBeLessThan(0.1);
    expect(angularDistance(smallerStableFirstClade.h3Theta, largerStableSecondClade.h3Theta)).toBeCloseTo(
      Math.PI
    );
  });

  it('keeps an unchanged clade azimuth stable when a sibling clade splits', () => {
    const binarySibling = makeSiblingSplitTransitionRoot(false);
    const splitSibling = makeSiblingSplitTransitionRoot(true);

    applyWalrus3dProjection(binarySibling, { strength: 1, maxRadius: 100 });
    applyWalrus3dProjection(splitSibling, { strength: 1, maxRadius: 100 });

    const stableInBinary = findExactSplit(binarySibling, [0, 1, 2, 3]);
    const stableAfterSplit = findExactSplit(splitSibling, [0, 1, 2, 3]);

    expect(stableAfterSplit.h3Theta).toBeCloseTo(stableInBinary.h3Theta);
    expect(stableAfterSplit.h3DisplayScale).toBeCloseTo(stableInBinary.h3DisplayScale);
  });
});
