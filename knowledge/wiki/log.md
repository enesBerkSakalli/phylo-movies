---
title: "Knowledge Wiki Log"
type: log
status: active
created: 2026-05-16
updated: 2026-05-16
sources: []
---

# Knowledge Wiki Log

Append-only chronological log of wiki operations.

## [2026-05-16] scaffold | Initialize LLM Wiki

- Created the initial knowledge wiki scaffold.
- Registered Karpathy's LLM Wiki gist as the seed source.
- Added the initial [[llm-wiki]] concept page.
- Added ingest, query, lint, and repository-selection tool notes.

## [2026-05-16] environment | Add keys and identifier protocol

- Added `.env.example` with safe placeholders only.
- Added `knowledge/tools/environment.md`.
- Defined provider key handling, local secret generation, source IDs, page slugs,
  operation IDs, run IDs, artifact IDs, graph node IDs, and graph link IDs.

## [2026-05-16] ingest | Initial repository documentation

- Operation ID: `op-20260516-initial-docs`
- Source IDs: `src-0002` through `src-0006`
- Inputs:
  - `docs/terminology.md`
  - `README.md`
  - `docs/velocity-normalisation-design.md`
  - `plans/DEPENDENCY_MAP.md`
  - `revision/MBE_revision_response_draft.md`
- Outputs:
  - [[src-0002-project-terminology]]
  - [[src-0003-readme]]
  - [[src-0004-velocity-normalisation-design]]
  - [[src-0005-dependency-map]]
  - [[src-0006-mbe-revision-response-draft]]
  - [[project-terminology]]
  - [[phylogenetic-tree-morphing]]
  - [[velocity-normalisation]]
  - [[repository-architecture]]
  - [[software-distribution]]
  - [[publication-revision-context]]
  - [[phylo-movies]]
  - [[brancharchitect]]
- Secrets used: none

## [2026-05-16] analysis | Render node and link ID call map

- Operation ID: `op-20260516-render-id-map`
- Inputs:
  - `src/treeVisualisation/utils/KeyGenerator.js`
  - `src/domain/tree/splits.js`
  - `src/treeVisualisation/layout/LayoutResultAdapter.js`
  - `src/treeVisualisation/deckgl/builders/data/`
  - `src/treeVisualisation/deckgl/interpolation/`
  - `src/treeVisualisation/comparison/ComparisonUtils.js`
  - `src/treeVisualisation/deckgl/data/transforms/Connector*.js`
- Outputs:
  - [[render-node-link-id-call-map]]
- Secrets used: none

## [2026-05-16] analysis | Timeline subsystem review

- Operation ID: `op-20260516-timeline-review`
- Inputs:
  - `src/timeline/data/TimelineDataProcessor.js`
  - `src/timeline/core/MovieTimelineManager.js`
  - `src/timeline/core/TimelineClock.js`
  - `src/timeline/core/TimelineScrubController.js`
  - `src/timeline/core/TimelineNavigationController.js`
  - `src/timeline/core/TimelineStateSynchronizer.js`
  - `src/timeline/core/ScrubberAPI.js`
  - `src/timeline/math/TimelineMathUtils.js`
  - `src/timeline/renderers/DeckTimelineRenderer.js`
  - `src/timeline/data/segmentProcessor.js`
  - `src/timeline/events/eventHandlers.js`
  - `src/core/slices/playbackSlice.js`
- Outputs:
  - [[timeline-subsystem-review]]
- Secrets used: none

## [2026-05-16] analysis | Commit and worktree review

- Operation ID: `op-20260516-commit-worktree-review`
- Inputs:
  - Recent commits from `18026aa` through `dd18b9b`
  - Current uncommitted diff touching render identity, timeline timing,
    connector transforms, layout normalization, and tests
  - `src/domain/tree/splits.js`
  - `src/treeVisualisation/layout/LayoutBaseUtils.js`
  - `src/treeVisualisation/layout/LayoutResultAdapter.js`
  - `src/timeline/utils/segmentTiming.js`
  - `test/NormalizedRenderContract.test.js`
  - `test/segment-timing.test.js`
- Outputs:
  - [[commit-and-worktree-review-2026-05-16]]
  - [[render-node-link-id-call-map]]
  - [[timeline-subsystem-review]]
- Secrets used: none

## [2026-05-16] analysis | Tree node, highlight, and timing flow

- Operation ID: `op-20260516-tree-node-highlight-timing-flow`
- Inputs:
  - `engine/BranchArchitect/brancharchitect/movie_pipeline/tree_interpolation_pipeline.py`
  - `engine/BranchArchitect/webapp/services/trees/frontend_builder.py`
  - `src/domain/backend/phyloMovieSchema.ts`
  - `src/domain/backend/treePayloadValidators.ts`
  - `src/timeline/data/TimelineDataProcessor.js`
  - `src/timeline/math/TimelineMathUtils.js`
  - `src/timeline/core/ScrubberAPI.js`
  - `src/domain/animation/AnimationTiming.js`
  - `src/state/phyloStore/internal/changeTracking.helpers.js`
  - `src/state/phyloStore/slices/treeChange/treeRuntimeSync.slice.js`
  - `src/state/phyloStore/slices/treeChange/treeHighlightState.slice.js`
  - `src/treeVisualisation/systems/AnimationRunner.js`
  - `src/treeVisualisation/systems/InterpolationRenderer.js`
  - `src/treeVisualisation/DeckGLTreeAnimationController.js`
  - `src/treeVisualisation/comparison/ComparisonModeRenderer.js`
  - `src/treeVisualisation/deckgl/layers/LayerManager.js`
  - `src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js`
  - `src/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js`
  - `src/treeVisualisation/deckgl/layers/factory/nodes/NodeLayers.js`
  - `src/treeVisualisation/deckgl/data/transforms/SubtreeConnectorBuilder.js`
- Outputs:
  - [[tree-node-highlight-timing-flow]]
- Secrets used: none

## [2026-05-16] maintenance | Subtree highlight contract terminology cleanup

- Operation ID: `op-20260516-subtree-highlight-contract-terminology-cleanup`
- Inputs:
  - `knowledge/wiki/analyses/tree-node-highlight-timing-flow.md`
  - `src/domain/backend/phyloMovieSchema.ts`
  - `engine/BranchArchitect/webapp/services/trees/frontend_builder.py`
- Outputs:
  - [[tree-node-highlight-timing-flow]]
- Secrets used: none
