import type { PhyloMovieAppData, PhyloMovieData } from './phyloMovieTypes';

export function toPhyloMovieAppData(data: PhyloMovieData): PhyloMovieAppData {
  const {
    subtree_tracking: subtreeHighlightTracking,
    split_change_events: _splitChangeEvents,
    pipeline_info: _pipelineInfo,
    warnings: _warnings,
    tree_count: _treeCount,
    ...appData
  } = data;

  return {
    ...appData,
    subtreeHighlightTracking,
  };
}
