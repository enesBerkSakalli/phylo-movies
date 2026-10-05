// Golden pin for the timeline: segment spans, ms -> cursor, frame -> cursor.
// The expected files were generated from the pre-distill code (`vitest -u` rewrites them);
// every refactor of src/timeline must leave them byte-identical.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TimelineDataProcessor } from '../../../../src/timeline/data/TimelineDataProcessor.js';
import { TimelineDataset } from '../../../../src/timeline/data/TimelineDataset.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const STEP_MS = 100;

const FIXTURES = {
  small_example: 'test/data/small_example/small_example.response.json',
  ostrich: 'test/data/ostrich_bug_response.json',
  binary_payload: 'test/fixtures/binary/movie_payload.json',
  // Generated in CI before the frontend tests run; gitignored locally.
  paper_example: 'publication_data/precomputed/paper_example.movie.json',
};

function buildTimeline(movieData) {
  const segments = TimelineDataProcessor.createSegments(movieData);
  const timelineData = TimelineDataProcessor.createTimelineData(segments);
  const dataset = TimelineDataset.fromMovieData(movieData, {
    segments,
    timelineData,
    treeList: movieData.interpolated_trees,
  });
  return { dataset, segments, ends: timelineData.cumulativeDurations };
}

function goldenRows(movieData) {
  const { dataset, segments, ends } = buildTimeline(movieData);
  const total = ends[ends.length - 1];

  const times = new Set([0, total]);
  for (let ms = 0; ms < total; ms += STEP_MS) times.add(ms);
  for (const end of ends) {
    for (const ms of [end - 1, end, end + 1]) times.add(Math.max(0, Math.min(ms, total)));
  }

  const frames = [];
  for (let f = 0; f < movieData.frames.length; f += 1) {
    for (const occurrence of ['semantic', 'last']) {
      const cursor = dataset.getCursorForFrame(f, { occurrence });
      frames.push([f, occurrence, cursor.movieTimeMs, cursor.segmentIndex]);
    }
  }

  return {
    segments: segments.map((s, i) => [
      i,
      s.isInputTreeSegment,
      s.pairId ?? null,
      i === 0 ? 0 : ends[i - 1],
      ends[i],
    ]),
    cursors: [...times]
      .sort((a, b) => a - b)
      .map((ms) => {
        const cursor = dataset.getCursorAtMovieTime(ms);
        return [ms, cursor?.frameIndex ?? null, cursor?.segmentIndex ?? null];
      }),
    frames,
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
