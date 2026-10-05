import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../../../../src/timeline/timeline.js';
import { smallExampleMovieData } from '../../../fixtures/timeline/generatedMovieData.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

describe('buildTimeline', () => {
  it('composes segments, steps, and cursor lookup', () => {
    const timeline = buildTimeline(smallExampleMovieData);

    expect(timeline.cursorForFrame(7)).toMatchObject({
      frameIndex: 7,
      inputTreeIndex: null,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
    });
    expect(
      timeline.steps.filter((step) => step.from === 22 || step.to === 22).length
    ).toBeGreaterThan(1);

    const startCursor = timeline.cursorAt(0);
    expect(startCursor).toMatchObject({
      frameIndex: 0,
      inputTreeIndex: 0,
      sourceFrameIndex: 0,
      msaWindowIndex: 0,
      movieTimeMs: 0,
      segmentIndex: 0,
    });

    const inputHold = timeline.steps.find((step) => step.hold === 'input_tree' && step.from === 22);
    const inputCursor = timeline.cursorAt(inputHold.start);
    expect(inputCursor).toMatchObject({
      frameIndex: 22,
      inputTreeIndex: 1,
      sourceFrameIndex: 22,
      msaWindowIndex: 1,
    });
  });

  it('resolves frame cursors by semantic default or last appearance', () => {
    const timeline = buildTimeline(smallExampleMovieData);

    const semantic = timeline.cursorForFrame(22);
    const last = timeline.cursorForFrame(22, { occurrence: 'last' });
    const inputHold = timeline.steps.find((step) => step.hold === 'input_tree' && step.from === 22);

    expect(semantic.frameIndex).toBe(22);
    expect(last.frameIndex).toBe(22);
    expect(semantic.movieTimeMs).toBe(inputHold.start);
    expect(semantic.occurrenceRole).toBe('hold');
    expect(semantic.holdKind).toBe('input_tree');
    expect(last.movieTimeMs).toBeGreaterThanOrEqual(semantic.movieTimeMs);
  });

  it('seeks motion-target frame cursors to the completed motion time', () => {
    const timeline = buildTimeline(smallExampleMovieData);
    const motion = timeline.steps.find((step) => step.from !== step.to);

    const cursor = timeline.cursorForFrame(motion.to);

    expect(cursor.movieTimeMs).toBe(motion.end);
    expect(cursor.occurrenceRole).toBe('motion_target');
    expect(cursor.motionSourceFrameIndex).toBe(motion.from);
    expect(cursor.motionTargetFrameIndex).toBe(motion.to);
  });

  it('anchors the paper example final input cursor on the input-tree hold', () => {
    const paperExampleMovieData = readJson('publication_data/precomputed/paper_example.movie.json');
    const timeline = buildTimeline(paperExampleMovieData);
    const finalFrameIndex = paperExampleMovieData.interpolated_trees.length - 1;

    const semantic = timeline.cursorForFrame(finalFrameIndex);

    expect(semantic).toMatchObject({
      frameIndex: finalFrameIndex,
      occurrenceRole: 'hold',
      holdKind: 'input_tree',
      segmentIndex: 3,
      movieTimeMs: 15900,
    });
  });

  it('resolves the animated frame at a movie time and clamps outside the movie', () => {
    const timeline = buildTimeline(smallExampleMovieData);
    const motion = timeline.steps.find((step) => step.from !== step.to);
    const hold = timeline.steps.find((step) => step.hold === 'input_tree');

    const mid = timeline.frameAt((motion.start + motion.end) / 2);
    expect([mid.sourceTreeIndex, mid.targetTreeIndex]).toEqual([motion.from, motion.to]);
    expect(mid.transitionProgress).toBeCloseTo(0.5, 10);

    const held = timeline.frameAt(hold.start);
    expect([held.sourceTreeIndex, held.targetTreeIndex]).toEqual([hold.from, hold.from]);
    expect([held.transitionProgress, held.holdKind]).toEqual([0, 'input_tree']);

    expect(timeline.frameAt(-5).sourceTreeIndex).toBe(timeline.steps[0].from);
    expect(timeline.frameAt(1e9).targetTreeIndex).toBe(timeline.steps.at(-1).to);
  });

  it('resolves exact timeline boundaries consistently', () => {
    const timeline = buildTimeline(smallExampleMovieData);
    const { segments, cumulativeDurations, totalDuration } = timeline;
    const firstMotion = segments.findIndex(
      (segment, index) => index > 0 && segment.lastFrame > segment.firstFrame
    );

    const atBoundary = timeline.cursorAt(cumulativeDurations[firstMotion - 1]);
    expect(atBoundary.segmentIndex).toBe(firstMotion);
    expect(atBoundary.frameIndex).toBe(segments[firstMotion].firstFrame);

    const atEnd = timeline.cursorAt(totalDuration);
    expect(atEnd.segmentIndex).toBe(segments.length - 1);
    expect(atEnd.frameIndex).toBe(segments.at(-1).lastFrame);
  });

  it('builds segments from a binary-backed payload without interpolated_trees', () => {
    // A PMB1 payload carries a treeSource instead of an interpolated_trees
    // array. Segment creation must not index that array; this pins the demo
    // bootstrap crash where buildInputTreeSegment read undefined[0].
    const timeline = buildTimeline({ ...smallExampleMovieData, interpolated_trees: undefined });

    expect(timeline.segments.length).toBeGreaterThan(0);
    expect(timeline.segments[0]).toMatchObject({ isInputTreeSegment: true, globalIndex: 0 });
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

    expect(buildTimeline(movieData).cursorForFrame(7)).toMatchObject({
      msaWindowIndex: 10,
      sourceInputTreeIndex: 10,
      targetInputTreeIndex: 11,
    });
  });
});
