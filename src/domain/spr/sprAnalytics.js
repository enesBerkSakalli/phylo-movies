import {
  flattenSplitSets,
  getMapValueBySplitIdentity,
  parseBackendSplitKey,
  toBackendSplitKey,
} from '../tree/splits.js';

/**
 * Normalize a moving subtree split into a stable, sorted list of leaf indices.
 *
 * @param {Array<number>|Set<number>} subtreeSplitIndices
 * @returns {Array<number>}
 */
export function normalizeSubtreeIndices(subtreeSplitIndices) {
  const values = subtreeSplitIndices instanceof Set
    ? Array.from(subtreeSplitIndices)
    : subtreeSplitIndices;

  if (!Array.isArray(values)) return [];

  return values
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

/**
 * Generate a canonical signature for a moving subtree.
 *
 * @param {Array<number>|Set<number>} subtreeSplitIndices
 * @returns {string|null}
 */
export function getSubtreeSignature(subtreeSplitIndices) {
  const sortedIndices = normalizeSubtreeIndices(subtreeSplitIndices);
  if (sortedIndices.length === 0) return null;
  return sortedIndices.map(String).join(',');
}

function normalizeHighlightGroup(highlightGroup) {
  if (!Array.isArray(highlightGroup)) return [];

  return highlightGroup
    .map(normalizeSubtreeIndices)
    .filter((subtree) => subtree.length > 0);
}

function flattenHighlightGroup(highlightGroup) {
  return normalizeSubtreeIndices(
    Array.from(new Set(highlightGroup.flatMap((subtree) => subtree)))
  );
}

/**
 * Extract moving subtrees from one backend jumping_subtree_solutions value.
 *
 * Backend shape:
 * { "[pivot_edge_indices]": [ [ [subtree1], [subtree2] ] ] }
 *
 * @param {Array} solutionSets
 * @returns {Array<Array<number>>}
 */
export function extractMovingSubtrees(solutionSets) {
  return flattenSplitSets(solutionSets)
    .map(normalizeSubtreeIndices)
    .filter((subtree) => subtree.length > 0);
}

/**
 * Build the canonical SPR move-event ledger.
 *
 * One row represents one backend spr_move_events entry. Pair solutions without
 * spr_move_events do not produce SPR analytics rows.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @param {Object} options
 * @param {Array<number>} options.robinsonFouldsDistances
 * @param {Array<number>} options.weightedRobinsonFouldsDistances
 * @param {Array<[number, number]>} options.pairInterpolationRanges
 * @returns {Array}
 */
export function buildSprMoveEventRows(pairSolutions, options = {}) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return [];

  const {
    robinsonFouldsDistances = [],
    weightedRobinsonFouldsDistances = [],
    pairInterpolationRanges = [],
  } = options;

  return Object.entries(pairSolutions)
    .flatMap(([pairKey, solution], entryIndex) => {
      const parsedPair = parsePairKey(pairKey);
      const pairIndex = resolvePairArrayIndex(pairKey, parsedPair, entryIndex, pairInterpolationRanges);
      const sourceTreeIndex = parsedPair?.sourceTreeIndex ?? null;
      const destinationTreeIndex = parsedPair?.destinationTreeIndex ?? null;
      const measuredEvents = Array.isArray(solution?.spr_move_events)
        ? solution.spr_move_events
        : [];
      const rawEvents = measuredEvents.map((event, eventIndex) => ({
        event,
        eventIndex,
      }));

      return rawEvents.map(({ event, eventIndex }) => {
        const driverSplitIndices = normalizeSubtreeIndices(event?.driver_subtree);
        const highlightGroup = normalizeHighlightGroup(event?.highlight_group);
        const eventGroup = highlightGroup.length > 0
          ? highlightGroup
          : (driverSplitIndices.length > 0 ? [driverSplitIndices] : []);
        const contextSplitIndices = flattenHighlightGroup(eventGroup);
        const splitIndices = driverSplitIndices.length > 0
          ? driverSplitIndices
          : contextSplitIndices;
        const signature = getSubtreeSignature(splitIndices);
        if (!signature) return null;

        const pivotEdge = normalizeSubtreeIndices(event?.pivot_edge);
        const pivotKey = pivotEdge.length > 0 ? toBackendSplitKey(pivotEdge) : null;
        const attachmentContext = pivotKey
          ? resolveMoveAttachmentContext(
            solution,
            pivotKey,
            splitIndices,
            eventGroup,
            contextSplitIndices
          )
          : null;
        const stepRange = normalizeStepRange(event?.step_range)
          ?? resolveStepRangeForPivot(solution, pivotEdge);
        const collapsePathLength = numberOrNull(event?.collapse_branch_length) ?? 0;
        const expandPathLength = numberOrNull(event?.expand_branch_length) ?? 0;

        return {
          eventId: `${pairKey}:${eventIndex}`,
          pairKey,
          pairIndex,
          sourceTreeIndex,
          destinationTreeIndex,
          pairLabel: formatPairLabel({
            pairKey,
            sourceTreeIndex,
            destinationTreeIndex,
          }),
          eventIndex,
          signature,
          splitIndices,
          driverSplitIndices,
          contextSplitIndices,
          highlightGroup: eventGroup,
          groupSize: eventGroup.length,
          taxaCount: splitIndices.length,
          pivotEdge,
          sourceAttachment: attachmentContext?.sourceAttachment ?? [],
          destinationAttachment: attachmentContext?.destinationAttachment ?? [],
          stepRange,
          collapseHops: numberOrNull(event?.collapse_hops) ?? 0,
          expandHops: numberOrNull(event?.expand_hops) ?? 0,
          totalPathHops: resolvePathHops(event),
          collapsePathLength,
          expandPathLength,
          totalPathLength: resolvePathLength(event),
          collapsePath: Array.isArray(event?.collapse_path) ? event.collapse_path : [],
          expandPath: Array.isArray(event?.expand_path) ? event.expand_path : [],
          interpolationRange: Array.isArray(pairInterpolationRanges[pairIndex])
            ? pairInterpolationRanges[pairIndex]
            : null,
          rfDistance: numberOrNull(robinsonFouldsDistances[pairIndex]),
          weightedRfDistance: numberOrNull(weightedRobinsonFouldsDistances[pairIndex]),
        };
      }).filter(Boolean);
    })
    .sort((a, b) => {
      if (a.pairIndex !== b.pairIndex) return a.pairIndex - b.pairIndex;
      return a.eventIndex - b.eventIndex;
    });
}

