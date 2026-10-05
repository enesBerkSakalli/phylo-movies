import { buildBundledBezierPath } from '../../builders/geometry/connectors/ConnectorGeometryBuilder.js';
import { getBundleAncestor, pushOutward, chooseBundlePoint } from './ComparisonGeometryUtils.js';

const CONNECTOR_PATH_SAMPLES = 24;

const indexById = (positions) =>
  new Map(
    Array.from(positions.values())
      .filter((info) => info.id)
      .map((info) => [info.id, info])
  );

const groupBy = (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return Array.from(groups.values());
};

export function buildConnectorPathConnections({
  activeConnections,
  passiveConnections,
  leftCenter,
  rightCenter,
  leftRadius,
  rightRadius,
  leftPositions,
  rightPositions,
}) {
  const leftInfoById = indexById(leftPositions);
  const rightInfoById = indexById(rightPositions);
  const paths = [];

  const bundlePoints = (group) => [
    chooseBundlePoint(group, leftCenter, leftRadius, true, leftInfoById),
    chooseBundlePoint(group, rightCenter, rightRadius, false, rightInfoById),
  ];
  const emit = (group, srcPoint, dstPoint, bundlingStrength, width, idPrefix) =>
    group.forEach((connection, index) => {
      const path = buildBundledBezierPath(
        connection.source,
        connection.target,
        srcPoint,
        dstPoint,
        CONNECTOR_PATH_SAMPLES,
        { bundlingStrength, sourceCenter: leftCenter, targetCenter: rightCenter }
      );
      if (path.length) {
        paths.push({ ...connection, id: `${connection.id}${idPrefix}${index}`, path, width });
      }
    });

  // Passive: loose, thin bundles per pair of top-level ancestors; drawn first.
  groupBy(
    passiveConnections,
    ({ sourceInfo, targetInfo }) =>
      `${getBundleAncestor(sourceInfo, leftInfoById).id}|${getBundleAncestor(targetInfo, rightInfoById).id}`
  ).forEach((group) => emit(group, ...bundlePoints(group), 0.85, 1.5, '-'));

  // Active: tight, thick bundles per moving subtree, pushed outward to ride over the passive ones.
  groupBy(activeConnections, (connection) => connection.bundleGroupKey).forEach(
    (group, groupIndex) => {
      const [srcPoint, dstPoint] = bundlePoints(group);
      emit(
        group,
        pushOutward(srcPoint, leftCenter, 1.08),
        pushOutward(dstPoint, rightCenter, 1.08),
        0.5,
        3.0,
        `-active-${groupIndex}-`
      );
    }
  );

  return paths;
}
