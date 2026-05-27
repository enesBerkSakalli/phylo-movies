export function buildTimelineFrameViews(movieData) {
  const frames = movieData.frames;
  const pairById = new Map(movieData.pairs.map((pair) => [pair.pair_id, pair]));

  return frames.map((frame) => {
    const pair = frame.pair_id === null ? null : pairById.get(frame.pair_id);
    const frameIndex = frame.frame_index;
    const sourceFrameIndex =
      frame.source_frame_index === null ? frameIndex : frame.source_frame_index;
    const inputTreeIndex = frame.input_tree_index;

    return {
      frameIndex,
      inputTreeIndex,
      sourceFrameIndex,
      targetFrameIndex: frame.target_frame_index,
      msaWindowIndex: resolveMsaWindowIndex(frame, pair),
      frameType: frame.frame_type,
      stateSemantics: frame.state_semantics,
      isObservedInput: frame.is_observed_input,
      pairId: frame.pair_id,
      pairOrdinal: frame.pair_ordinal,
      sourceInputTreeIndex: pair === null ? inputTreeIndex : pair.source_input_tree_index,
      targetInputTreeIndex: pair === null ? null : pair.target_input_tree_index,
      localStepIndex: frame.local_step_index,
    };
  });
}

function resolveMsaWindowIndex(frame, pair) {
  if (pair === null) return frame.input_tree_index;

  return Number.isInteger(pair.source_input_tree_index) ? pair.source_input_tree_index : null;
}
