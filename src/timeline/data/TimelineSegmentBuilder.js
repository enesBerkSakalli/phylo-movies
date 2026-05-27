import { flattenSplitSets, getBackendSplitMapValue } from '../../domain/tree/splits.js';
import { TimelineTimingBuilder } from './TimelineTimingBuilder.js';

export class TimelineSegmentBuilder {
  static buildInputTreeSegment({ segmentIndex, frame, interpolatedTrees }) {
    const globalIndex = frame.frame_index;
    const treeIndex = frame.input_tree_index;

    return {
      index: segmentIndex,
      treeName: `Input Tree ${treeIndex + 1}`,
      hasInterpolation: false,
      isInputTreeSegment: true,
      subtreeMoveCount: 0,
      globalIndex,
      originalTreeIndex: treeIndex,
      timing: TimelineTimingBuilder.buildInputTreeTiming(globalIndex),
      interpolationData: [
        {
          frame,
          tree: interpolatedTrees[globalIndex],
          originalIndex: globalIndex,
        },
      ],
    };
  }

  static buildSplitEventSegment({
    segmentIndex,
    event,
    pair,
    sprEvents,
    frames,
    interpolatedTrees,
  }) {
    const [globalStart, globalEnd] = event.frame_range;
    const [localStepStart, localStepEnd] = event.local_step_range;
    const contextStart = Math.max(pair.source_frame_index, globalStart - 1);
    const interpolationData = collectInterpolationData({
      startFrameIndex: contextStart,
      endFrameIndex: globalEnd,
      frames,
      interpolatedTrees,
    });
    const affectedSubtrees = getBackendSplitMapValue(
      pair.solution.affected_subtrees_by_split,
      event.split
    );

    return this._buildTransitionSegment({
      segmentIndex,
      pair,
      interpolationData,
      pivotEdge: event.split,
      affectedSubtrees,
      localStepStart,
      localStepEnd,
      globalStart,
      globalEnd,
      contextStart,
      generatedFrameCount: globalEnd - globalStart + 1,
      treeName: `Transition ${pair.pair_id}`,
      splitEvent: event,
      sprEvents,
    });
  }

  static buildFulfillmentSegment({
    segmentIndex,
    pair,
    startFrameIndex,
    endFrameIndex,
    frames,
    interpolatedTrees,
  }) {
    const interpolationData = collectInterpolationData({
      startFrameIndex,
      endFrameIndex,
      frames,
      interpolatedTrees,
    });

    return this._buildTransitionSegment({
      segmentIndex,
      pair,
      interpolationData,
      pivotEdge: [],
      affectedSubtrees: null,
      localStepStart: null,
      localStepEnd: null,
      globalStart: startFrameIndex,
      globalEnd: endFrameIndex,
      contextStart: startFrameIndex,
      generatedFrameCount: Math.max(0, endFrameIndex - startFrameIndex - 1),
      treeName: `Transition fulfillment ${pair.pair_id}`,
      splitEvent: null,
      sprEvents: [],
    });
  }

  static buildBranchLengthOnlySegment({
    segmentIndex,
    pair,
    isNoOpPair,
    frames,
    interpolatedTrees,
  }) {
    const interpolationData = collectInterpolationData({
      startFrameIndex: pair.source_frame_index,
      endFrameIndex: pair.target_frame_index,
      frames,
      interpolatedTrees,
    });

    return this._buildTransitionSegment({
      segmentIndex,
      pair,
      interpolationData,
      pivotEdge: [],
      affectedSubtrees: null,
      localStepStart: null,
      localStepEnd: null,
      globalStart: pair.source_frame_index,
      globalEnd: pair.target_frame_index,
      contextStart: pair.source_frame_index,
      generatedFrameCount: 0,
      treeName: `Branch-length update ${pair.pair_id}`,
      splitEvent: null,
      sprEvents: [],
      isNoOpPair,
    });
  }

  static _buildTransitionSegment({
    segmentIndex,
    pair,
    interpolationData,
    pivotEdge,
    affectedSubtrees,
    localStepStart,
    localStepEnd,
    globalStart,
    globalEnd,
    contextStart,
    generatedFrameCount,
    treeName,
    splitEvent,
    sprEvents,
    isNoOpPair = false,
  }) {
    return {
      index: segmentIndex,
      pivotEdge,
      affectedSubtrees,
      pairId: pair.pair_id,
      pairOrdinal: pair.pair_ordinal,
      sourceInputTreeIndex: pair.source_input_tree_index,
      targetInputTreeIndex: pair.target_input_tree_index,
      localStepStart,
      localStepEnd,
      globalStart,
      globalEnd,
      contextStart,
      sourceGlobalIndex: pair.source_frame_index,
      targetGlobalIndex: pair.target_frame_index,
      generatedFrameCount,
      animationStepCount: Math.max(0, interpolationData.length - 1),
      treeName,
      hasInterpolation: true,
      isInputTreeSegment: false,
      isNoOpPair,
      subtreeMoveCount:
        affectedSubtrees === null ? 0 : new Set(flattenSplitSets(affectedSubtrees).flat()).size,
      timing: TimelineTimingBuilder.buildTransitionTiming({
        interpolationData,
        pairId: pair.pair_id,
        isNoOpPair,
        splitEvent,
        sourceGlobalIndex: pair.source_frame_index,
        sprEvents,
      }),
      interpolationData,
    };
  }
}

function collectInterpolationData({ startFrameIndex, endFrameIndex, frames, interpolatedTrees }) {
  const interpolationData = [];

  for (let frameIndex = startFrameIndex; frameIndex <= endFrameIndex; frameIndex += 1) {
    interpolationData.push({
      frame: frames[frameIndex],
      tree: interpolatedTrees[frameIndex],
      originalIndex: frameIndex,
    });
  }

  return interpolationData;
}
