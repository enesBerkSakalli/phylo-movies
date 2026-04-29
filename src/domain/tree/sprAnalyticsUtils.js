import { flattenSplitSets } from '../../treeVisualisation/utils/splitMatching.js';

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
 * Calculates the frequency of each unique moving subtree across tree pair solutions.
 *
 * This counts flattened moving-subtree occurrences from jumping_subtree_solutions.
 * It is not the same as counting unique transition events or rendered transition frames.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Array} Sorted array of moving subtree frequency objects
 */
export function calculateSprMoverFrequencies(pairSolutions) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return [];

  const freqMap = new Map();

  Object.values(pairSolutions).forEach((solution) => {
    const jumpingSolutions = solution?.jumping_subtree_solutions;
    if (!jumpingSolutions) return;

    Object.values(jumpingSolutions).forEach((solutionSets) => {
      extractMovingSubtrees(solutionSets).forEach((splitIndices) => {
        const signature = getSubtreeSignature(splitIndices);
        if (!signature) return;

        if (!freqMap.has(signature)) {
          freqMap.set(signature, {
            signature,
            splitIndices,
            count: 0,
          });
        }

        freqMap.get(signature).count++;
      });
    });
  });

  const totalMoverOccurrences = Array.from(freqMap.values())
    .reduce((sum, item) => sum + item.count, 0);

  return Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: totalMoverOccurrences > 0
        ? (item.count / totalMoverOccurrences) * 100
        : 0,
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

  return Object.entries(pairSolutions)
    .map(([pairKey, solution], entryIndex) => {
      const parsedPair = parsePairKey(pairKey);
      const pairIndex = parsedPair?.sourceTreeIndex ?? entryIndex;
      const moverCounts = calculateMoverCountsForSolution(solution);
      const moverOccurrenceCount = moverCounts.movers
        .reduce((sum, item) => sum + item.count, 0);
      const topMover = moverCounts.movers[0] || null;

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
        moverOccurrenceCount,
        uniqueMoverCount: moverCounts.movers.length,
        singletonMoverOccurrences: moverCounts.singletonMoverOccurrences,
        cladeMoverOccurrences: moverCounts.cladeMoverOccurrences,
        transitionEventCount: Array.isArray(solution?.split_change_events)
          ? solution.split_change_events.length
          : 0,
        topMover,
        movers: moverCounts.movers,
      };
    })
    .sort((a, b) => a.pairIndex - b.pairIndex);
}

/**
 * Summarize dataset-level SPR activity without conflating transition events and movers.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @param {Object} options - Same options accepted by calculateSprPairActivity
 * @returns {Object}
 */
export function calculateSprDatasetSummary(pairSolutions, options = {}) {
  const pairActivity = calculateSprPairActivity(pairSolutions, options);
  const moverFrequencies = calculateSprMoverFrequencies(pairSolutions);
  const moverOccurrenceCount = pairActivity
    .reduce((sum, row) => sum + row.moverOccurrenceCount, 0);

  return {
    pairCount: pairActivity.length,
    activePairCount: pairActivity.filter((row) => row.moverOccurrenceCount > 0).length,
    transitionEventCount: pairActivity
      .reduce((sum, row) => sum + row.transitionEventCount, 0),
    moverOccurrenceCount,
    uniqueMovingSubtreeCount: moverFrequencies.length,
    singletonMoverOccurrences: pairActivity
      .reduce((sum, row) => sum + row.singletonMoverOccurrences, 0),
    cladeMoverOccurrences: pairActivity
      .reduce((sum, row) => sum + row.cladeMoverOccurrences, 0),
    maxPairMoverOccurrenceCount: pairActivity
      .reduce((max, row) => Math.max(max, row.moverOccurrenceCount), 0),
    topMoverSharePercentage: moverFrequencies[0]?.percentage ?? 0,
  };
}

/**
 * Format pair activity rows for charting SPR activity over neighboring anchor-tree pairs.
 *
 * SPR activity is represented as mover occurrences per pair. RF and W-RF are carried
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
    moverOccurrences: row.moverOccurrenceCount,
    transitionEvents: row.transitionEventCount,
    uniqueMovers: row.uniqueMoverCount,
    singletonMoverOccurrences: row.singletonMoverOccurrences,
    cladeMoverOccurrences: row.cladeMoverOccurrences,
    rfDistance: row.rfDistance,
    weightedRfDistance: row.weightedRfDistance,
    topMoverSignature: row.topMover?.signature ?? null,
  }));
}

/**
 * Returns the top N most frequent moving subtrees.
 *
 * @param {Array} frequencies - Result from calculateSprMoverFrequencies
 * @param {number} n - Number of top items to return
 */
export function getTopSprMovers(frequencies, n = 5) {
  return frequencies.slice(0, n);
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

function calculateMoverCountsForSolution(solution) {
  const freqMap = new Map();
  let singletonMoverOccurrences = 0;
  let cladeMoverOccurrences = 0;

  const jumpingSolutions = solution?.jumping_subtree_solutions;
  if (!jumpingSolutions) {
    return {
      movers: [],
      singletonMoverOccurrences,
      cladeMoverOccurrences,
    };
  }

  Object.entries(jumpingSolutions).forEach(([pivotKey, solutionSets]) => {
    extractMovingSubtrees(solutionSets).forEach((splitIndices) => {
      const signature = getSubtreeSignature(splitIndices);
      if (!signature) return;

      if (splitIndices.length === 1) {
        singletonMoverOccurrences++;
      } else {
        cladeMoverOccurrences++;
      }

      if (!freqMap.has(signature)) {
        freqMap.set(signature, {
          signature,
          splitIndices,
          count: 0,
          attachmentContexts: [],
        });
      }

      const mover = freqMap.get(signature);
      mover.count++;
      const attachmentContext = resolveAttachmentContext(solution, pivotKey, splitIndices);
      if (attachmentContext) {
        mover.attachmentContexts.push(attachmentContext);
      }
    });
  });

  const total = Array.from(freqMap.values())
    .reduce((sum, item) => sum + item.count, 0);
  const movers = Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));

  return {
    movers,
    singletonMoverOccurrences,
    cladeMoverOccurrences,
  };
}

function resolveAttachmentContext(solution, pivotKey, splitIndices) {
  const sourceMap = solution?.solution_to_source_map?.[pivotKey];
  const destinationMap = solution?.solution_to_destination_map?.[pivotKey];
  if (!sourceMap && !destinationMap) return null;

  const moverKey = buildSolutionKey(splitIndices);
  const sourceEdge = sourceMap?.[moverKey];
  const destinationEdge = destinationMap?.[moverKey];
  if (!Array.isArray(sourceEdge) && !Array.isArray(destinationEdge)) return null;

  const movingSet = new Set(splitIndices);
  return {
    pivotEdge: parseSplitKey(pivotKey),
    sourceAttachment: filterMovingNodes(sourceEdge, movingSet),
    destinationAttachment: filterMovingNodes(destinationEdge, movingSet),
  };
}

function filterMovingNodes(edge, movingSet) {
  if (!Array.isArray(edge)) return [];
  return normalizeSubtreeIndices(edge).filter((leaf) => !movingSet.has(leaf));
}

function buildSolutionKey(splitIndices) {
  return `[${normalizeSubtreeIndices(splitIndices).join(', ')}]`;
}

function parseSplitKey(splitKey) {
  if (typeof splitKey !== 'string') return [];
  return splitKey
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
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
