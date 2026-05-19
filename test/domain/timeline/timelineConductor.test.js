import { describe, expect, it } from 'vitest';
import { TimelineConductor } from '../../../src/timeline/core/TimelineConductor.js';
import { TimelineDataset } from '../../../src/timeline/data/TimelineDataset.js';
import { smallExampleMovieData } from '../../fixtures/timeline/generatedMovieData.js';

describe('TimelineConductor', () => {
  it('owns a fixed cursor derived from movie time, progress, or frame occurrence', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);
    const conductor = TimelineConductor.fixed(dataset);

    const start = conductor.setMovieTimeMs(0);
    const byProgress = conductor.setTimelineProgress(start.timelineProgress);
    const byFrame = conductor.setFrameIndex(22, { occurrence: 'last' });

    expect(start).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
    });
    expect(byProgress.frameIndex).toBe(start.frameIndex);
    expect(byFrame).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
    });
    expect(conductor.cursor).toBe(byFrame);
  });
});
