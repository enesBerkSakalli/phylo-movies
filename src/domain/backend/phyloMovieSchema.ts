import type { PhyloMovieData } from './phyloMovieTypes';
import { assertRecord, requiredStringArray } from './schemaValidation';
import {
  validateDistances,
  validateMsa,
  validateNullableNumberArrayTracking,
  validatePairInterpolationRanges,
  validateSubtreeHighlightTracking,
  validateTreeList,
  validateTreeMetadataList,
} from './treePayloadValidators';
import {
  validateTreePairSolutions,
} from './solutionValidators';
import { validateSplitChangeTimeline } from './timelineValidators';

export type {
  MsaData,
  OriginalTimelineEntry,
  PhyloMovieData,
  SplitChangeTimelineEntry,
  SplitEventTimelineEntry,
  SprMoveEvent,
  SprPathSegment,
  SubtreeHighlightTracking,
  TreeMetadata,
  TreeNode,
  TreePairSolution,
} from './phyloMovieTypes';

export function validatePhyloMovieData(data: unknown): PhyloMovieData {
  assertRecord(data, 'phyloMovieData');

  const interpolatedTrees = validateTreeList(data.interpolated_trees);
  const treeMetadata = validateTreeMetadataList(data.tree_metadata, interpolatedTrees.length);

  const distances = validateDistances(data.distances);
  const treePairSolutions = validateTreePairSolutions(data.tree_pair_solutions);
  const pairInterpolationRanges = validatePairInterpolationRanges(data.pair_interpolation_ranges, interpolatedTrees.length);
  const pivotEdgeTracking = validateNullableNumberArrayTracking(
    data.pivot_edge_tracking,
    'pivot_edge_tracking',
    interpolatedTrees.length
  );
  const subtreeHighlightTracking = validateSubtreeHighlightTracking(
    data.subtree_highlight_tracking,
    interpolatedTrees.length
  );
  const sortedLeaves = requiredStringArray(data.sorted_leaves, 'sorted_leaves');
  const msa = validateMsa(data.msa);
  const splitChangeTimeline = validateSplitChangeTimeline(
    data.split_change_timeline,
    interpolatedTrees.length,
    pairInterpolationRanges,
    treePairSolutions
  );

  if (typeof data.file_name !== 'string') {
    throw new Error('Invalid phyloMovieData payload: file_name must be a string');
  }

  return {
    interpolated_trees: interpolatedTrees,
    tree_metadata: treeMetadata,
    distances,
    tree_pair_solutions: treePairSolutions,
    pair_interpolation_ranges: pairInterpolationRanges,
    pivot_edge_tracking: pivotEdgeTracking,
    subtree_highlight_tracking: subtreeHighlightTracking,
    sorted_leaves: sortedLeaves,
    msa,
    file_name: data.file_name,
    split_change_timeline: splitChangeTimeline,
  };
}
