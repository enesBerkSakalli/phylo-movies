import type {
  PhyloMovieData,
  SplitChangeTimelineEntry,
  TreeMetadata,
  TreePairSolution,
} from './phyloMovieTypes';
import { assertExactRecordKeys, assertRecord } from './schemaValidation';
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
  assertExactRecordKeys(data, 'phyloMovieData', [
    'interpolated_trees',
    'tree_metadata',
    'distances',
    'tree_pair_solutions',
    'pair_interpolation_ranges',
    'pivot_edge_tracking',
    'subtree_highlight_tracking',
    'msa',
    'file_name',
    'split_change_timeline',
  ]);

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
  const msa = validateMsa(data.msa);
  const splitChangeTimeline = validateSplitChangeTimeline(
    data.split_change_timeline,
    interpolatedTrees.length,
    pairInterpolationRanges,
    treePairSolutions
  );
  validateTreeMetadataTimelineContracts(
    treeMetadata,
    pairInterpolationRanges,
    treePairSolutions,
    splitChangeTimeline
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
    msa,
    file_name: data.file_name,
    split_change_timeline: splitChangeTimeline,
  };
}

function validateTreeMetadataTimelineContracts(
  treeMetadata: TreeMetadata[],
  pairInterpolationRanges: Array<[number, number]>,
  treePairSolutions: Record<string, TreePairSolution>,
  splitChangeTimeline: SplitChangeTimelineEntry[]
): void {
  const inputFrameIndices = collectInputFrameIndices(pairInterpolationRanges);
  const pairKeyByFrameIndex = collectSplitEventPairKeysByFrameIndex(splitChangeTimeline);

  treeMetadata.forEach((metadata, frameIndex) => {
    const sourceFrameIndex = metadata.source_tree_global_index;
    if (sourceFrameIndex !== null && !inputFrameIndices.has(sourceFrameIndex)) {
      throw new Error(
        `Invalid phyloMovieData payload: tree_metadata[${frameIndex}].source_tree_global_index must reference an input tree frame`
      );
    }

    const metadataPairKey = metadata.tree_pair_key;
    if (metadataPairKey !== null && !treePairSolutions[metadataPairKey]) {
      throw new Error(
        `Invalid phyloMovieData payload: tree_metadata[${frameIndex}].tree_pair_key must reference tree_pair_solutions`
      );
    }

    const expectedPairKey = pairKeyByFrameIndex.get(frameIndex);
    if (expectedPairKey && metadataPairKey !== expectedPairKey) {
      throw new Error(
        `Invalid phyloMovieData payload: tree_metadata[${frameIndex}].tree_pair_key must match split_change_timeline pair_key (${expectedPairKey})`
      );
    }
  });
}

function collectInputFrameIndices(pairInterpolationRanges: Array<[number, number]>): Set<number> {
  const inputFrameIndices = new Set<number>();

  pairInterpolationRanges.forEach(([start, end]) => {
    inputFrameIndices.add(start);
    inputFrameIndices.add(end);
  });

  return inputFrameIndices;
}

function collectSplitEventPairKeysByFrameIndex(
  splitChangeTimeline: SplitChangeTimelineEntry[]
): Map<number, string> {
  const pairKeyByFrameIndex = new Map<number, string>();

  splitChangeTimeline.forEach((entry) => {
    if (entry.type !== 'split_event') return;

    for (let frameIndex = entry.step_range_global[0]; frameIndex <= entry.step_range_global[1]; frameIndex += 1) {
      const existingPairKey = pairKeyByFrameIndex.get(frameIndex);
      if (existingPairKey && existingPairKey !== entry.pair_key) {
        throw new Error(
          `Invalid phyloMovieData payload: split_change_timeline has conflicting pair_key values for frame ${frameIndex}`
        );
      }
      pairKeyByFrameIndex.set(frameIndex, entry.pair_key);
    }
  });

  return pairKeyByFrameIndex;
}
