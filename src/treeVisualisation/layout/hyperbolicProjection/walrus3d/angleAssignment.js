import { H3_EPSILON } from './constants.js';
import {
  clamp,
  computeH3DeltaPhi,
  computeH3DeltaTheta,
  distance3,
  h3EuclideanDistance,
  safeDivide,
} from './hyperboloidMath.js';
import { getH3SplitValues, sortH3Children, uniqueSortedNumbers } from './subtreeMetrics.js';

export function assignH3Angles(root) {
  root.eachAfter((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) return;

    const sortedChildren = sortH3Children(children);
    assignH3AnglesForChildren(sortedChildren, node.h3SubtreeRadius, node.depth || 0, node);
  });
}

function assignH3AnglesForChildren(children, parentRadius, level, parent) {
  const count = children.length;
  if (count === 0) return;

  const first = children[0];
  first.h3Theta = 0;
  first.h3Phi = 0;

  if (count === 1) return;

  if (count === 2) {
    const second = children[1];
    const firstPhi = computeH3DeltaPhi(first.h3SubtreeRadius, parentRadius);
    const secondPhi = computeH3DeltaPhi(second.h3SubtreeRadius, parentRadius);
    const totalPhi = firstPhi + secondPhi;

    first.h3Phi = totalPhi - firstPhi;
    second.h3Phi = totalPhi - secondPhi;
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  if (count === 3) {
    assignTernaryH3Angles(children, parentRadius);
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  if (count === 4) {
    assignFourChildH3Angles(children, parentRadius);
    assignStableH3ChildAngles(children, parentRadius, level, parent);
    return;
  }

  assignManyChildH3Angles(children, parentRadius);
  assignStableH3ChildAngles(children, parentRadius, level, parent);
}

function assignStableH3ChildAngles(children, parentRadius, level, parent) {
  const count = children.length;
  if (count === 0) return;
  if (count === 1) {
    children[0].h3Theta = 0;
    children[0].h3Phi = 0;
    return;
  }

  const leafRanks = getH3ParentLeafRanks(parent, children);
  const parentLeafCount = leafRanks ? leafRanks.order.length : 0;
  const parentLeafCenter = parentLeafCount > 0 ? (parentLeafCount - 1) / 2 : 0;
  const fallbackWeights = children.map((child) => Math.max(1, Number(child.h3LeafCount) || 1));
  const totalFallbackWeight = fallbackWeights.reduce((sum, value) => sum + value, 0);
  const firstFallbackCenter = fallbackWeights[0] / 2;
  const twist = level % 2 === 0 ? 0 : Math.PI / 2;
  let cumulativeWeight = 0;

  for (let index = 0; index < children.length; index += 1) {
    const fallbackCenter = cumulativeWeight + fallbackWeights[index] / 2;
    const stableCenter =
      leafRanks && parentLeafCount > 0 ? getH3ChildLeafCenter(children[index], leafRanks) : null;
    const normalizedCenter =
      stableCenter === null
        ? (fallbackCenter - firstFallbackCenter) / totalFallbackWeight
        : (stableCenter - parentLeafCenter) / parentLeafCount;
    children[index].h3Theta = twist + normalizedCenter * Math.PI * 2;
    children[index].h3Phi = computeH3DeltaPhi(children[index].h3SubtreeRadius, parentRadius);
    cumulativeWeight += fallbackWeights[index];
  }
}

function getH3ParentLeafRanks(parent, children) {
  const parentLeaves = getH3SplitValues(parent);
  const order =
    parentLeaves.length > 0
      ? parentLeaves
      : uniqueSortedNumbers(children.flatMap((child) => getH3SplitValues(child)));
  if (order.length === 0) return null;

  const rankByLeaf = new Map();
  order.forEach((leaf, index) => {
    rankByLeaf.set(leaf, index);
  });
  return { order, rankByLeaf };
}

function getH3ChildLeafCenter(child, leafRanks) {
  const leaves = getH3SplitValues(child);
  if (leaves.length === 0) return null;

  let sum = 0;
  let count = 0;
  for (const leaf of leaves) {
    const rank = leafRanks.rankByLeaf.get(leaf);
    if (rank === undefined) continue;
    sum += rank;
    count += 1;
  }
  return count > 0 ? sum / count : null;
}

function assignTernaryH3Angles(children, parentRadius) {
  const layout = computeTernaryH3Layout(
    parentRadius,
    children[0].h3SubtreeRadius,
    children[1].h3SubtreeRadius,
    children[2].h3SubtreeRadius
  );
  children[0].h3Theta = layout.thetaA;
  children[0].h3Phi = layout.phiA;
  children[1].h3Theta = layout.thetaB;
  children[1].h3Phi = layout.phiB;
  children[2].h3Theta = layout.thetaC;
  children[2].h3Phi = layout.phiC;
}

function assignFourChildH3Angles(children, parentRadius) {
  const deltaPhi = children.map((child) => computeH3DeltaPhi(child.h3SubtreeRadius, parentRadius));
  const phi = deltaPhi.map(
    (value, index) =>
      (3 * value +
        deltaPhi[(index + 1) % 4] +
        deltaPhi[(index + 2) % 4] +
        deltaPhi[(index + 3) % 4]) *
      0.1667
  );
  const deltaTheta = children.map((child, index) =>
    computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, deltaPhi[index])
  );
  const excessTheta =
    (2 * (Math.PI - deltaTheta.reduce((sum, value) => sum + value, 0))) / children.length;

  let theta = deltaTheta[0];
  children[0].h3Theta = theta;
  children[0].h3Phi = phi[0];
  for (let index = 1; index < children.length; index += 1) {
    theta += deltaTheta[index - 1] + excessTheta + deltaTheta[index];
    children[index].h3Theta = theta;
    children[index].h3Phi = phi[index];
  }
}

function assignManyChildH3Angles(children, parentRadius) {
  assignTernaryH3Angles(children, parentRadius);

  const capBottomPhi = Math.max(
    children[0].h3Phi + computeH3DeltaPhi(children[0].h3SubtreeRadius, parentRadius),
    children[1].h3Phi + computeH3DeltaPhi(children[1].h3SubtreeRadius, parentRadius),
    children[2].h3Phi + computeH3DeltaPhi(children[2].h3SubtreeRadius, parentRadius)
  );

  let deltaPhi = computeH3DeltaPhi(children[3].h3SubtreeRadius, parentRadius);
  let phi = capBottomPhi + deltaPhi;
  let theta = computeH3DeltaTheta(children[3].h3SubtreeRadius, parentRadius, phi);
  children[3].h3Theta = theta;
  children[3].h3Phi = phi;
  theta += theta;

  let firstChildInBand = 3;
  for (let index = 4; index < children.length; index += 1) {
    const child = children[index];
    let deltaTheta = computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, phi);
    let centerTheta = theta + deltaTheta;

    if (centerTheta + deltaTheta > Math.PI * 2) {
      spreadH3ChildrenEvenly(children, firstChildInBand, index, Math.PI * 2 - theta);

      phi += deltaPhi;
      deltaPhi = computeH3DeltaPhi(child.h3SubtreeRadius, parentRadius);
      phi += deltaPhi;

      deltaTheta = computeH3DeltaTheta(child.h3SubtreeRadius, parentRadius, phi);
      centerTheta = deltaTheta;
      firstChildInBand = index;
    }

    child.h3Theta = centerTheta;
    child.h3Phi = phi;
    theta = centerTheta + deltaTheta;
  }

  spreadH3ChildrenEvenly(children, firstChildInBand, children.length - 1, Math.PI * 2 - theta);
}

