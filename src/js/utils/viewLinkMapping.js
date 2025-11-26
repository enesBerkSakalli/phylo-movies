function buildFromSolution(pairSolution, fromIndex = null, toIndex = null) {
  const sourceMap = pairSolution?.solution_to_source_map || {};
  const destMap = pairSolution?.solution_to_destination_map || {};
  const anchors = [];
  const movers = [];
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
        sourceToDest[sKey].push(dKey);
        if (!destToSource[dKey]) destToSource[dKey] = [];
        destToSource[dKey].push(sKey);
      });
    });
    dstGroups.forEach((dst) => {
      const dKey = toKey(dst);
      destSplits[dKey] = { split: dst };
      if (!destToSource[dKey]) destToSource[dKey] = [];
      // If there was no source group for this solution, still add empty mapping entry
    });
    // Heuristic: mark any mapped groups as movers (they participated in a solution)
    movers.push(...srcGroups.map(toKey), ...dstGroups.map(toKey));
  });

  return {
    fromIndex,
    toIndex,
    anchors,
    movers,
    sourceToDest,
    destToSource,
    sourceSplits,
    destSplits,
  };
}

export function buildViewLinkMapping(fromTree, toTree, fromIndex = null, toIndex = null, pairSolution = null) {
  console.log('[viewLinkMapping] Building mapping:', {
    fromIndex,
    toIndex,
    hasPairSolution: !!pairSolution,
    hasSourceMap: !!(pairSolution?.solution_to_source_map),
    hasDestMap: !!(pairSolution?.solution_to_destination_map),
    sourceMapKeys: pairSolution?.solution_to_source_map ? Object.keys(pairSolution.solution_to_source_map) : [],
    destMapKeys: pairSolution?.solution_to_destination_map ? Object.keys(pairSolution.solution_to_destination_map) : []
  });

  if (pairSolution && pairSolution.solution_to_source_map && pairSolution.solution_to_destination_map) {
    const result = buildFromSolution(pairSolution, fromIndex, toIndex);
    console.log('[viewLinkMapping] Result:', {
      sourceSplitsCount: Object.keys(result.sourceSplits).length,
      destSplitsCount: Object.keys(result.destSplits).length,
      sourceToDest: Object.keys(result.sourceToDest).length,
      destToSource: Object.keys(result.destToSource).length,
      moversCount: result.movers.length
    });
    return result;
  }
  // No solution maps available—return empty mapping (no fallback).
  console.warn('[viewLinkMapping] No solution maps available - returning empty mapping');
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
