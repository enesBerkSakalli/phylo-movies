
/**
 * Calculates the frequency of each unique jumping subtree across all tree pair solutions.
 * Extracts subtrees from jumping_subtree_solutions which maps pivot edges to the subtrees
 * that move at those pivots.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution (tree_pair_solutions from JSON)
 * @returns {Array} Sorted array of subtree frequency objects
 */
export function calculateSubtreeFrequencies(pairSolutions) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return [];

  const freqMap = new Map();

  // Iterate through all tree pairs
  Object.values(pairSolutions).forEach(solution => {
    const jumpingSolutions = solution?.jumping_subtree_solutions;
    if (!jumpingSolutions) return;

    // jumping_subtree_solutions structure:
    // { "[pivot_edge_indices]": [ [ [subtree1], [subtree2] ] ] }
    // The key is the pivot edge, the value contains the subtrees that move at that pivot

    Object.values(jumpingSolutions).forEach(solutionSets => {
      // solutionSets is an array of solution options (usually just one)
      solutionSets.forEach(subtreeGroup => {
        // subtreeGroup is an array of subtrees for this pivot
        subtreeGroup.forEach(subtreeSplitIndices => {
          if (!Array.isArray(subtreeSplitIndices) || subtreeSplitIndices.length === 0) return;

          // Create a stable signature for the subtree
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
 * Formats a subtree split list into a readable label showing all taxa names.
 * e.g., "A, B, C, D, E"
 *
 * @param {Array<number>} splitIndices - Array of leaf indices defining the subtree
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
    }
    // Show all names
    return names.join(", ");
  }

  // Fallback to indices if names not available
  return `Nodes: ${splitIndices.join(", ")}`;
}

/**
 * Calculates which tree pairs each subtree appears in.
 * Returns a map of subtree signatures to their occurrence in pair solutions.
 *
 * @param {Object} pairSolutions - Map of pairKey -> TreePairSolution
 * @returns {Map<string, Array<string>>} Map of signature -> array of pair keys where this subtree jumps
 */
export function calculateSubtreeTemporalDistribution(pairSolutions) {
  if (!pairSolutions || typeof pairSolutions !== 'object') return new Map();

  const temporalMap = new Map(); // signature -> array of pair keys

  Object.entries(pairSolutions).forEach(([pairKey, solution]) => {
    const jumpingSolutions = solution?.jumping_subtree_solutions;
    if (!jumpingSolutions) return;

    Object.values(jumpingSolutions).forEach(solutionSets => {
      solutionSets.forEach(subtreeGroup => {
        subtreeGroup.forEach(subtreeSplitIndices => {
          if (!Array.isArray(subtreeSplitIndices) || subtreeSplitIndices.length === 0) return;

          const sortedIndices = [...subtreeSplitIndices].sort((a, b) => a - b);
          const signature = sortedIndices.map(String).join(',');

          if (!temporalMap.has(signature)) {
            temporalMap.set(signature, []);
          }

          temporalMap.get(signature).push(pairKey);
        });
      });
    });
  });

  return temporalMap;
}
