import { describe, expect, it } from 'vitest';
import { TimelineDataProcessor } from '../../../src/timeline/data/TimelineDataProcessor.js';
import { buildTimelineFrameRows } from '../../../src/timeline/data/TimelineFrameRows.js';
import { buildTimelineOccurrences } from '../../../src/timeline/data/TimelineOccurrences.js';
import { smallExampleMovieData } from '../../fixtures/timeline/generatedMovieData.js';

function build(movieData) {
  const segments = TimelineDataProcessor.createSegments(movieData);
  const timelineData = TimelineDataProcessor.createTimelineData(segments);
  const frameRows = buildTimelineFrameRows(movieData);
  return buildTimelineOccurrences({ segments, timelineData, frameRows });
}

describe('buildTimelineOccurrences', () => {
  it('keeps repeated temporal occurrences for the same backend frame', () => {
    const { occurrencesByFrameIndex } = build(smallExampleMovieData);

    const frame22 = occurrencesByFrameIndex.get(22);
    const frame23 = occurrencesByFrameIndex.get(23);

    expect(frame22.map((occurrence) => occurrence.role)).toEqual(
      expect.arrayContaining(['hold', 'motion_source'])
    );
    expect(frame22.find((occurrence) => occurrence.holdKind === 'input_tree')).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      movieTimeStartMs: expect.any(Number),
      movieTimeEndMs: expect.any(Number),
    });
    expect(frame23.map((occurrence) => occurrence.role)).toEqual(
      expect.arrayContaining(['motion_target', 'hold', 'motion_source'])
    );
  });

  it('records movie-time and normalized-progress ranges per occurrence', () => {
    const { occurrences } = build(smallExampleMovieData);

    const inputHold = occurrences.find(
      (occurrence) => occurrence.frameIndex === 0 && occurrence.role === 'hold'
    );
    const firstMotion = occurrences.find(
      (occurrence) => occurrence.frameIndex === 0 && occurrence.role === 'motion_source'
    );

    expect(inputHold).toMatchObject({
      segmentIndex: 0,
      frameIndex: 0,
      role: 'hold',
      movieTimeStartMs: 0,
      movieTimeEndMs: 1500,
      timelineProgressStart: 0,
    });
    expect(inputHold.timelineProgressEnd).toBeGreaterThan(0);
    expect(firstMotion).toMatchObject({
      segmentIndex: 1,
      frameIndex: 0,
      targetFrameIndex: 1,
      role: 'motion_source',
      movieTimeStartMs: 1500,
    });
    expect(firstMotion.movieTimeEndMs).toBeGreaterThan(firstMotion.movieTimeStartMs);
  });
});
