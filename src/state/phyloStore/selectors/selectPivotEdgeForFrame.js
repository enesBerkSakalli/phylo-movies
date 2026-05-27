const NO_PIVOT_EDGE = Object.freeze([]);

export function selectPivotEdgeForFrame(state, frameIndex) {
  const frame = state.timelineFrames[frameIndex] ?? null;
  if (!frame || frame.frame_type === 'input_tree' || frame.is_observed_input) {
    return NO_PIVOT_EDGE;
  }

  const splitChangeEvent = state.temporalEvents.find(
    (event) =>
      event.event_type === 'split_change' &&
      event.pair_id === frame.pair_id &&
      event.frame_range[0] <= frameIndex &&
      event.frame_range[1] >= frameIndex
  );

  return splitChangeEvent ? splitChangeEvent.split : NO_PIVOT_EDGE;
}
