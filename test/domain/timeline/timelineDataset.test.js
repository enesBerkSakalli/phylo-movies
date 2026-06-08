import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TimelineDataset } from '../../../src/timeline/data/TimelineDataset.js';
import { smallExampleMovieData } from '../../fixtures/timeline/generatedMovieData.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

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

  it('resolves frame cursors by semantic default or explicit temporal occurrence', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    const first = dataset.getCursorForFrame(22, { occurrence: 'first' });
    const semantic = dataset.getCursorForFrame(22);
    const last = dataset.getCursorForFrame(22, { occurrence: 'last' });
    const inputHold = dataset
      .getOccurrencesForFrame(22)
      .find((occurrence) => occurrence.holdKind === 'input_tree');

    expect(first.frameIndex).toBe(22);
    expect(semantic.frameIndex).toBe(22);
    expect(last.frameIndex).toBe(22);
    expect(semantic.movieTimeMs).toBe(inputHold.movieTimeStartMs);
    expect(semantic.occurrenceRole).toBe('hold');
    expect(semantic.holdKind).toBe('input_tree');
    expect(last.movieTimeMs).toBeGreaterThanOrEqual(first.movieTimeMs);
  });

  it('seeks motion-target frame cursors to the completed motion time', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);
    const motionTarget = dataset.occurrences.find(
      (occurrence) => occurrence.role === 'motion_target'
    );

    const cursor = dataset.getCursorForFrame(motionTarget.frameIndex, {
      occurrence: motionTarget.occurrenceInFrameIndex,
    });
    const startCursor = dataset.getCursorForFrame(motionTarget.frameIndex, {
      occurrence: motionTarget.occurrenceInFrameIndex,
      timeAnchor: 'start',
    });

    expect(cursor.movieTimeMs).toBe(motionTarget.movieTimeEndMs);
    expect(cursor.timelineProgress).toBe(motionTarget.timelineProgressEnd);
    expect(startCursor.movieTimeMs).toBe(motionTarget.movieTimeStartMs);
    expect(startCursor.timelineProgress).toBe(motionTarget.timelineProgressStart);
    expect(cursor.motionSourceFrameIndex).toBe(motionTarget.sourceMotionFrameIndex);
    expect(cursor.motionTargetFrameIndex).toBe(motionTarget.frameIndex);
  });

  it('anchors the paper example final input cursor on the input-tree hold', () => {
    const paperExampleMovieData = readJson('publication_data/precomputed/paper_example.movie.json');
    const dataset = TimelineDataset.fromMovieData(paperExampleMovieData);
    const finalFrameIndex = paperExampleMovieData.interpolated_trees.length - 1;

    const first = dataset.getCursorForFrame(finalFrameIndex, { occurrence: 'first' });
    const semantic = dataset.getCursorForFrame(finalFrameIndex);

    expect(first).toMatchObject({
      frameIndex: finalFrameIndex,
      occurrenceRole: 'motion_target',
      segmentIndex: 2,
    });
    expect(semantic).toMatchObject({
      frameIndex: finalFrameIndex,
      occurrenceRole: 'hold',
      holdKind: 'input_tree',
      segmentIndex: 3,
      movieTimeMs: 15900,
    });
  });

  it('owns input-frame indices and distance-index navigation', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.getInputFrameIndices()).toEqual([0, 22, 23, 45, 46, 47, 48, 70, 92, 114]);
    expect(dataset.isInputFrame(22)).toBe(true);
    expect(dataset.isInputFrame(7)).toBe(false);
    expect(dataset.getPairFrameRanges()[0]).toEqual([0, 22]);
  });
});
