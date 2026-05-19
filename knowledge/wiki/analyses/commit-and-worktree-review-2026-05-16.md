---
title: "Commit and Worktree Review 2026-05-16"
type: analysis
status: active
created: 2026-05-16
updated: 2026-05-18
sources:
  - ../../../src/domain/tree/splits.js
  - ../../../src/treeVisualisation/layout/LayoutBaseUtils.js
  - ../../../src/treeVisualisation/layout/LayoutResultAdapter.js
  - ../../../src/treeVisualisation/deckgl/builders/data/nodes/NodeDataBuilder.js
  - ../../../src/treeVisualisation/deckgl/builders/data/links/LinkDataBuilder.js
  - ../../../src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js
  - ../../../src/treeVisualisation/deckgl/builders/data/extensions/ExtensionDataBuilder.js
  - ../../../src/treeVisualisation/deckgl/interpolation/ElementMatcher.js
  - ../../../src/timeline/utils/segmentTiming.js
  - ../../../src/timeline/math/TimelineMathUtils.js
  - ../../../src/timeline/renderers/DeckTimelineRenderer.js
  - ../../../test/NormalizedRenderContract.test.js
  - ../../../test/RenderContractStatic.test.js
  - ../../../test/segment-timing.test.js
---

# Commit and Worktree Review 2026-05-16

## Summary

This page is a historical snapshot of the commit history and uncommitted diff
reviewed on 2026-05-16. At that point, legacy render-layer shims were being
removed, identity generation was moving into domain/layout contracts, timeline
segment timing was being centralized, and interpolation hot paths were getting
allocation and cache improvements.

The snapshot's wiki-impacting changes were:

- [[render-node-link-id-call-map]] must treat `src/domain/tree/splits.js` and
  layout-prepared IDs as the identity source of truth.
- [[timeline-subsystem-review]] must treat `segmentTiming.js` as the shared
  segment bounds, lookup, and UI item ID conversion module.
- [[repository-architecture]] should continue to track the split between the
  React/deck.gl frontend, BranchArchitect backend, and optional Electron wrapper;
  these changes are internal frontend refactors.

## Reviewed Commits

| Commit | Change | Wiki Impact |
|---|---|---|
| `dd18b9b` | Cache tree interpolation element maps. | Reinforces that stable element IDs are performance-critical. |
| `0c3fb72` | Drop unused comparison left-index payload. | Narrows comparison render payloads. |
| `d9acdba` | Remove moving-taxa layout cache plumbing. | Simplifies layout cache documentation; moving taxa no longer need separate layout cache keys. |
| `ac62080` | Remove legacy deck layer shims. | Confirms deck.gl layer docs should focus on current factories, not compatibility shims. |
| `2180fe8` | Report scrub render failures. | Timeline scrub docs should include error propagation from scrub rendering. |
| `452588e` | Store timeline inspector selection by index. | Timeline docs should distinguish zero-based store segment indexes from one-based renderer item IDs. |
| `6898708` | Add linting and harden local setup. | Wiki verification can rely on the repo lint/test scripts plus Markdown-specific checks. |
| `406ebeb` | Preserve explicit label bounds size. | Render contract docs should treat label bounds as explicit layout metadata. |
| `e0eb155` | Tighten viewport bounds contracts. | Viewport and spatial-bound docs should prefer strict bounds contracts. |
| `5659ed4` | Update BranchArchitect submodule. | Backend source of transition data changed by submodule pointer. |
| `18026aa` | Clarify SPR movement labels. | Terminology docs should keep UI labels aligned with movement semantics. |

## Worktree Snapshot Review

The reviewed dirty worktree contained 38 changed paths, with roughly balanced additions
and deletions. The changes cluster into four areas.

### Render Identity

`src/treeVisualisation/utils/KeyGenerator.js` is deleted. The key helpers now
live beside split matching in `src/domain/tree/splits.js`:

- `getNodeKey()`
- `getLinkKey()`
- `getLabelKey()`
- `getExtensionKey()`

`assignLayoutNodeIds()` in `LayoutBaseUtils.js` prepares D3 hierarchy node IDs
when `TidyTreeLayout` and `RadialTreeLayout` are constructed. From there,
`LayoutResultAdapter.js` copies `node.id` into normalized layout nodes and emits
links with `sourceId` and `targetId`, but no layout-stage `link.id`.

Deck data builders now have clearer responsibilities:

- `NodeDataBuilder` reuses normalized `node.id`.
- `NodeGeometryBuilder` sizes dots by normalized `node.id`.
- `LinkDataBuilder` reuses normalized endpoint IDs and computes final
  `link-${splitKey}` branch IDs from the target split.
- `LabelDataBuilder` and `ExtensionDataBuilder` still produce prefixed IDs from
  split keys.

The important contract is that source trees must have valid `split_indices`
before layout construction, because downstream builders now skip missing
normalized IDs instead of silently recalculating them.

### Timeline Timing

`src/timeline/utils/searchUtils.js` is deleted and replaced by
`src/timeline/utils/segmentTiming.js`.

The new timing helper centralizes:

- segment bounds from `cumulativeDurations`
- time-to-segment lookup
- conversion from zero-based segment indexes to one-based renderer item IDs
- conversion from renderer item IDs back to segment indexes

Callers updated in the reviewed snapshot included `MovieTimelineManager`,
`TimelineNavigationController`, `TimelineStateSynchronizer`,
`TimelineMathUtils`, `DeckTimelineRenderer`, `segmentProcessor.js`,
and `segmentUtils.js`.

The boundary policy remains subtle:

- default lookup prefers the last segment when adjacent segments share a
  cumulative time, preserving shared-boundary input-tree behavior
- math callers can request first-boundary behavior
- math callers can include the exact timeline end when resolving the final
  segment

### Connector and Legacy Cleanup

Connector eligibility now reads split indices from normalized leaf info and
checks subset membership directly. This removes key-parsing from
`ConnectorSplitEligibility.js`.

Other cleanup removes:

- `projectNodesToScreen()` from `spatial/projections.js`
- prominent-history tracking from `TreeColorManager.js`
- legacy render key helper references from static render-contract tests

### Tests Added or Tightened

The current diff extends guardrails around the new contracts:

- `NormalizedRenderContract.test.js` checks prepared layout node IDs,
  preservation of node radii by prepared ID, normalized ID copying, absence of
  layout-stage link IDs, and builder reuse of normalized IDs.
- `RenderContractStatic.test.js` checks removal of unused key-based helpers.
- `SplitIdentity.test.js` imports key helpers from `domain/tree/splits.js`.
- `ElementMatcher.test.js` checks element map construction without
  intermediate array allocation.
- `segment-timing.test.js` covers segment bounds, boundary lookup behavior, and
  UI item ID conversions.

## Review Findings

No blocking wiki-level contradictions were found in this 2026-05-16 snapshot.
The documentation gap was that the wiki still named deleted helper modules as
authorities.

Residual implementation risks to track:

- New layout ID preparation makes missing `split_indices` a harder failure mode.
- Timeline item IDs remain one-based outside the array model; new call paths
  should use `segmentTiming.js` rather than inline arithmetic.
- `timeToSegmentIndex()` has option-sensitive boundary behavior, so call sites
  should document why they need default, first-boundary, or timeline-end
  semantics.

## Connections

- [[render-node-link-id-call-map]]
- [[timeline-subsystem-review]]
- [[repository-architecture]]
- [[project-terminology]]
- [[phylogenetic-tree-morphing]]