/**
 * Calculates recurrence rows for each unique moved subtree across SPR move events.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Array} Sorted array of moved subtree recurrence objects
 */
export function calculateSprMovedSubtreeRecurrences(pairSolutions) {
  return aggregateMovedSubtreeRows(buildSprMoveEventRows(pairSolutions));
}

function aggregateMovedSubtreeRows(eventRows) {
  const freqMap = new Map();

  eventRows.forEach((event) => {
    if (!freqMap.has(event.signature)) {
      freqMap.set(event.signature, {
        signature: event.signature,
        splitIndices: event.splitIndices,
        driverSplitIndices: event.driverSplitIndices,
        contextSplitIndices: event.contextSplitIndices,
        highlightGroup: event.highlightGroup,
        groupSize: event.groupSize,
        count: 0,
        totalPathHops: 0,
        totalPathLength: 0,
        pairKeys: new Set(),
        attachmentContexts: [],
      });
    }

    const movedSubtree = freqMap.get(event.signature);
    movedSubtree.count++;
    movedSubtree.pairKeys.add(event.pairKey);
    movedSubtree.totalPathHops += event.totalPathHops;
    movedSubtree.totalPathLength += event.totalPathLength;
    if (event.sourceAttachment.length > 0 || event.destinationAttachment.length > 0 || event.pivotEdge.length > 0) {
      movedSubtree.attachmentContexts.push({
        pivotEdge: event.pivotEdge,
        sourceAttachment: event.sourceAttachment,
        destinationAttachment: event.destinationAttachment,
        eventId: event.eventId,
      });
    }
  });

  const totalMoveEvents = Array.from(freqMap.values())
    .reduce((sum, item) => sum + item.count, 0);

  return Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: totalMoveEvents > 0
        ? (item.count / totalMoveEvents) * 100
        : 0,
      averagePathHops: item.count > 0
        ? item.totalPathHops / item.count
        : 0,
      averagePathLength: item.count > 0
        ? item.totalPathLength / item.count
        : 0,
      pairCount: item.pairKeys.size,
      pairKeys: Array.from(item.pairKeys).sort(),
    }));
}

