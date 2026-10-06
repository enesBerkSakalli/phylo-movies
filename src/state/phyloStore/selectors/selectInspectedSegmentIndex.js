import { inspectedSegmentIndex } from '../../../timeline/timeline.js';

/**
 * The segment Inspect and the Inspector show: the selection, else the transition under the playhead.
 * @param {import('../../../types/store').AppStoreState} state
 */
export const selectInspectedSegmentIndex = (state) =>
  inspectedSegmentIndex(
    state.timeline?.segments ?? [],
    state.selectedTimelineSegmentIndex,
    state.timelineCursor?.segmentIndex
  );
