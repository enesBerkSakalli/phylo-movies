import { describe, expect, it } from 'vitest';
import {
  buildMsaWindow,
  buildTimelineStatusSnapshot,
} from '../../../src/timeline/view/timelineStatusModel.js';

describe('timeline status model', () => {
  it('builds observed input-tree status from the timeline cursor', () => {
    const status = buildTimelineStatusSnapshot({
      frameIndex: 3,
      treeListLength: 7,
      inputFrameIndices: [0, 3, 6],
      timelineCursor: {
        frameIndex: 3,
        timelineProgress: 0.5,
        isObservedInput: true,
        inputTreeIndex: 1,
      },
    });

    expect(status.position.display).toBe('Tree 2/3');
    expect(status.position.kind).toBe('input');
    expect(status.position.inputTreeIndex).toBe(1);
    expect(status.position.inputTreeCount).toBe(3);
    expect(status.position.fullPrecision).toBe('0.5');
    expect(status.segment.text).toBe('Input tree');
    expect(status.segment.tooltip).toBe(
      'An observed tree from one alignment window or uploaded tree set.'
    );
  });

  it('builds generated-frame status between neighboring input trees', () => {
    const status = buildTimelineStatusSnapshot({
      frameIndex: 2,
      treeListLength: 4,
      inputFrameIndices: [0, 3],
      timelineCursor: {
        frameIndex: 2,
        timelineProgress: 2 / 3,
        sourceInputTreeIndex: 0,
        targetInputTreeIndex: 1,
      },
    });

    expect(status.position.display).toBe('Tree 1 -> 2, frame 2/2');
    expect(status.position.kind).toBe('transition');
    expect(status.position.sourceInputTreeIndex).toBe(0);
    expect(status.position.targetInputTreeIndex).toBe(1);
    expect(status.position.frameNumber).toBe(2);
    expect(status.position.frameCount).toBe(2);
    expect(status.segment.text).toBe('Tree 1 -> 2');
    expect(status.segment.tooltip).toBe('Generated frames between neighboring input trees.');
  });

  it('builds MSA status only when a valid discrete window exists', () => {
    expect(buildMsaWindow(true, 1, 50, 100, 1000)).toEqual({
      startPosition: 1,
      midPosition: 51,
      endPosition: 100,
    });
    expect(buildMsaWindow(true, 1.5, 50, 100, 1000)).toBeNull();
    expect(buildMsaWindow(true, 0, 50, 100, 0)).toBeNull();
  });
});