/**
 * Build per-pair SPR activity rows with distance, transition-event, and size-class context.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @param {Object} options
 * @param {Array<number>} options.robinsonFouldsDistances
 * @param {Array<number>} options.weightedRobinsonFouldsDistances
 * @param {Array<[number, number]>} options.pairInterpolationRanges
 * @returns {Array}
 */
export function calculateSprPairActivity(pairSolutions, options = {}) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return [];

  const {
    robinsonFouldsDistances = [],
    weightedRobinsonFouldsDistances = [],
    pairInterpolationRanges = [],
  } = options;

  const eventRows = buildSprMoveEventRows(pairSolutions, options);
  const eventsByPair = eventRows.reduce((map, event) => {
    if (!map.has(event.pairKey)) map.set(event.pairKey, []);
    map.get(event.pairKey).push(event);
    return map;
  }, new Map());

  return Object.entries(pairSolutions)
    .map(([pairKey, solution], entryIndex) => {
      const parsedPair = parsePairKey(pairKey);
      const pairIndex = resolvePairArrayIndex(pairKey, parsedPair, entryIndex, pairInterpolationRanges);
      const events = eventsByPair.get(pairKey) ?? [];
      const movedSubtrees = aggregateMovedSubtreeRows(events);
      const sprMoveEventCount = events.length;
      const singleTaxonMoveEventCount = events
        .filter((event) => event.splitIndices.length === 1).length;
      const multiTaxonMoveEventCount = events
        .filter((event) => event.splitIndices.length > 1).length;
      const topMovedSubtree = movedSubtrees[0] || null;
      const pathStats = summarizeSprEventRows(events);

      return {
        pairKey,
        pairIndex,
        sourceTreeIndex: parsedPair?.sourceTreeIndex ?? null,
        destinationTreeIndex: parsedPair?.destinationTreeIndex ?? null,
        interpolationRange: Array.isArray(pairInterpolationRanges[pairIndex])
          ? pairInterpolationRanges[pairIndex]
          : null,
        rfDistance: numberOrNull(robinsonFouldsDistances[pairIndex]),
        weightedRfDistance: numberOrNull(weightedRobinsonFouldsDistances[pairIndex]),
        uniqueMovedSubtreeCount: movedSubtrees.length,
        singleTaxonMoveEventCount,
        multiTaxonMoveEventCount,
        transitionEventCount: Array.isArray(solution?.split_change_events)
          ? solution.split_change_events.length
          : 0,
        sprMoveEventCount,
        totalPathHops: pathStats.totalPathHops,
        averagePathHops: pathStats.averagePathHops,
        totalPathLength: pathStats.totalPathLength,
        averagePathLength: pathStats.averagePathLength,
        topMovedSubtree,
        movedSubtrees,
        events,
      };
    })
    .sort((a, b) => a.pairIndex - b.pairIndex);
}

/**
 * Summarize dataset-level SPR activity without conflating transition events and moved subtrees.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @param {Object} options - Same options accepted by calculateSprPairActivity
 * @returns {Object}
 */
