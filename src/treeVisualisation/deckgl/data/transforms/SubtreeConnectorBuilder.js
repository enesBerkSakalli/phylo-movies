import { flattenSplitSets, getBackendSplitMapValue } from '../../../utils/splitMatching.js';
import {
  normalizeConnectorSubtreeTrackingToSets,
  toConnectorSubtreeSetList
} from './ConnectorSplitNormalization.js';
import { buildRawConnectorConnections } from './ConnectorRawConnections.js';
import {
  sortConnectorConnectionsByAngle,
  splitActivePassiveConnectorConnections
} from './ConnectorConnectionOrdering.js';
import { buildConnectorPathConnections } from './ConnectorPathBuilder.js';

const DEFAULT_CENTER = [0, 0];

/**
 * SubtreeConnectorBuilder
 * Prepares connector data for moving subtrees between two comparison trees.
 */
export function buildSubtreeConnectors(options) {
  const {
    leftPositions,
    rightPositions,
    latticeSolutions,
    pivotEdge,
    colorManager,
    subtreeTracking,
    currentTreeIndex,
    markedSubtreesEnabled = true,
    linkConnectionOpacity = 0.6,
    leftCenter = DEFAULT_CENTER,
    rightCenter = DEFAULT_CENTER,
    leftRadius,
    rightRadius,
  } = options;

  const solutionForPivot = getBackendSplitMapValue(latticeSolutions, pivotEdge);
  const flattenedSubtrees = flattenSplitSets(solutionForPivot || []);
  if (flattenedSubtrees.length === 0) {
    return [];
  }

  const jumpingSubtreeSets = toConnectorSubtreeSetList(flattenedSubtrees);
  const currentSubtreeSets = normalizeConnectorSubtreeTrackingToSets(subtreeTracking?.[currentTreeIndex]);
  const rawConnections = buildRawConnectorConnections({
    leftPositions,
    rightPositions,
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    markedSubtreesEnabled,
    linkConnectionOpacity,
  });
  if (!rawConnections.length) {
    return [];
  }

  const sortedConnections = sortConnectorConnectionsByAngle(rawConnections, leftCenter, rightCenter);
  const { activeConnections, passiveConnections } = splitActivePassiveConnectorConnections(sortedConnections);
  return buildConnectorPathConnections({
    activeConnections,
    passiveConnections,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftPositions,
    rightPositions,
  });
}
