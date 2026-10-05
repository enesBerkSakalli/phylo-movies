# Timeline distill plan

Date: 2026-10-05. Approved by the user: all 8 steps.

## Why

`src/timeline` is 4,358 lines in 32 files. One fact (an ordered list of timed stops) is stored four
times (segments, intervals, occurrences, pair spans), and one clock (movie ms) also travels as a
progress fraction 0..1, converted at about 8 sites (lossy: lands in the previous step at 5 exact
boundaries). "How far into a move" has six names; a frame has four shapes; "is input tree" has five
predicates; pair metrics are looked up in four places.

## Target model

Four concepts, ms is the only clock:

- **frame**: index into the backend `frames[]` row list. No copies.
- **step**: `{start, end, from, to, hold?, segment}` in ms; `from === to` is a hold. One flat sorted
  array.
- **segment**: selectable run of steps (input tree or transition piece) carrying `pair`,
  `pivotEdge`, `affectedSubtrees`, `firstFrame`, `lastFrame`.
- **cursor**: `{movieTimeMs, frameIndex, segmentIndex, from, to, hold}` plus a frame-row lookup.

Files (8, about 1,700 lines):

1. `timeline.js`: `buildTimeline(movieData)` →
   `{segments, steps, totalMs, pairs, inputFrames, stepAt(ms), cursorAt(ms), cursorForFrame(f, {last}), segmentBounds(i), segmentAt(ms)}`.
   Absorbs data/ (except the pair files), math/, time/Interval, segmentTiming, TIMING_PROFILE.
2. `pairChanges.js`: `buildPairChanges` — the only RF / kind / SPR lookup, built once.
3. `stripGeometry.js`: pairStripGeometry + segmentProcessor.
4. `deckLayers.js`: layerFactories + theme.
5. `TimelineView.js`: deck, layers, range/zoom/pan, aria.
6. `timelineInput.js`: pointer/keys → callbacks `{onScrub, onSelect, onHover, onInspect}`.
7. `timelineController.js`: mount, store sync, scrub throttle, click-to-seek, zoom.
8. `describeCursor.js`: status text and aria text from one function.

The store gets `timeline` (pure, always exists) and `timelineView` (set on mount) instead of one
manager that is both. TransitionFrame moves to `src/treeVisualisation`.

## Must preserve (pinning tests)

- Hold/motion lengths 1500/200/900/300/1000 ms (timeline-construction.test.js:699-749; paper example
  15,900 ms, timelineDataset.test.js:92).
- Fulfillment folds into the last split segment only when a pair has more than one split event
  (timeline-construction:567, 603, 622).
- Frame → cursor rule: forward = first occurrence, backward = last, observed inputs = input hold,
  motion target = end time (timelineDataset.test:51-90, playbackSliceNavigation.test).
- Nearest frame at t < 0.5 (transitionFrame.test, treeIndexSemantics).
- Resume from the exact ms (playbackSliceNavigation:95, 126; lifecycle:487).
- Clicking an input tree pins it (navigation-controller.test:58).
- Aria slider and keys (deck-timeline-renderer.test:261-364); 150 ms hover clear.
- Strip geometry (pairStripGeometry.test); status text (timelineStatusModel.test); MSA window from
  the cursor (useTreeController:126).
- Unpinned, add a test: `isScrubbing = false` must precede the final cursor write, or
  useTreeController skips the last render.
- Static tests that pin source text need edits: timelinePlayerBarStatic, timeline-construction:345,
  unusedPlumbingStatic (layerFactories exports), test/helpers/deckGLMocks.js:96 (module paths).

## Steps (green after each; one commit per step)

0. **Golden test** (~150 lines): dump `[segment, start, end, from, to, hold]` and ms-sampled cursors
   from the current code for 4 fixtures (seed: the scratchpad prototype `proto.mjs`). Every later
   step must keep it green.
1. **Dead code**: `isTooltipHovered` / `setTooltipHovered`; renderer events `itemover`, `itemout`,
   `mouseMove` (no subscriber); `getSegmentCount`; `Dataset.isInputFrame`; store
   `scrollToStartTimeline` / `scrollToEndTimeline` and manager `scrollToStart` / `scrollToEnd`
   (UI removed in 27a51801); `timeToProgress` (test-only); identical branches at
   ScrubController:104; TimelineStateSynchronizer; the `recharts` dependency (orphaned by 27a51801).
   Merge `resolveCursorTreeIndex` / `resolveComparisonActiveTreeIndex` (identical bodies).
2. **Pair changes once**: `pairChanges` built once into the store; Inspector, tooltip, strip and
   legend read it; one `isInputFrame`.
3. **Steps**: add `steps` / `stepAt` / `cursorForFrame`; Dataset and MathUtils delegate; golden must
   pass. Then delete Occurrences, TimingResolver, Interval.
4. **Segments**: `firstFrame` / `lastFrame` replace `interpolationData`; merge the 3 builders; drop
   FrameView.
   Done: the builders live in `TimelineDataProcessor` until step 6 (fulfillment and branch-length-only
   were one path); `firstFrame..lastFrame` is the played range (a split segment starts one frame early
   and the last one may fold the closing motion), `globalStart` / `globalEnd` stay the event's own range
   for the tooltip; segment `index` and `animationStepCount` also went (unread), and the cursor lost the
   fields src never read.
5. **ms only**: `frameAt(ms)`, `seek(ms)`; hydration moves tree-side; AnimationRunner uses one
   `stepAt`; delete item ids. Split into 5a add, 5b migrate callers, 5c delete.
6. **Controller**: replaces MovieTimelineManager, ScrubberAPI, ScrubController, NavigationController;
   `isScrubbing` into the store; separate `timeline` / `timelineView` store keys.
7. **Renderer split**: DeckTimelineRenderer → TimelineView + timelineInput; callbacks instead of the
   emitter; one selection owner.
8. **describeCursor** for status and aria; one `rightComparisonIndex(state, frame)` for the five
   copies (AnimationRunner:380, StaticRenderer:75, useTreeController:247, ScrubberAPI:123,
   pinnedTree).

Then: docs pass for UI strings removed in 27a51801 and renamed modules.

## Test commands

- Timeline focus: `npx mocha --require @babel/register test/mocha/default/{timeline-*,deck-timeline-renderer,scrubber-api,segment-timing}.test.js`
  and `npx vitest run test/vitest/domain/timeline test/vitest/domain/playback test/vitest/integration/timeline test/vitest/integration/state`.
- Full: `npm run validate:frontend` (`frameInstrumentation.test.js` can time out under load; rerun it
  alone).
