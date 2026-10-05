import { describe, expect, it } from 'vitest';
import { buildTimeline, cursorForFrame, stepAt } from '../../../../src/timeline/timeline.js';
import { smallExampleMovieData } from '../../../fixtures/timeline/generatedMovieData.js';

const { steps, totalDuration, cumulativeDurations } = buildTimeline(smallExampleMovieData);

describe('timeline steps', () => {
  it('tile the movie in order, each inside its segment', () => {
    expect(steps[0].start).toBe(0);
    expect(steps.at(-1).end).toBe(totalDuration);
    steps.forEach((step, i) => {
      if (i > 0) expect(step.start).toBe(steps[i - 1].end);
      expect(step.start).toBeGreaterThanOrEqual(cumulativeDurations[step.segment - 1] ?? 0);
      expect(step.end).toBeLessThanOrEqual(cumulativeDurations[step.segment]);
    });
  });

  it('resolve a boundary to the step that starts there, and clamp outside the movie', () => {
    steps.forEach((step, i) => {
      expect(stepAt(steps, step.start)).toBe(step);
      if (i > 0) expect(stepAt(steps, step.start - 0.001)).toBe(steps[i - 1]);
    });
    expect(stepAt(steps, -5)).toBe(steps[0]);
    expect(stepAt(steps, totalDuration)).toBe(steps.at(-1));
  });

  it('anchor a frame on its input-tree hold, or on its last appearance', () => {
    const hold = steps.find((step) => step.hold === 'input_tree' && step.from === 22);
    expect(cursorForFrame(steps, 22)).toEqual({ step: hold, ms: hold.start });
    expect(cursorForFrame(steps, 0, true).ms).toBe(1500);
    expect(cursorForFrame(steps, 23).step.hold).toBe('input_tree');
    expect(steps.some((step) => step.hold === 'no_op_pair' && step.to === 23)).toBe(true);
    expect(cursorForFrame(steps, 9999)).toBeNull();
  });

  it('anchor a motion target on the motion end', () => {
    const motion = steps.find((step) => step.from !== step.to);
    expect(cursorForFrame(steps, motion.to)).toEqual({ step: motion, ms: motion.end });
  });
});
