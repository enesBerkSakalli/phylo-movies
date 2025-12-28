
/**
 * Subtree Frequency Analysis Utilities
 *
 * Provides functions to analyze and rank subtree occurrences across the entire animation.
 */

/**
 * Calculates the frequency of each subtree "jumping" event across all tree pair solutions.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Array} Sorted array of subtree frequency objects
 */
export function calculateSubtreeFrequencies(pairSolutions) {
  if (!pairSolutions) return [];

  const freqMap = new Map();

  // Iterate through all tree pairs
  Object.values(pairSolutions).forEach(solution => {
    const jumpingSolutions = solution?.jumping_subtree_solutions;

    if (!jumpingSolutions) return;

    // jumping_subtree_solutions is usually:
    // { [edgeKey]: Array<Array<Array<number>>> }
    // We need to flatten this structure to get to the individual subtree split indices

    // 1. Get all edge solutions (arrays of arrays of subtrees)
    const edgeSolutions = Object.values(jumpingSolutions);

    edgeSolutions.forEach(solutionSet => {
      // 2. solutionSet is Array<Array<subtree>> (options for this edge)
      // Usually there's only one viable solution being used visually,
      // but the data might contain multiple. We'll count all potential jumping subtrees
      // present in the solution structure to be comprehensive.

      solutionSet.forEach(subtreeGroup => {
        // 3. subtreeGroup is Array<subtree>
        subtreeGroup.forEach(subtreeSplitIndices => {
          // 4. subtreeSplitIndices is Array<number> (the actual leaf indices)
          if (!Array.isArray(subtreeSplitIndices) || subtreeSplitIndices.length === 0) return;

          // Create a stable signature for the subtree
          // Sort indices to ensure uniqueness (should already be solved, but safety first)
          const sortedIndices = [...subtreeSplitIndices].sort((a, b) => a - b);
          const signature = sortedIndices.map(String).join(',');

          if (!freqMap.has(signature)) {
            freqMap.set(signature, {
              signature,
              splitIndices: sortedIndices,
              count: 0
            });
          }

          freqMap.get(signature).count++;
        });
      });
    });
  });

  // Convert map to array and sort by count (descending)
  const totalSubtrees = Array.from(freqMap.values()).reduce((sum, item) => sum + item.count, 0);

  return Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .map(item => ({
      ...item,
      percentage: totalSubtrees > 0 ? (item.count / totalSubtrees) * 100 : 0
    }));
}

/**
 * Returns the top N most frequent subtrees
 *
 * @param {Array} frequencies - Result from calculateSubtreeFrequencies
 * @param {number} n - Number of top items to return
 */
export function getTopSubtrees(frequencies, n = 5) {
  return frequencies.slice(0, n);
}

/**
 * Formats a subtree split list into a readable label
 * e.g., "A, B, C" or "A...Z (5 taxa)"
 *
 * @param {Array<number>} splitIndices - Array of leaf indices
 * @param {Array<string>} leafNames - Array of leaf names (optional)
 */
export function formatSubtreeLabel(splitIndices, leafNames = []) {
  if (!splitIndices || splitIndices.length === 0) return "Empty Subtree";

  // Map indices to names if available
  // The split indices are 0-based indices into the sorted_leaves array
  if (leafNames && leafNames.length > 0) {
    const names = splitIndices
      .map(idx => leafNames[idx])
      .filter(Boolean);

    if (names.length === 0) {
      return `Nodes: ${splitIndices.join(", ")}`;
    } else if (names.length <= 3) {
      return names.join(", ");
    } else {
      return `${names[0]}, ${names[1]}... (+${names.length - 2})`;
    }
  }

  // Fallback to indices if names not available
  if (splitIndices.length <= 3) {
    return `Nodes: ${splitIndices.join(", ")}`;
  }
  return `Subtree (${splitIndices.length} nodes)`;
}

/**
 * Calculates the temporal distribution of subtree jumps.
 * Returns a map of subtree signatures to their occurrence timeline.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Map<string, Map<number, number>>} Map of signature -> (pairIndex -> count)
 */
export function calculateSubtreeTemporalDistribution(pairSolutions) {
  if (!pairSolutions) return new Map();

  const temporalMap = new Map(); // signature -> Map<pairIndex, count>

  Object.entries(pairSolutions).forEach(([pairKey, solution]) => {
    // Parse pair index from key "pair_X_Y" -> uses X as the time step
    const match = pairKey.match(/^pair_(\d+)_(\d+)$/);
    if (!match) return;

    const pairIndex = parseInt(match[1], 10);
    const jumpingSolutions = solution?.jumping_subtree_solutions;
    if (!jumpingSolutions) return;

    Object.values(jumpingSolutions).forEach(solutionSet => {
      solutionSet.forEach(subtreeGroup => {
        subtreeGroup.forEach(subtreeSplitIndices => {
          if (!Array.isArray(subtreeSplitIndices) || subtreeSplitIndices.length === 0) return;

          const sortedIndices = [...subtreeSplitIndices].sort((a, b) => a - b);
          const signature = sortedIndices.map(String).join(',');

          if (!temporalMap.has(signature)) {
            temporalMap.set(signature, new Map());
          }

          const timeMap = temporalMap.get(signature);
          timeMap.set(pairIndex, (timeMap.get(pairIndex) || 0) + 1);
        });
      });
    });
  });

  return temporalMap;
}
