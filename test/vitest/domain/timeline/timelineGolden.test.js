// Golden pin for the timeline: segment spans, ms -> cursor, frame -> cursor, ms -> animated frames.
// The expected files were generated from the pre-distill code (`vitest -u` rewrites them);
// every refactor of src/timeline must leave them byte-identical. The exceptions: 15 `resolved`
// rows were regenerated when the progress clock went, where ms / total * total fell 1 ULP short;
// and the `last` frame rows of input trees that start a transition (frame 0 and the like) moved
// from that transition's first step to the input tree's hold, so going back to one shows the tree.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../../../../src/timeline/timeline.js';
import { TransitionFrame } from '../../../../src/treeVisualisation/TransitionFrame.js';
import { applyRenderProgressEasing } from '../../../../src/treeVisualisation/deckgl/interpolation/stages/stageEasing.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const STEP_MS = 100;
const round4 = (x) => Math.round(x * 1e4) / 1e4;

const FIXTURES = {
  small_example: 'test/data/small_example/small_example.response.json',
  ostrich: 'test/data/ostrich_bug_response.json',
  binary_payload: 'test/fixtures/binary/movie_payload.json',
  // Generated in CI before the frontend tests run; gitignored locally.
  paper_example: 'publication_data/precomputed/paper_example.movie.json',
};

function goldenRows(movieData) {
  const timeline = buildTimeline(movieData);
  const { segments, totalDuration: total } = timeline;

  const times = new Set([0, total]);
  for (let ms = 0; ms < total; ms += STEP_MS) times.add(ms);
  for (const { end } of segments) {
    for (const ms of [end - 1, end, end + 1]) times.add(Math.max(0, Math.min(ms, total)));
  }

  const sortedTimes = [...times].sort((a, b) => a - b);

  const frames = [];
  for (let f = 0; f < movieData.frames.length; f += 1) {
    for (const occurrence of ['semantic', 'last']) {
      const cursor = timeline.cursorForFrame(f, { occurrence });
      frames.push([f, occurrence, cursor.movieTimeMs, cursor.segmentIndex]);
    }
  }

  return {
    segments: segments.map((s, i) => [i, s.isInputTreeSegment, s.pairId ?? null, s.start, s.end]),
    cursors: sortedTimes.map((ms) => {
      const cursor = timeline.cursorAt(ms);
      return [ms, cursor?.frameIndex ?? null, cursor?.segmentIndex ?? null];
    }),
    frames,
    // What the tree renderer gets per ms: the frame minus tree hydration, plus the eased render t.
    resolved: sortedTimes.map((ms) => {
      const f = TransitionFrame.from(timeline.frameAt(ms));
      return [
        ms,
        f.sourceTreeIndex,
        f.targetTreeIndex,
        round4(f.transitionProgress),
        round4(applyRenderProgressEasing(f.transitionProgress)),
        f.cursorTreeIndex,
        f.holdKind,
      ];
    }),
  };
}

// Valid JSON with one row per line, so a changed value shows up as a small diff.
const toJson = (rows) =>
  `{\n${Object.entries(rows)
    .map(([key, list]) => `"${key}": [\n${list.map((r) => JSON.stringify(r)).join(',\n')}\n]`)
    .join(',\n')}\n}\n`;

describe('timeline golden', () => {
  for (const [name, file] of Object.entries(FIXTURES)) {
    it.skipIf(!existsSync(path.join(repoRoot, file)))(`${name} keeps its timeline`, async () => {
      const movieData = JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8'));
      await expect(toJson(goldenRows(movieData))).toMatchFileSnapshot(
        `../../../fixtures/timeline-golden/${name}.json`
      );
    });
  }
});
