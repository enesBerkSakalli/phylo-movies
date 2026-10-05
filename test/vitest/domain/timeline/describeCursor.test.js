import { describe, expect, it } from 'vitest';
import { describeCursor } from '../../../../src/timeline/describeCursor.js';

// Input trees at frames 0, 3 and 6: input, transition (frames 1-2), input, transition, input.
const input = (originalTreeIndex) => ({ isInputTreeSegment: true, originalTreeIndex });
const transition = (pairOrdinal, sourceGlobalIndex, targetGlobalIndex) => ({
  isInputTreeSegment: false,
  pairOrdinal,
  sourceInputTreeIndex: pairOrdinal,
  targetInputTreeIndex: pairOrdinal + 1,
  sourceGlobalIndex,
  targetGlobalIndex,
});
const timeline = {
  segments: [input(0), transition(0, 0, 3), input(1), transition(1, 3, 6), input(2)],
};

describe('describeCursor', () => {
  it('describes an input-tree hold', () => {
    expect(describeCursor(timeline, { segmentIndex: 2, frameIndex: 3, movieTimeMs: 1500 })).toEqual(
      {
        text: 'Input tree 2',
        from: 2,
        aria: 'Input tree 2 of 3',
        tooltip: 'An observed tree from one alignment window or uploaded tree set.',
        time: '0:01.5',
      }
    );
  });

  it('describes a transition by its trees and generated step', () => {
    expect(describeCursor(timeline, { segmentIndex: 1, frameIndex: 2, movieTimeMs: 2500 })).toEqual(
      {
        text: 'Tree 1 → 2',
        short: '1→2 · 2/2',
        from: 1,
        to: 2,
        step: 'step 2 of 2',
        aria: 'Transition 1 of 2: tree 1 to tree 2, step 2 of 2',
        tooltip: 'Generated frames between neighboring input trees.',
        time: '0:02.5',
      }
    );
  });

  it('stays in the transition while its last motion lands on an input tree', () => {
    // Past the halfway point the nearest frame is the target input tree (frame 3), yet the
    // playhead is still moving: the same words for the status strip, the MSA viewer's tree chip
    // (`from`, `to`) and screen readers.
    const description = describeCursor(timeline, {
      segmentIndex: 1,
      frameIndex: 3,
      movieTimeMs: 1762600,
    });

    expect(description.text).toBe('Tree 1 → 2');
    expect([description.from, description.to]).toEqual([1, 2]);
    expect(description.step).toBe('step 2 of 2');
    expect(description.aria).toBe('Transition 1 of 2: tree 1 to tree 2, step 2 of 2');
    expect(description.time).toBe('29:22.6');
  });

  it('leaves out the step when a pair has no generated frames', () => {
    const description = describeCursor(
      { segments: [input(0), transition(0, 0, 1), input(1)] },
      { segmentIndex: 1, frameIndex: 0, movieTimeMs: 1600 }
    );

    expect(description.step).toBe('');
    expect(description.short).toBe('1→2');
    expect(description.aria).toBe('Transition 1 of 1: tree 1 to tree 2');
  });

  it('describes nothing when the cursor is on no segment', () => {
    expect(describeCursor(timeline, null)).toBeNull();
    expect(describeCursor(timeline, { segmentIndex: null, movieTimeMs: 0 })).toBeNull();
  });
});
