/**
 * ViewLinkMapper - Builds view link mapping for comparison mode.
 *
 * Creates a sourceToDest mapping that connects leaf groups between two trees.
 * The actual active/moving subtree filtering is handled dynamically by
 * TreeColorManager.currentActiveChangeEdges at render time.
 *
 * Data model:
 * - Each leaf has a consistent integer ID across all trees (split_indices)
 * - solution_to_source_map: Maps solution key → source tree leaf groups
 * - solution_to_destination_map: Maps solution key → destination tree leaf groups
 * - The "mover" is identified by the active_changing_edge which contains the moving subtree's leaf IDs
 *
 * TODO: The sourceToDest mapping could be used to visualize movement direction:
 *       - Show arrows or animated paths indicating where leaves move from/to
 *       - Highlight source position vs destination position differently
 *       - Currently we only use currentActiveChangeEdges to filter which leaves to connect
 */

/**
 * Convert split indices array to a normalized string key.
 * @param {Array|string} key - Split indices
 * @returns {string} Normalized "x-y-z" format key
 */
const toKey = (key) => {
  if (Array.isArray(key)) return key.join('-');
  if (typeof key === 'string') {
    return key.replace(/[\[\]\s]/g, '').split(',').filter(Boolean).join('-');
  }
  return String(key || '');
};

/**
 * Build view link mapping from a pair solution.
 *
 * @param {Object} pairSolution - Solution data from backend
 * @param {number|null} fromIndex - Source tree index
 * @param {number|null} toIndex - Destination tree index
 * @returns {Object} Mapping with fromIndex, toIndex, sourceToDest
 */
function buildFromSolution(pairSolution, fromIndex, toIndex) {
  const sourceMap = pairSolution?.solution_to_source_map || {};
  const destMap = pairSolution?.solution_to_destination_map || {};

  const sourceToDest = {};

  // Build source→destination mapping from solution maps
  const solutionIds = new Set([...Object.keys(sourceMap), ...Object.keys(destMap)]);

  for (const sid of solutionIds) {
    const srcEntries = Object.values(sourceMap[sid] || {}).filter(Array.isArray);
    const dstEntries = Object.values(destMap[sid] || {}).filter(Array.isArray);

    // Map each source group to all destination groups in this solution
    for (const src of srcEntries) {
      if (!src.length) continue;
      const sKey = toKey(src);
      if (!sourceToDest[sKey]) sourceToDest[sKey] = [];

      for (const dst of dstEntries) {
        if (!dst.length) continue;
        const dKey = toKey(dst);
        if (!sourceToDest[sKey].includes(dKey)) {
          sourceToDest[sKey].push(dKey);
        }
      }
    }
  }

  return { fromIndex, toIndex, sourceToDest };
}

/**
 * Build a view link mapping for comparison mode between two trees.
 *
 * @param {number|null} fromIndex - Source tree index
 * @param {number|null} toIndex - Destination tree index
 * @param {Object|null} pairSolution - Solution data from backend tree_pair_solutions
 * @returns {Object} View link mapping with:
 *   - fromIndex, toIndex: The tree indices
 *   - sourceToDest: Object mapping source split keys to destination split key arrays
 */
export function buildViewLinkMapping(fromIndex = null, toIndex = null, pairSolution = null) {
  if (pairSolution?.solution_to_source_map && pairSolution?.solution_to_destination_map) {
    return buildFromSolution(pairSolution, fromIndex, toIndex);
  }

  // No solution maps available—return empty mapping
  return {
    fromIndex,
    toIndex,
    sourceToDest: {},
  };
}