export function calculateSprDatasetSummary(pairSolutions, options = {}) {
  const pairActivity = calculateSprPairActivity(pairSolutions, options);
  const movedSubtreeRecurrences = calculateSprMovedSubtreeRecurrences(pairSolutions);
  const sprMoveEventCount = pairActivity
    .reduce((sum, row) => sum + row.sprMoveEventCount, 0);
  const totalPathHops = pairActivity
    .reduce((sum, row) => sum + row.totalPathHops, 0);
  const totalPathLength = pairActivity
    .reduce((sum, row) => sum + row.totalPathLength, 0);

  return {
    pairCount: pairActivity.length,
    activePairCount: pairActivity.filter((row) => row.sprMoveEventCount > 0).length,
    transitionEventCount: pairActivity
      .reduce((sum, row) => sum + row.transitionEventCount, 0),
    uniqueMovedSubtreeCount: movedSubtreeRecurrences.length,
    singleTaxonMoveEventCount: pairActivity
      .reduce((sum, row) => sum + row.singleTaxonMoveEventCount, 0),
    multiTaxonMoveEventCount: pairActivity
      .reduce((sum, row) => sum + row.multiTaxonMoveEventCount, 0),
    topMovedSubtreeSharePercentage: movedSubtreeRecurrences[0]?.percentage ?? 0,
    sprMoveEventCount,
    totalPathHops,
    averagePathHops: sprMoveEventCount > 0
      ? totalPathHops / sprMoveEventCount
      : 0,
    totalPathLength,
    averagePathLength: sprMoveEventCount > 0
      ? totalPathLength / sprMoveEventCount
      : 0,
    farthestMovedSubtree: selectFarthestMovedSubtree(movedSubtreeRecurrences),
  };
}

/**
 * Format pair activity rows for charting SPR activity over neighboring anchor-tree pairs.
 *
 * SPR activity is represented as move events per pair. RFD and W-RFD are carried
 * as topology-distance context, not folded into the activity score.
 *
 * @param {Array} pairActivityRows - Result from calculateSprPairActivity
 * @returns {Array}
 */
export function buildSprActivityTimelinePoints(pairActivityRows) {
  if (!Array.isArray(pairActivityRows)) return [];

  return pairActivityRows.map((row) => ({
    pairIndex: row.pairIndex,
    pairKey: row.pairKey,
    pairLabel: formatPairLabel(row),
    sprMoveEvents: row.sprMoveEventCount,
    uniqueMovedSubtrees: row.uniqueMovedSubtreeCount,
    singleTaxonMoveEventCount: row.singleTaxonMoveEventCount,
    multiTaxonMoveEventCount: row.multiTaxonMoveEventCount,
    topMovedSubtreeSignature: row.topMovedSubtree?.signature ?? null,
  }));
}

/**
 * Returns the top N recurrent moved subtrees.
 *
 * @param {Array} recurrences - Result from calculateSprMovedSubtreeRecurrences
 * @param {number} n - Number of top items to return
 */
export function getTopSprMovedSubtreeRecurrences(recurrences, n = 5) {
  return recurrences.slice(0, n);
}

/**
 * Formats a subtree split list into a readable label showing all taxa names.
 *
 * @param {Array<number>} splitIndices - Array of leaf indices defining the subtree
 * @param {Array<string>} leafNames - Array of leaf names
 */
export function formatSubtreeLabel(splitIndices, leafNames = []) {
  if (!splitIndices || splitIndices.length === 0) return 'Empty Subtree';

  if (leafNames && leafNames.length > 0) {
    const names = splitIndices
      .map((idx) => leafNames[idx])
      .filter(Boolean);

    if (names.length === 0) {
      return `Nodes: ${splitIndices.join(', ')}`;
    }

    return names.join(', ');
  }

  return `Nodes: ${splitIndices.join(', ')}`;
}