function spreadH3ChildrenEvenly(children, first, last, excess) {
  const total = last - first + 1;
  if (total <= 1 || !Number.isFinite(excess)) return;
  for (let index = 1; index < total; index += 1) {
    children[first + index].h3Theta += (index * excess) / total;
  }
}

function computeTernaryH3Layout(parentRadius, radiusA, radiusB, radiusC) {
  const a = radiusB + radiusC;
  const b = radiusA + radiusC;
  const c = radiusA + radiusB;
  const x = safeDivide(b * b + c * c - a * a, 2 * b, 0);
  const y = Math.sqrt(Math.max(0, c * c - x * x));

  const centerA = [0, 0, 0];
  const centerB = [x, y, 0];
  const centerC = [b, 0, 0];
  const weightA = radiusA * radiusA;
  const weightB = radiusB * radiusB;
  const weightC = radiusC * radiusC;
  const totalWeight = Math.max(H3_EPSILON, weightA + weightB + weightC);
  const centroid = [
    (weightA * centerA[0] + weightB * centerB[0] + weightC * centerC[0]) / totalWeight,
    (weightA * centerA[1] + weightB * centerB[1] + weightC * centerC[1]) / totalWeight,
    0,
  ];

  const distanceC = distance3(centroid, centerC);
  const distanceB = distance3(centroid, centerB);
  const distanceA = distance3(centroid, centerA);

  return {
    thetaA: -computeTriangleAngle(distanceA, distanceC, radiusA + radiusC),
    phiA: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceA), parentRadius),
    thetaB: computeTriangleAngle(distanceB, distanceC, radiusB + radiusC),
    phiB: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceB), parentRadius),
    thetaC: 0,
    phiC: 2 * computeH3DeltaPhi(h3EuclideanDistance(distanceC), parentRadius),
  };
}

function computeTriangleAngle(a, b, c) {
  const denominator = 2 * a * b;
  if (Math.abs(denominator) < H3_EPSILON) return 0;
  return Math.acos(clamp((a * a + b * b - c * c) / denominator, -1, 1));
}
