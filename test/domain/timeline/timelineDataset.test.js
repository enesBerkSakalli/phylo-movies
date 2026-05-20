import { describe, expect, it } from 'vitest';
import { TimelineDataset } from '../../../src/timeline/data/TimelineDataset.js';
import { smallExampleMovieData } from '../../fixtures/timeline/generatedMovieData.js';

describe('TimelineDataset', () => {
  it('composes segments, frame rows, occurrence rows, and cursor lookup', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.frameViews[7]).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: null,
      sourceFrameIndex: 0,
      pairId: 'pair_0_1',
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
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

  it('owns input-frame indices and distance-index navigation', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.getInputFrameIndices()).toEqual([0, 22, 23, 45, 46, 47, 48, 70, 92, 114]);
    expect(dataset.isInputFrame(22)).toBe(true);
    expect(dataset.isInputFrame(7)).toBe(false);
    expect(dataset.getPairFrameRanges()[0]).toEqual([0, 22]);
  });
});