/**
 * Calculates which tree pairs each moving subtree appears in.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Map<string, Map<number, number>>} Map of signature -> per-pair occurrence counts
 */
export function calculateSprTemporalDistribution(pairSolutions) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return new Map();

  const temporalMap = new Map();

  Object.entries(pairSolutions).forEach(([pairKey, solution]) => {
    const jumpingSolutions = solution?.jumping_subtree_solutions;
    if (!jumpingSolutions) return;

    const timeIndex = parsePairTimeIndex(pairKey);
    if (timeIndex === null) return;

    Object.values(jumpingSolutions).forEach((solutionSets) => {
      extractMovingSubtrees(solutionSets).forEach((splitIndices) => {
        const signature = getSubtreeSignature(splitIndices);
        if (!signature) return;

        if (!temporalMap.has(signature)) {
          temporalMap.set(signature, new Map());
        }

        const countsByTime = temporalMap.get(signature);
        countsByTime.set(timeIndex, (countsByTime.get(timeIndex) || 0) + 1);
      });
    });
  });

  return temporalMap;
}

function summarizeSprEventRows(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      totalPathHops: 0,
      averagePathHops: 0,
      totalPathLength: 0,
      averagePathLength: 0,
    };
  }

  const totals = events.reduce((sum, event) => {
    sum.totalPathHops += event.totalPathHops;
    sum.totalPathLength += event.totalPathLength;
    return sum;
  }, { totalPathHops: 0, totalPathLength: 0 });

  return {
    totalPathHops: totals.totalPathHops,
    averagePathHops: totals.totalPathHops / events.length,
    totalPathLength: totals.totalPathLength,
    averagePathLength: totals.totalPathLength / events.length,
  };
}

function selectFarthestMovedSubtree(movedSubtrees) {
  if (!Array.isArray(movedSubtrees) || movedSubtrees.length === 0) return null;

  const candidates = movedSubtrees.filter((movedSubtree) => movedSubtree.count > 0);
  if (candidates.length === 0) return null;

  return candidates
    .slice()
    .sort((a, b) => {
      const lengthDelta = b.totalPathLength - a.totalPathLength;
      if (lengthDelta !== 0) return lengthDelta;

      const hopDelta = b.totalPathHops - a.totalPathHops;
      if (hopDelta !== 0) return hopDelta;

      return b.count - a.count;
    })[0];
}

function resolvePairArrayIndex(pairKey, parsedPair, entryIndex, pairInterpolationRanges) {
  if (parsedPair && Array.isArray(pairInterpolationRanges)) {
    const rangeIndex = pairInterpolationRanges.findIndex((range) => (
      Array.isArray(range)
      && range[0] === parsedPair.sourceTreeIndex
      && range[1] === parsedPair.destinationTreeIndex
    ));
    if (rangeIndex >= 0) return rangeIndex;
  }

  if (parsedPair?.sourceTreeIndex !== undefined) return parsedPair.sourceTreeIndex;
  return entryIndex;
}

function resolvePathHops(event) {
  const total = numberOrNull(event?.total_hops);
  if (total !== null) return total;

  const collapse = numberOrNull(event?.collapse_hops) ?? 0;
  const expand = numberOrNull(event?.expand_hops) ?? 0;
  return collapse + expand;
}

function resolvePathLength(event) {
  const total = numberOrNull(event?.total_branch_length);
  if (total !== null) return total;

  const collapse = numberOrNull(event?.collapse_branch_length) ?? 0;
  const expand = numberOrNull(event?.expand_branch_length) ?? 0;
  return collapse + expand;
}

function resolveMoveAttachmentContext(solution, pivotKey, splitIndices, highlightGroup, contextSplitIndices) {
  const driverContext = resolveAttachmentContext(
    solution,
    pivotKey,
    splitIndices,
    splitIndices
  );
  if (driverContext) return driverContext;

  return resolveGroupAttachmentContext(
    solution,
    pivotKey,
    highlightGroup,
    contextSplitIndices
  );
}

