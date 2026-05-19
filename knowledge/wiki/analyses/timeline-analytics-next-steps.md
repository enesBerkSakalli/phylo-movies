---
title: "Timeline Analytics Next Steps"
type: analysis
status: active
created: 2026-05-18
updated: 2026-05-18
sources:
  - ../../../src/domain/spr/sprAnalytics.js
  - ../../../test/domain/tree/spr-analytics-utils.test.js
  - ../../../src/components/TreeStatsPanel/SubtreeAnalytics/SprActivityTimeline.tsx
  - ../../../src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx
  - ../../../src/components/DistanceChart/distanceChartModel.js
  - ../../../src/components/DistanceChart/DistanceChart.jsx
  - ../../../src/components/movie-player/MovieChartSection/MovieChartSection.jsx
  - ../../../src/timeline/time/PlaybackCursor.js
  - ../../../src/timeline/data/TimelineDataProcessor.js
  - ../../../src/timeline/core/MovieTimelineManager.js
  - ../../../src/domain/indexing/TransitionIndexResolver.js
  - timeline-subsystem-review.md
  - tree-node-highlight-timing-flow.md
  - ../concepts/project-terminology.md
  - https://github.com/rerun-io/rerun
  - https://github.com/foxglove/mcap
  - https://github.com/cruise-automation/webviz
  - https://github.com/nasa/openmct
---

# Timeline Analytics Next Steps

## Summary

Four read-only review agents examined temporal-tool references, Moving Subtrees
analytics, MovieTimelineCharts, and the shared timeline/indexing contract. The
main conclusion is that PhyloMovies should not jump straight into more chart UI.
The next clean step is to make the temporal contract explicit so Moving Subtrees
analytics and `MovieChartSection` / `DistanceChart` use the same identities and
time base.

The implementation direction is a pure `MovieTransitionCatalog`, or a smaller
first slice named `SprTemporalIndex`, that joins SPR movement rows to timeline
segments and movie-time coordinates. This should preserve the existing backend
wire format while making frontend semantics inspectable.

## Review Inputs

- `TemporalToolsReviewer`: Rerun, MCAP, Webviz, and Open MCT lessons.
- `MovingSubtreesReviewer`: current Moving Subtrees analytics and exports.
- `MovieTimelineChartsReviewer`: `MovieChartSection` and `DistanceChart`;
  there is no local symbol named `MovieTimelineCharts` in `src/`.
- `ContractIntegrationReviewer`: timeline indexing, playback cursor, and shared
  frontend/backend data semantics.

## Key Claims

- `buildSprMoveEventRows()` already produces a useful scientific event ledger:
  one row per backend `spr_move_events` entry, with moved subtree, context,
  pivot, source/destination attachment, path metrics, and pair-level distance
  context. Source: [sprAnalytics.js](../../../src/domain/spr/sprAnalytics.js).
- The ledger is not yet timeline-addressable. Event rows carry `pairKey`,
  `pairIndex`, `sourceInputTreeIndex`, and `targetInputTreeIndex`, but not
  `segmentIndex`, movie-time range, or `timelineProgress` range. Source:
  [sprAnalytics.js](../../../src/domain/spr/sprAnalytics.js).
- `DistanceChart` is still an input-tree metric chart. It builds RF/W-RF/scale
  points in `distanceChartModel.js`, resolves active points from
  `currentTreeIndex`, and navigates through `TransitionIndexResolver`.
  Sources: [distanceChartModel.js](../../../src/components/DistanceChart/distanceChartModel.js),
  [DistanceChart.jsx](../../../src/components/DistanceChart/DistanceChart.jsx).
- Playback already has a cursor-shaped state with `timelineProgress`, but the
  chart cursor does not yet use that weighted time base. Source:
  [PlaybackCursor.js](../../../src/timeline/time/PlaybackCursor.js).
- The timeline subsystem already has weighted segment metadata and a manager
  that can resolve timeline progress to transition frames. Sources:
  [TimelineDataProcessor.js](../../../src/timeline/data/TimelineDataProcessor.js),
  [MovieTimelineManager.js](../../../src/timeline/core/MovieTimelineManager.js),
  [[timeline-subsystem-review]].
- The external tools are design references, not dependency candidates:
  Rerun suggests named timelines and static-vs-temporal data; MCAP suggests
  indexed summaries for fast seek; Webviz suggests player and URL seek-state
  patterns; Open MCT suggests explicit time contexts. Sources: linked repository
  roots in frontmatter.

## Highest-Value Next Work

1. Add a pure `MovieTransitionCatalog` or smaller first slice
   `SprTemporalIndex`.

   It should make these identities explicit:

   - `pairOrdinal`: chart/distance array index
   - `pairKey`: backend stable id, for example `pair_7_8`
   - `inputTreeId`: backend/input tree label id
   - `frameIndex`: index into `interpolated_trees`
   - `timelineProgress` and movie-time range

2. Use that model to time-index SPR movement events.

   Current movement rows are useful but cannot answer "what moved at this movie
   time?" or "seek to the evidence for this movement" without duplicating
   timeline interpretation. The next index should join movement rows to segment
   and progress ranges.

3. Then enhance `MovieChartSection` and `DistanceChart`.

   Add an "SPR movements" metric series aligned to movie time rather than only
   input-tree ordinal. The chart should be able to show movement activity beside
   RF/W-RF/scale and keep its cursor synchronized with `playhead.timelineProgress`.

## Immediate Cleanup

- Done: `normalizeSubtreeIndices()` now copies input arrays before filtering and
  sorting, and [spr-analytics-utils.test.js](../../../test/domain/tree/spr-analytics-utils.test.js)
  covers unsorted backend arrays without payload mutation.
- Done: analytics-derived `destinationTreeIndex` is now
  `targetInputTreeIndex`. Backend `destinationAttachment` remains where it
  describes the serialized attachment direction. This aligns with
  [[project-terminology]].
- Done: chart/timeline seek through `goToPosition` now pauses playback and clears
  the stale playback clock, preventing the next animation frame from overwriting
  the seek.

## Enhancement Direction

For Moving Subtrees:

- make movement rows clickable and keyboard actionable;
- seek to the relevant transition evidence;
- export collapse/expand path details;
- allow filtering or highlighting by selected recurrent subtree over time.

For MovieTimelineCharts:

- drive the chart cursor from `playhead.timelineProgress`;
- add SPR activity as a movie-time series;
- enrich tooltips with source input tree, target input tree, generated frame
  range, moved subtree count, and active SPR events;
- keep inspector selection separate from live playback, which matches the
  current timeline selection model.

## Recommended Slice

The next implementation slice should be:

1. Add a tested pure `SprTemporalIndex` that joins SPR event rows to timeline
   segments.
2. Use that index to add one chart metric: SPR movement count over movie time.
3. Only after that, add richer click-to-seek and tooltip behavior.

## Connections

- [[timeline-subsystem-review]]
- [[tree-node-highlight-timing-flow]]
- [[project-terminology]]
- [[phylogenetic-tree-morphing]]

## Open Questions

- Should the first implementation be a narrow `SprTemporalIndex` or the broader
  `MovieTransitionCatalog`?
- Should the first SPR chart series count movement events, unique moved
  subtrees, or both?
- Should URL state eventually encode `timelineProgress`, selected metric, and
  selected movement signature?
