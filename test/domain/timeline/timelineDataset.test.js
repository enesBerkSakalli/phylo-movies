import { describe, expect, it } from 'vitest';
import { TimelineDataset } from '../../../src/timeline/data/TimelineDataset.js';
import { smallExampleMovieData } from '../../fixtures/timeline/generatedMovieData.js';

describe('TimelineDataset', () => {
  it('composes segments, frame rows, occurrence rows, and cursor lookup', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.frameRows[7]).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      pairKey: 'pair_0_1',
    });
    expect(dataset.getOccurrencesForFrame(22).length).toBeGreaterThan(1);

    const startCursor = dataset.getCursorAtMovieTime(0);
    expect(startCursor).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      movieTimeMs: 0,
      timelineProgress: 0,
      segmentIndex: 0,
    });

    const inputHold = dataset
      .getOccurrencesForFrame(22)
      .find((occurrence) => occurrence.holdKind === 'input_tree');
    const inputCursor = dataset.getCursorAtMovieTime(inputHold.movieTimeStartMs);
    expect(inputCursor).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      msaWindowIndex: 1,
    });
  });

  it('resolves frame cursors by first or last temporal occurrence', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    const first = dataset.getCursorForFrame(22);
    const last = dataset.getCursorForFrame(22, { occurrence: 'last' });

    expect(first.frameIndex).toBe(22);
    expect(last.frameIndex).toBe(22);
    expect(last.movieTimeMs).toBeGreaterThan(first.movieTimeMs);
  });
});
