const DEBUG_VIEW_LINK = false;

const normalizeKey = (key) => {
  if (Array.isArray(key)) return key.join('-');
  if (typeof key === 'string') {
    return key
      .replace(/[\[\]\s]/g, '')
      .split(',')
      .filter(Boolean)
      .join('-');
  }
  return String(key || '');
};

function buildFromSolution(pairSolution, fromIndex = null, toIndex = null) {
  const sourceMap = pairSolution?.solution_to_source_map || {};
  const destMap = pairSolution?.solution_to_destination_map || {};
  const movers = [];
  const moverLeafIds = new Set();
  const sourceToDest = {};
  const destToSource = {};
  const sourceSplits = {};
  const destSplits = {};

  const parseSplit = (arr) => Array.isArray(arr) ? arr : [];
  const toKey = (split) => split.join('-');

  const solutionIds = new Set([...Object.keys(sourceMap), ...Object.keys(destMap)]);
  solutionIds.forEach((sid) => {
    const srcEntries = Object.values(sourceMap[sid] || {});
    const dstEntries = Object.values(destMap[sid] || {});
    const srcGroups = srcEntries.map(parseSplit).filter((g) => g.length);
    const dstGroups = dstEntries.map(parseSplit).filter((g) => g.length);
    // Map every source group to every destination group within the same solution.
    srcGroups.forEach((src) => {
      const sKey = toKey(src);
      sourceSplits[sKey] = { split: src };
      if (!sourceToDest[sKey]) sourceToDest[sKey] = [];
      if (dstGroups.length === 0) return;
      dstGroups.forEach((dst) => {
        const dKey = toKey(dst);
        destSplits[dKey] = { split: dst };
        if (!sourceToDest[sKey].includes(dKey)) sourceToDest[sKey].push(dKey);
        if (!destToSource[dKey]) destToSource[dKey] = [];
        if (!destToSource[dKey].includes(sKey)) destToSource[dKey].push(sKey);
      });
    });
    dstGroups.forEach((dst) => {
      const dKey = toKey(dst);
      destSplits[dKey] = { split: dst };
      if (!destToSource[dKey]) destToSource[dKey] = [];
      // If there was no source group for this solution, still add empty mapping entry
    });
    // Movers: restrict to jumps defined by jumping_subtree_solutions when available
  });

  const jumpSolutions = pairSolution?.jumping_subtree_solutions || {};
  const jumpKeys = Object.keys(jumpSolutions);
  if (jumpKeys.length) {
    movers.push(
      ...jumpKeys.map((k) => normalizeKey(k)).filter(Boolean)
    );
    // Collect individual leaf ids participating in jumps (innermost arrays)
    Object.values(jumpSolutions).forEach((entries) => {
      // entries is often nested arrays; flatten numeric leaves
      const collectLeaves = (val) => {
        if (Array.isArray(val)) {
          val.forEach(collectLeaves);
        } else if (typeof val === 'number') {
          moverLeafIds.add(val);
        }
      };
      collectLeaves(entries);
    });
  } else {
    // Fallback: treat any mapped group as mover
    solutionIds.forEach((sid) => {
      const srcEntries = Object.values(sourceMap[sid] || {});
      const dstEntries = Object.values(destMap[sid] || {});
      movers.push(
        ...srcEntries.map(parseSplit).filter((g) => g.length).map(toKey),
        ...dstEntries.map(parseSplit).filter((g) => g.length).map(toKey)
      );
      srcEntries.forEach((g) => parseSplit(g).forEach((n) => moverLeafIds.add(n)));
      dstEntries.forEach((g) => parseSplit(g).forEach((n) => moverLeafIds.add(n)));
    });
  }

  return {
    fromIndex,
    toIndex,
    movers,
    moverLeafIds,
    sourceToDest,
    destToSource,
    sourceSplits,
    destSplits,
  };
}

export function buildViewLinkMapping(fromTree, toTree, fromIndex = null, toIndex = null, pairSolution = null) {
  if (DEBUG_VIEW_LINK) {
    console.log('[viewLinkMapping] Building mapping:', {
      fromIndex,
      toIndex,
      hasPairSolution: !!pairSolution,
      hasSourceMap: !!(pairSolution?.solution_to_source_map),
      hasDestMap: !!(pairSolution?.solution_to_destination_map),
      sourceMapKeys: pairSolution?.solution_to_source_map ? Object.keys(pairSolution.solution_to_source_map) : [],
      destMapKeys: pairSolution?.solution_to_destination_map ? Object.keys(pairSolution.solution_to_destination_map) : []
    });
  }

  if (pairSolution && pairSolution.solution_to_source_map && pairSolution.solution_to_destination_map) {
    const result = buildFromSolution(pairSolution, fromIndex, toIndex);
    if (DEBUG_VIEW_LINK) {
      console.log('[viewLinkMapping] Result:', {
        sourceSplitsCount: Object.keys(result.sourceSplits).length,
        destSplitsCount: Object.keys(result.destSplits).length,
        sourceToDest: Object.keys(result.sourceToDest).length,
        destToSource: Object.keys(result.destToSource).length,
        moversCount: result.movers.length
      });
    }
    return result;
  }
  // No solution maps available—return empty mapping (no fallback).
  if (DEBUG_VIEW_LINK) {
    console.warn('[viewLinkMapping] No solution maps available - returning empty mapping');
  }
  return {
    fromIndex,
    toIndex,
    anchors: [],
    movers: [],
    sourceToDest: {},
    destToSource: {},
    sourceSplits: {},
    destSplits: {},
  };
}
