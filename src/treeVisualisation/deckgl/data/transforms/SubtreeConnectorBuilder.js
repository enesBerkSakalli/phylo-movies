import { flattenSplitSets, getBackendSplitMapValue } from '../../../../domain/tree/splits.js';
import {
  normalizeConnectorSubtreeHighlightsToSets,
  toConnectorSubtreeSetList
} from './ConnectorSplitNormalization.js';
import { buildRawConnectorConnections } from './ConnectorRawConnections.js';
import {
  sortConnectorConnectionsByAngle,
  splitActivePassiveConnectorConnections
} from './ConnectorConnectionOrdering.js';
import { groupPassiveConnectorConnections } from './ConnectorPassiveGroups.js';
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
    affectedSubtreesBySplit,
    pivotEdge,
    colorManager,
    subtreeHighlightTracking,
    frameIndex,
    subtreeHighlightsEnabled = true,
    linkConnectionOpacity = 0.6,
    leftCenter = DEFAULT_CENTER,
    rightCenter = DEFAULT_CENTER,
    leftRadius,
    rightRadius,
  } = options;

  const subtreesForPivot = getBackendSplitMapValue(affectedSubtreesBySplit, pivotEdge);
  const flattenedSubtrees = flattenSplitSets(subtreesForPivot || []);
  if (flattenedSubtrees.length === 0) {
    return [];
  }

  const jumpingSubtreeSets = toConnectorSubtreeSetList(flattenedSubtrees);
  const currentSubtreeSets = normalizeConnectorSubtreeHighlightsToSets(subtreeHighlightTracking?.[frameIndex]);
  const rawConnections = buildRawConnectorConnections({
    leftPositions,
    rightPositions,
    jumpingSubtreeSets,
    currentSubtreeSets,
    colorManager,
    subtreeHighlightsEnabled,
    linkConnectionOpacity,
  });
  if (!rawConnections.length) {
    return [];
  }

  const sortedConnections = sortConnectorConnectionsByAngle(rawConnections, leftCenter, rightCenter);
  const { activeConnections, passiveConnections } = splitActivePassiveConnectorConnections(sortedConnections);
  const passiveConnectionGroups = groupPassiveConnectorConnections(passiveConnections, leftPositions, rightPositions);
  return buildConnectorPathConnections({
    activeConnections,
    passiveConnectionGroups,
    leftCenter,
    rightCenter,
    leftRadius,
    rightRadius,
    leftPositions,
    rightPositions,
  });
}
