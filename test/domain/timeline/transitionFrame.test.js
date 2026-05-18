import { describe, expect, it } from 'vitest';
import { TransitionFrame } from '../../../src/timeline/time/TransitionFrame.js';

describe('TransitionFrame', () => {
  it('names transition payload semantics and derives tree-index roles from one frame', () => {
    const sourceTree = { id: 'source' };
    const targetTree = { id: 'target' };

    const frame = TransitionFrame.from({
      sourceTree,
      targetTree,
      sourceTreeIndex: 4,
      targetTreeIndex: 5,
      transitionProgress: 0.25,
      holdKind: 'mover'
    }, {
      timelineProgress: 0.4
    });

    expect(frame.sourceTree).toBe(sourceTree);
    expect(frame.targetTree).toBe(targetTree);
    expect(frame.sourceTreeIndex).toBe(4);
    expect(frame.targetTreeIndex).toBe(5);
    expect(frame.transitionProgress).toBe(0.25);
    expect(frame.renderProgress).toBe(0.25);
    expect(frame.timelineProgress).toBe(0.4);
    expect(frame.holdKind).toBe('mover');
    expect(frame.cursorTreeIndex).toBe(4);
    expect(frame.highlightTreeIndex).toBe(5);
    expect(frame.comparisonActiveTreeIndex).toBe(4);
  });

  it('keeps raw transition progress separate from eased render progress', () => {
    const transitionChangeModel = { hasLifecycleChanges: true };
    const frame = TransitionFrame.from({
      sourceTreeIndex: 1,
      targetTreeIndex: 2,
      transitionProgress: 0.25
    }).withRenderState({
      renderProgress: 0.75,
      stage: 'EXPAND',
      transitionChangeModel
    });

    expect(frame.transitionProgress).toBe(0.25);
    expect(frame.renderProgress).toBe(0.75);
    expect(frame.stage).toBe('EXPAND');
    expect(frame.transitionChangeModel).toBe(transitionChangeModel);
    expect(frame.toRenderOptions({ scrubMode: true })).toEqual({
      fromTreeIndex: 1,
      toTreeIndex: 2,
      stage: 'EXPAND',
      transitionChangeModel,
      rawTimeFactor: 0.25,
      scrubMode: true
    });
  });

  it('does not expose the old interpolation-data adapter', () => {
    const frame = TransitionFrame.from({
      sourceTreeIndex: 1,
      targetTreeIndex: 2,
      transitionProgress: 0.25
    });

    expect(frame.toInterpolationData).toBeUndefined();
  });
});