function resolveGroupAttachmentContext(solution, pivotKey, highlightGroup, groupSplitIndices) {
  const groupContext = resolveAttachmentContext(
    solution,
    pivotKey,
    groupSplitIndices,
    groupSplitIndices
  );
  if (groupContext) return groupContext;

  const contexts = highlightGroup
    .map((subtree) => resolveAttachmentContext(
      solution,
      pivotKey,
      subtree,
      groupSplitIndices
    ))
    .filter(Boolean);

  if (contexts.length === 0) return null;

  return {
    pivotEdge: contexts[0].pivotEdge,
    sourceAttachment: mergeIndexLists(
      contexts.map((context) => context.sourceAttachment)
    ),
    destinationAttachment: mergeIndexLists(
      contexts.map((context) => context.destinationAttachment)
    ),
  };
}

function resolveAttachmentContext(solution, pivotKey, splitIndices, excludedIndices = splitIndices) {
  const sourceMap = getMapValueBySplitIdentity(solution?.solution_to_source_map, pivotKey);
  const destinationMap = getMapValueBySplitIdentity(solution?.solution_to_destination_map, pivotKey);
  if (!sourceMap && !destinationMap) return null;

  const moverKey = toBackendSplitKey(splitIndices);
  const sourceEdge = getMapValueBySplitIdentity(sourceMap, moverKey);
  const destinationEdge = getMapValueBySplitIdentity(destinationMap, moverKey);
  if (!Array.isArray(sourceEdge) && !Array.isArray(destinationEdge)) return null;

  const movingSet = new Set(excludedIndices);
  return {
    pivotEdge: parseBackendSplitKey(pivotKey),
    sourceAttachment: filterMovingNodes(sourceEdge, movingSet),
    destinationAttachment: filterMovingNodes(destinationEdge, movingSet),
  };
}

function mergeIndexLists(lists) {
  return normalizeSubtreeIndices(
    Array.from(new Set(lists.flatMap((list) => (
      Array.isArray(list) ? list : []
    ))))
  );
}

function filterMovingNodes(edge, movingSet) {
  if (!Array.isArray(edge)) return [];
  return normalizeSubtreeIndices(edge).filter((leaf) => !movingSet.has(leaf));
}

function normalizeStepRange(stepRange) {
  if (!Array.isArray(stepRange) || stepRange.length < 2) return null;
  const start = numberOrNull(stepRange[0]);
  const end = numberOrNull(stepRange[1]);
  return start !== null && end !== null ? [start, end] : null;
}

function resolveStepRangeForPivot(solution, pivotEdge) {
  const pivotSignature = getSubtreeSignature(pivotEdge);
  if (!pivotSignature || !Array.isArray(solution?.split_change_events)) return null;

  const match = solution.split_change_events.find((event) => (
    getSubtreeSignature(event?.split) === pivotSignature
  ));
  return normalizeStepRange(match?.step_range);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPairLabel(row) {
  if (row?.sourceTreeIndex !== null && row?.sourceTreeIndex !== undefined
    && row?.destinationTreeIndex !== null && row?.destinationTreeIndex !== undefined) {
    return `${row.sourceTreeIndex} -> ${row.destinationTreeIndex}`;
  }
  return row?.pairKey || '';
}

function parsePairKey(pairKey) {
  const match = /^pair_(\d+)_(\d+)$/.exec(pairKey);
  if (!match) return null;
  return {
    sourceTreeIndex: Number(match[1]),
    destinationTreeIndex: Number(match[2]),
  };
}

export function parsePairTimeIndex(pairKey) {
  const match = /^pair_(\d+)_\d+$/.exec(pairKey);
  if (match) {
    return Number(match[1]);
  }
  return null;
}
