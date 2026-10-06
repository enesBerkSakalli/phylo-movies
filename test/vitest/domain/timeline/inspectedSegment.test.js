import { describe, expect, it } from 'vitest';
import { selectInspectedSegmentIndex } from '../../../../src/state/phyloStore/store.js';

// input tree, transition, input tree
const segments = [
  { isInputTreeSegment: true },
  { isInputTreeSegment: false },
  { isInputTreeSegment: true },
];
const stateOf = (selected, playheadSegment) => ({
  timeline: { segments },
  selectedTimelineSegmentIndex: selected,
  timelineCursor: playheadSegment === undefined ? null : { segmentIndex: playheadSegment },
});

describe('selectInspectedSegmentIndex', () => {
  it('is the selected segment, wherever the playhead is', () => {
    expect(selectInspectedSegmentIndex(stateOf(1, 2))).toBe(1);
    expect(selectInspectedSegmentIndex(stateOf(0, 1))).toBe(0);
  });

  it('is the transition under the playhead when nothing is selected', () => {
    expect(selectInspectedSegmentIndex(stateOf(null, 1))).toBe(1);
  });

  it('is null on an input tree, or with no playhead, when nothing is selected', () => {
    expect(selectInspectedSegmentIndex(stateOf(null, 2))).toBeNull();
    expect(selectInspectedSegmentIndex(stateOf(null, undefined))).toBeNull();
    expect(selectInspectedSegmentIndex({ ...stateOf(null, 1), timeline: null })).toBeNull();
  });
});
