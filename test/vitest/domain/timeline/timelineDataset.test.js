import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TimelineDataset } from '../../../../src/timeline/data/TimelineDataset.js';
import { smallExampleMovieData } from '../../../fixtures/timeline/generatedMovieData.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

describe('TimelineDataset', () => {
  it('composes segments, frame rows, steps, and cursor lookup', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.getCursorForFrame(7)).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: null,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
    });
    expect(
      dataset.steps.filter((step) => step.from === 22 || step.to === 22).length
    ).toBeGreaterThan(1);

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

    const inputHold = dataset.steps.find((step) => step.hold === 'input_tree' && step.from === 22);
    const inputCursor = dataset.getCursorAtMovieTime(inputHold.start);
    expect(inputCursor).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      msaWindowIndex: 1,
    });
  });

  it('resolves frame cursors by semantic default or last appearance', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    const semantic = dataset.getCursorForFrame(22);
    const last = dataset.getCursorForFrame(22, { occurrence: 'last' });
    const inputHold = dataset.steps.find((step) => step.hold === 'input_tree' && step.from === 22);

    expect(semantic.frameIndex).toBe(22);
    expect(last.frameIndex).toBe(22);
    expect(semantic.movieTimeMs).toBe(inputHold.start);
    expect(semantic.occurrenceRole).toBe('hold');
    expect(semantic.holdKind).toBe('input_tree');
    expect(last.movieTimeMs).toBeGreaterThanOrEqual(semantic.movieTimeMs);
  });

  it('seeks motion-target frame cursors to the completed motion time', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);
    const motion = dataset.steps.find((step) => step.from !== step.to);

    const cursor = dataset.getCursorForFrame(motion.to);

    expect(cursor.movieTimeMs).toBe(motion.end);
    expect(cursor.timelineProgress).toBe(motion.end / dataset.timelineData.totalDuration);
    expect(cursor.occurrenceRole).toBe('motion_target');
    expect(cursor.motionSourceFrameIndex).toBe(motion.from);
    expect(cursor.motionTargetFrameIndex).toBe(motion.to);
  });

  it('anchors the paper example final input cursor on the input-tree hold', () => {
    const paperExampleMovieData = readJson('publication_data/precomputed/paper_example.movie.json');
    const dataset = TimelineDataset.fromMovieData(paperExampleMovieData);
    const finalFrameIndex = paperExampleMovieData.interpolated_trees.length - 1;

    const semantic = dataset.getCursorForFrame(finalFrameIndex);

    expect(semantic).toMatchObject({
      frameIndex: finalFrameIndex,
      occurrenceRole: 'hold',
      holdKind: 'input_tree',
      segmentIndex: 3,
      movieTimeMs: 15900,
    });
  });

  it('owns input-frame indices', () => {
    const dataset = TimelineDataset.fromMovieData(smallExampleMovieData);

    expect(dataset.getInputFrameIndices()).toEqual([0, 22, 23, 45, 46, 47, 48, 70, 92, 114]);
  });

  it('builds segments from a binary-backed payload without interpolated_trees', () => {
    // A PMB1 payload carries a treeSource instead of an interpolated_trees
    // array. Segment creation must not index that array; this pins the demo
    // bootstrap crash where buildInputTreeSegment read undefined[0].
    const { interpolated_trees: trees, ...binaryBackedMovieData } = smallExampleMovieData;
    const dataset = TimelineDataset.fromMovieData(binaryBackedMovieData, { treeList: trees });

    expect(dataset.segments.length).toBeGreaterThan(0);
    expect(dataset.treeList).toHaveLength(trees.length);
    expect(dataset.segments[0]).toMatchObject({ isInputTreeSegment: true, globalIndex: 0 });
  });

  it('reads source and target input trees from the pair row, not the pair id', () => {
    const movieData = {
      ...smallExampleMovieData,
      pairs: smallExampleMovieData.pairs.map((pair) =>
        pair.pair_id === 'pair_0_1'
          ? { ...pair, source_input_tree_index: 10, target_input_tree_index: 11 }
          : pair
      ),
    };

    expect(TimelineDataset.fromMovieData(movieData).getCursorForFrame(7)).toMatchObject({
      msaWindowIndex: 10,
      sourceInputTreeIndex: 10,
      targetInputTreeIndex: 11,
    });
  });
});
