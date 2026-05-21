import {
  getBackendSplitMapValue,
  parseBackendSplitKey,
  toBackendSplitKey,
} from '../tree/splits.js';
import { classifyMovementSupport } from '../tree/branchSupportIndex.js';
import { TimelineEventIndex } from '../../timeline/data/TimelineEventIndex.js';

/**
 * Normalize a moving subtree split into a stable, sorted list of leaf indices.
 *
 * @param {Array<number>|Set<number>} subtreeSplitIndices
 * @returns {Array<number>}
 */
function normalizeSubtreeIndices(subtreeSplitIndices) {
  const values = subtreeSplitIndices instanceof Set
    ? Array.from(subtreeSplitIndices)
    : subtreeSplitIndices;

  return Array.from(values)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

/**
 * Generate a canonical signature for a moving subtree.
 *
 * @param {Array<number>|Set<number>} subtreeSplitIndices
 * @returns {string|null}
 */
function getSubtreeSignature(subtreeSplitIndices) {
  const sortedIndices = normalizeSubtreeIndices(subtreeSplitIndices);
  if (sortedIndices.length === 0) return null;
  return sortedIndices.map(String).join(',');
}

function normalizeHighlightGroup(highlightGroup) {
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
 * Build the canonical SPR move-event ledger.
 *
 * One row represents one normalized temporal_events spr_move entry. Pairs
 * without spr_move events do not produce SPR analytics rows.
 *
 * @param {Array} pairs - Normalized pair rows
 * @param {Object} options
 * @param {Array} options.temporalEvents
 * @param {Object} options.pairMetrics
 * @returns {Array}
 */
export function buildSprMoveEventRows(pairs, options = {}) {
  const context = createSprAnalyticsContext(pairs, options);
  return buildSprMoveEventRowsFromContext(pairs, options, context);
}

export function buildSprAnalyticsModel(pairs, options = {}) {
  const context = createSprAnalyticsContext(pairs, options);
  const eventRows = buildSprMoveEventRowsFromContext(pairs, options, context);
  const movedSubtreeRecurrences = aggregateMovedSubtreeRows(eventRows);
  const pairActivityRows = buildSprPairActivityRows(pairs, eventRows, context);
  const summary = summarizeSprDatasetRows(pairActivityRows, movedSubtreeRecurrences);

  return {
    eventRows,
    movedSubtreeRecurrences,
    pairActivityRows,
    summary,
  };
}

function createSprAnalyticsContext(pairs, options) {
  const {
    temporalEvents,
    pairMetrics,
  } = options;

  return {
    metricByPairId: buildMetricByPairId(pairMetrics),
    eventIndex: TimelineEventIndex.from({ pairs, temporalEvents }),
  };
}

function buildSprMoveEventRowsFromContext(pairs, options, context) {
  const {
    branchSupportIndex,
    supportThreshold = 70,
  } = options;
  const {
    metricByPairId,
    eventIndex,
  } = context;

  return pairs
    .flatMap((pair, entryIndex) => {
      const pairId = pair.pair_id;
      const pairIndex = Number.isInteger(pair.pair_ordinal) ? pair.pair_ordinal : entryIndex;
      const sourceInputTreeIndex = pair.source_input_tree_index;
      const targetInputTreeIndex = pair.target_input_tree_index;
      const solution = pair.solution;
      const rawEvents = eventIndex.getEventsForPair(pairId, 'spr_move');
      const metric = getPairMetric(metricByPairId, pairId);

      return rawEvents.map((event, eventIndex) => {
        const driverSplitIndices = normalizeSubtreeIndices(event.driver_subtree);
        const highlightGroup = normalizeHighlightGroup(event.highlight_group);
        const eventGroup = highlightGroup.length > 0
          ? highlightGroup
          : (driverSplitIndices.length > 0 ? [driverSplitIndices] : []);
        const contextSplitIndices = flattenHighlightGroup(eventGroup);
        const splitIndices = driverSplitIndices.length > 0
          ? driverSplitIndices
          : contextSplitIndices;
        const signature = getSubtreeSignature(splitIndices);
        if (!signature) return null;

        const pivotEdge = normalizeSubtreeIndices(event.pivot_edge);
        if (pivotEdge.length === 0) {
          throw new Error(`[sprAnalytics] spr_move ${event.event_id} in ${pairId} must include a non-empty pivot_edge`);
        }

        const pivotKey = toBackendSplitKey(pivotEdge);
        const attachmentContext = resolveMoveAttachmentContext(
          solution,
          pivotKey,
          splitIndices,
          eventGroup,
          contextSplitIndices
        );
        if (!attachmentContext) {
          throw new Error(`[sprAnalytics] spr_move ${event.event_id} in ${pairId} could not resolve attachment context for pivot_edge ${pivotKey}`);
        }

        const stepRange = normalizeStepRange(event.local_step_range);
        const collapsePathLength = event.collapse_branch_length;
        const expandPathLength = event.expand_branch_length;
        const sourceAttachmentSupport = branchSupportIndex?.getSupport?.(
          sourceInputTreeIndex,
          attachmentContext.sourceAttachment
        ) ?? null;
        const destinationAttachmentSupport = branchSupportIndex?.getSupport?.(
          targetInputTreeIndex,
          attachmentContext.destinationAttachment
        ) ?? null;
        const movedSubtreeSupport = branchSupportIndex?.getSupport?.(
          targetInputTreeIndex,
          splitIndices
        ) ?? null;

        return {
          eventId: event.event_id,
          pairId,
          pairIndex,
          pairOrdinal: pairIndex,
          sourceInputTreeIndex,
          targetInputTreeIndex,
          pairLabel: formatPairLabel({
            pairId,
            sourceInputTreeIndex,
            targetInputTreeIndex,
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
          sourceAttachment: attachmentContext.sourceAttachment,
          destinationAttachment: attachmentContext.destinationAttachment,
          sourceAttachmentSupport,
          destinationAttachmentSupport,
          movedSubtreeSupport,
          supportClass: classifyMovementSupport(
            sourceAttachmentSupport,
            destinationAttachmentSupport,
            supportThreshold
          ),
          stepRange,
          frameRange: normalizeStepRange(event.frame_range),
          collapseHops: event.collapse_hops,
          expandHops: event.expand_hops,
          totalPathHops: resolvePathHops(event),
          collapsePathLength,
          expandPathLength,
          totalPathLength: resolvePathLength(event),
          collapsePath: event.collapse_path,
          expandPath: event.expand_path,
          interpolationRange: [pair.source_frame_index, pair.target_frame_index],
          generatedFrameRange: pair.generated_frame_range,
          rfDistance: metric.robinson_foulds,
          weightedRfDistance: metric.weighted_robinson_foulds,
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
 * @param {Array} pairs - Normalized pair rows
 * @returns {Array} Sorted array of moved subtree recurrence objects
 */
export function calculateSprMovedSubtreeRecurrences(pairs, options = {}) {
  return aggregateMovedSubtreeRows(buildSprMoveEventRows(pairs, options));
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
        pairIds: new Set(),
        attachmentContexts: [],
      });
    }

    const movedSubtree = freqMap.get(event.signature);
    movedSubtree.count++;
    movedSubtree.pairIds.add(event.pairId);
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
      pairCount: item.pairIds.size,
      pairIds: Array.from(item.pairIds).sort(),
    }));
}

/**
 * Build per-pair SPR activity rows with distance, transition-event, and size-class context.
 *
 * @param {Array} pairs - Normalized pair rows
 * @param {Object} options
 * @param {Array} options.temporalEvents
 * @param {Object} options.pairMetrics
 * @returns {Array}
 */
export function calculateSprPairActivity(pairs, options = {}) {
  const context = createSprAnalyticsContext(pairs, options);
  const eventRows = buildSprMoveEventRowsFromContext(pairs, options, context);
  return buildSprPairActivityRows(pairs, eventRows, context);
}

function buildSprPairActivityRows(pairs, eventRows, context) {
  const {
    metricByPairId,
    eventIndex,
  } = context;
  const eventsByPair = eventRows.reduce((map, event) => {
    map.get(event.pairId).push(event);
    return map;
  }, new Map(pairs.map((pair) => [pair.pair_id, []])));

  return pairs
    .map((pair, entryIndex) => {
      const pairId = pair.pair_id;
      const pairIndex = Number.isInteger(pair.pair_ordinal) ? pair.pair_ordinal : entryIndex;
      const events = eventsByPair.get(pairId);
      const movedSubtrees = aggregateMovedSubtreeRows(events);
      const sprMoveEventCount = events.length;
      const singleTaxonMoveEventCount = events
        .filter((event) => event.splitIndices.length === 1).length;
      const multiTaxonMoveEventCount = events
        .filter((event) => event.splitIndices.length > 1).length;
      const topMovedSubtree = movedSubtrees[0] || null;
      const pathStats = summarizeSprEventRows(events);
      const metric = getPairMetric(metricByPairId, pairId);

      return {
        pairId,
        pairIndex,
        pairOrdinal: pairIndex,
        sourceInputTreeIndex: pair.source_input_tree_index,
        targetInputTreeIndex: pair.target_input_tree_index,
        interpolationRange: [pair.source_frame_index, pair.target_frame_index],
        generatedFrameRange: pair.generated_frame_range,
        rfDistance: metric.robinson_foulds,
        weightedRfDistance: metric.weighted_robinson_foulds,
        uniqueMovedSubtreeCount: movedSubtrees.length,
        singleTaxonMoveEventCount,
        multiTaxonMoveEventCount,
        transitionEventCount: eventIndex.countEventsForPair(pairId, 'split_change'),
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
 * @param {Array} pairs - Normalized pair rows
 * @param {Object} options - Same options accepted by calculateSprPairActivity
 * @returns {Object}
 */
export function calculateSprDatasetSummary(pairs, options = {}) {
  return buildSprAnalyticsModel(pairs, options).summary;
}

function summarizeSprDatasetRows(pairActivity, movedSubtreeRecurrences) {
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
    topMovedSubtreeSharePercentage: movedSubtreeRecurrences[0] ? movedSubtreeRecurrences[0].percentage : 0,
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
 * Format pair activity rows for charting SPR activity over neighboring input-tree pairs.
 *
 * SPR activity is represented as move events per pair. RFD and W-RFD are carried
 * as topology-distance context, not folded into the activity score.
 *
 * @param {Array} pairActivityRows - Result from calculateSprPairActivity
 * @returns {Array}
 */
export function buildSprActivityTimelinePoints(pairActivityRows) {
  return pairActivityRows.map((row) => ({
    pairIndex: row.pairIndex,
    pairId: row.pairId,
    pairLabel: formatPairLabel(row),
    sprMoveEvents: row.sprMoveEventCount,
    uniqueMovedSubtrees: row.uniqueMovedSubtreeCount,
    singleTaxonMoveEventCount: row.singleTaxonMoveEventCount,
    multiTaxonMoveEventCount: row.multiTaxonMoveEventCount,
    topMovedSubtreeSignature: row.topMovedSubtree ? row.topMovedSubtree.signature : null,
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

function summarizeSprEventRows(events) {
  if (events.length === 0) {
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
  if (movedSubtrees.length === 0) return null;

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

function resolvePathHops(event) {
  return event.total_hops;
}

function resolvePathLength(event) {
  return event.total_branch_length;
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
  const attachmentEdgesBySplit = getBackendSplitMapValue(solution.attachment_edges_by_split, pivotKey);
  if (!attachmentEdgesBySplit) return null;

  const moverKey = toBackendSplitKey(splitIndices);
  const attachmentEdges = getBackendSplitMapValue(attachmentEdgesBySplit, moverKey);
  if (!attachmentEdges) return null;

  const sourceEdge = attachmentEdges.source;
  const destinationEdge = attachmentEdges.destination;

  const movingSet = new Set(excludedIndices);
  return {
    pivotEdge: parseBackendSplitKey(pivotKey),
    sourceAttachment: filterMovingNodes(sourceEdge, movingSet),
    destinationAttachment: filterMovingNodes(destinationEdge, movingSet),
  };
}

function mergeIndexLists(lists) {
  return normalizeSubtreeIndices(
    Array.from(new Set(lists.flatMap((list) => list)))
  );
}

function filterMovingNodes(edge, movingSet) {
  return normalizeSubtreeIndices(edge).filter((leaf) => !movingSet.has(leaf));
}

function normalizeStepRange(stepRange) {
  const start = numberOrNull(stepRange[0]);
  const end = numberOrNull(stepRange[1]);
  return start !== null && end !== null ? [start, end] : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildMetricByPairId(pairMetrics) {
  const metrics = new Map();
  for (const row of pairMetrics.rows) {
    metrics.set(row.pair_id, row);
  }
  return metrics;
}

function formatPairLabel(row) {
  if (row.sourceInputTreeIndex !== null && row.targetInputTreeIndex !== null) {
    return `source input tree ${row.sourceInputTreeIndex + 1} to target input tree ${row.targetInputTreeIndex + 1}`;
  }
  return row.pairId;
}

function getPairMetric(metricByPairId, pairId) {
  const metric = metricByPairId.get(pairId);
  if (!metric) {
    throw new Error(`[sprAnalytics] pair_metrics is missing row for ${pairId}`);
  }
  return metric;
}
