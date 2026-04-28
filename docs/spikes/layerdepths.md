# Layering Redesign — Changes, Tests, Logic, and Trace

This is a strict, test-driven implementation spec.
Rule: if `colorManager` exists, no fallback classification logic is used.

---

## 1) Changes Required (Code)

### A) Layer ordering and partitioning (core)
**File:** `LayerManager.js`

**What changes:**
- Partition nodes/links/labels/extensions into base / history / marked using `ColorManager` + `markedSubtreeData` only.
- Build layers in the new explicit order (see “Layer Order”).

**Strict logic (no fallback if colorManager exists):**
- If `cached.colorManager` exists:
  - History is defined **only** by `colorManager.isNodeHistorySubtree` / `isLinkHistorySubtree`.
  - Marked is defined **only** by `markedSubtreeData` (`isNodeInSubtree` / `isLinkInSubtree`).
  - Base is everything **not** in marked/history.
- If `colorManager` is `null`, only then can a minimal “everything base” path be used.

---

### B) Extension history Z-offset (labels always above extensions)
**File:** `layerConfigs.js`

Add:
```
export const HISTORY_EXTENSION_Z_OFFSET = 0.05;
```
(must be `< HISTORY_LABEL_Z_OFFSET`)

**File:** `GeometryUtils.js`

Add:
- `getExtensionHistoryZOffset(cached, extension)`
- Uses `colorManager.isNodeHistorySubtree` on `extension.leaf || extension`.

**File:** `ExtensionLayers.js`

- Replace `getNodeHistoryZOffset` with `getExtensionHistoryZOffset` in `getPath`.

---

### C) History link depth override removal
**File:** `layerConfigs.js`

- Remove `depthCompare: 'always'` from history link config, or replace with default/no parameters.
- This ensures layer order governs draw order.

---

## 2) New Layer Order (Bottom → Top)

- `phylo-labels-source` (bottom)
- `phylo-labels-destination`
- `phylo-connectors`
- `phylo-links-base`
- `phylo-links-history`
- `phylo-links-marked`
- `phylo-link-outlines`
- `phylo-extensions-base`
- `phylo-extensions-history`
- `phylo-extensions-marked`
- `phylo-extensions-moving-marked` (top of non-labels)
- `phylo-nodes-base`
- `phylo-nodes-history`
- `phylo-nodes-marked`
- `phylo-labels-base`
- `phylo-labels-history`
- `phylo-labels-marked` (top)

**Guarantees:**
- Labels are always the highest.
- Marked > history > base everywhere.
- Moving + marked extensions are above other non-label elements, but below labels.

---

## 3) Partitioning Logic (Strict with ColorManager)

**Nodes / Labels / Extensions:**
```
marked = isNodeInSubtree(node, markedSubtreeData)
history = colorManager.isNodeHistorySubtree(node)
base = !marked && !history
```

**Links:**
```
marked = isLinkInSubtree(link, markedSubtreeData)
history = colorManager.isLinkHistorySubtree(link)
base = !marked && !history
```

**Moving + marked extensions:**
```
movingMarked = markedExtensions.filter(ext => colorManager.isNodeMovingSubtree(ext.leaf || ext))
markedExtensions = markedExtensions - movingMarked
```

**Important:**
- If `colorManager` exists, do **not** treat missing split indices as “base.”
- The element simply won’t be marked/history unless `ColorManager` or subtree data says so.

---

## 4) Tests (TDD)

### A) Layer order test
**File:** `layerOrder.test.js`

**Goal:** Validate output `layers.map(l => l.id)` matches the order above.

**Test data:**
- One base/history/marked node/link/label/extension.
- One moving + marked extension.

**Assertions:**
- Source/dest labels come first.
- Labels come last.
- Marked > history > base for each type.

---

### B) Partitioning correctness test
**File:** `partitioning.test.js`

**Goal:** each element appears in exactly one bucket (base/history/marked).

**Strict:** if `colorManager` exists, no fallback classification.

**Assertions:**
- Marked wins over history.
- History wins over base.
- No element appears in multiple lists.

---

### C) Extension Z offset test
**File:** `extensionZOffset.test.js`

**Goal:** extension history z < label history z.

**Assertions:**
- `HISTORY_EXTENSION_Z_OFFSET < HISTORY_LABEL_Z_OFFSET`.
- `getExtensionHistoryZOffset(...) < getLabelHistoryZOffset(...)` for history items.

---

## 5) Trace — Where Layers Are Applied

### Layer creation + order
- `LayerManager.js`
  - `createTreeLayers()` constructs the ordered layers array.

### Layer application to Deck
- `DeckGLTreeAnimationController.js`
  - `_updateLayersEfficiently()` → `deckContext.setLayers(layers)`.

### Layer rendering lifecycle
- `StaticRenderer.js`
- `InterpolationRenderer.js`

Both call controller methods that build layer data and apply layers.

---

## 6) Trace — Where Changes Will Be Made

### Primary
- `LayerManager.js`
  - new partitioning + reordered layer creation

### Support
- `layerConfigs.js`
  - add `HISTORY_EXTENSION_Z_OFFSET`
  - remove history link depth override

- `GeometryUtils.js`
  - add `getExtensionHistoryZOffset`

- `ExtensionLayers.js`
  - use new offset helper

### Tests
- `layerOrder.test.js`
- `partitioning.test.js`
- `extensionZOffset.test.js`

---

If you want, I can now implement the tests first, then the code changes to satisfy them. All of the points above are covered.

---

## 7) Step-by-Step Task Breakdown

1) **Write failing tests first**
   - Add `test/layerOrder.test.js` to assert the exact layer id order.
   - Add `test/partitioning.test.js` to assert strict base/history/marked partitioning (no fallback when `colorManager` exists).
   - Add `test/extensionZOffset.test.js` to assert `HISTORY_EXTENSION_Z_OFFSET < HISTORY_LABEL_Z_OFFSET` and the helper returns a smaller z than labels for history items.

2) **Introduce extension history z-offset**
   - `layerConfigs.js`: add `HISTORY_EXTENSION_Z_OFFSET`.
   - `GeometryUtils.js`: add `getExtensionHistoryZOffset`.
   - `ExtensionLayers.js`: switch to `getExtensionHistoryZOffset` in `getPath`.

3) **Remove history link depth override**
   - `layerConfigs.js`: remove `depthCompare: 'always'` from history link configs so normal layer order + depthCompare defaults apply.

4) **Implement strict partitioning + ordering**
   - `LayerManager.js`:
     - Derive `marked`, `history`, `base` buckets for nodes/links/labels/extensions using only `colorManager` + `markedSubtreeData` when `colorManager` exists.
     - Split moving+marked extensions into their own bucket.
     - Emit layers in the **New Layer Order** list (source/dest labels bottom; marked labels top).

5) **Integration sanity**
   - Add a small integration test (or extend existing) to ensure order remains stable with empty buckets and no element appears in multiple buckets.

6) **Run test suite**
   - Run `npm test` / `pnpm test` / `bun test` as appropriate for the project to confirm passing.

---

## 8) Why These Changes Are Necessary (deck.gl evidence)

- **Per-layer `parameters` control depth and override defaults**: deck.gl lets each layer specify GPU `parameters`, so removing `depthCompare: 'always'` from history links is required; otherwise that layer will ignore the intended array order and always render on top. citeturn0search0turn0search2
- **Layer order drives draw order**: deck.gl renders layers in the order they appear; the default `polygonOffset` also stacks by layer index. Custom ordering ensures nodes/labels sit above links, etc. citeturn0search6
- **Composite / multiple layers are the supported way to achieve z-stacking semantics**: Splitting marked/history/base into distinct layers follows deck.gl’s recommended pattern for composing sublayers rather than relying on ad-hoc z tweaks. citeturn0search3turn0search4

These references align with the plan’s assumptions: correct ordering must be enforced by explicit layer array order plus per-layer depth parameters; overriding depthCompare (`always`) would defeat that, so removing it is essential. Adding an extension-specific history offset keeps extensions below labels while still separating history visuals.

---

## 9) Similar Issues in Other Tools (GitHub examples)

- **Deck.gl + MapLibre/Mapbox interleaved rendering**: layers end up beneath/over tiles when depth and order aren’t explicitly controlled (e.g., visgl/deck.gl#8602, maplibre/maplibre-gl-js#1369).
- **Deck.gl + harp.gl / shared depth buffer**: icon/arc layers rendered incorrectly because separate renderers can’t share depth; explicit ordering is required (visgl/deck.gl#4603).
- **General deck.gl ordering questions**: community reports that relying on implicit draw order is unreliable; explicit layer ordering and parameters are recommended (visgl/deck.gl discussions #9014).

These cases show that without explicit layer ordering and per-layer depth rules, mixed or overlaid renderers often produce incorrect stacking—reinforcing the need for the changes above.

---

## 10) LLM Soup Audit (Performance Anti-Patterns)

### A) Spread & Slice Trap (implicit allocations in hot paths)
- **Snippet:** `LayerManager._cloneLayerData` (`src/js/treeVisualisation/deckgl/layers/LayerManager.js` ~83-90)
  ```
  const next = { ...data };
  next.nodes = [...data.nodes];
  ```
  **Cost:** Copies every array on each render/update; large node/link arrays trigger frequent Minor GC during animation/scrub.
  **Refactor:** Avoid cloning in render paths; reuse existing arrays or pool buffers. Only clone on structural edits, not per-frame.

- **Snippet:** `createClipboardLayers` (`factory/clipboard/ClipboardLayerFactory.js` ~62-67)
  ```
  const clipNodes = nodes?.map(n => ({ ...n, treeSide: 'clipboard' }));
  ```
  **Cost:** Allocates new objects for every clipboard render; doubles geometry objects and GC pressure.
  **Refactor:** Precompute clipboard copies once or mutate a pooled copy; avoid per-frame spread/map cloning.

- **Snippet:** `ElementMatcher` (`deckgl/interpolation/ElementMatcher.js` ~55-80)
  ```
  new Map(elements.map(el => [el.id, el]));
  return { ...element, opacity: 1, isEntering: true };
  ```
  **Cost:** Per-frame map construction and spread copies for entering/exiting elements in animation loops; churns GC.
  **Refactor:** Reuse a shared Map (clear/set) and set flags on existing objects instead of cloning with spread.

### B) Closure Factory
- No critical repeated closure creation spotted in the hot layer paths; keep upcoming partition helpers as module-level functions or class methods to avoid per-call closures.

### C) Array Lookup Crutch
- No major `find`/`includes` issues in hottest loops, but label splitting currently does multiple `filter` passes. When implementing partitioning, consolidate to a single pass to cut redundant O(N) scans.

**Action:** Fold these refactors into the implementation so the layering fixes don’t introduce new GC/regression in animation/render loops.

---

## 11) Deck.gl Soup Audit (WebGL Hot-Path Anti-Patterns) + Performance-TDD Workflow

🛑 Shallow Compare Killer (prop instability)
- `LayerManager._cloneLayerData` clones arrays each render; forces Deck.gl to invalidate GPU buffers every frame.
- `ClipboardLayerFactory.createClipboardLayers` map+spread per render; same issue for clipboard view.

🛑 Accessor Garbage Hose
- Accessors return fresh arrays (positions/colors); thousands of allocations per frame.
- `ElementMatcher` builds a new Map and spreads entering/exiting elements every frame.

🛑 Array Lookup Crutch
- Multiple `filter` passes for labels each render; redundant O(N) scans at large N.

Performance-TDD Protocol
- Red (baseline): harness renders 50k–100k items; log `deck.stats` (cpuTime, gpuTime, minorGC.totalTime) over 300 frames. Expect high frame times, frequent buffer reuploads, GC spikes.
- Refactor (one change at a time after baseline): stable data references, cached clipboard copies, reusable accessors/binary attrs, shared Map in ElementMatcher, single-pass label partition, deterministic updateTriggers.
- Green (verification): rerun harness; target avg frame <16 ms, p95 <20 ms, reduced minorGC time, buffer reuploads only on real data changes.

---

## 12) Small, Ordered Developer Packages

1) Testing Scaffold (Red state)
   - Add failing tests: `test/layerOrder.test.js`, `test/partitioning.test.js`, `test/extensionZOffset.test.js`.
   - Add perf harness (`scripts/perf-harness.js`) to render 50k–100k items and log `deck.stats` over 300 frames.

2) Depth & Z fixes
   - `layerConfigs.js`: add `HISTORY_EXTENSION_Z_OFFSET`; remove `depthCompare: 'always'` for history links/halo.
   - `GeometryUtils.js`: add `getExtensionHistoryZOffset`.
   - `ExtensionLayers.js`: use `getExtensionHistoryZOffset` in `getPath`.

3) Layer partitioning & order
   - `LayerManager.js`: partition nodes/links/labels/extensions into base/history/marked; extract moving+marked extensions.
   - Emit layers in the new explicit order (source/dest labels bottom; marked labels top).
   - Keep data references stable (no per-frame cloning while partitioning).

4) Shallow-copy eliminations
   - Remove per-frame cloning in `LayerManager._cloneLayerData`.
   - `ClipboardLayerFactory`: cache/pool clipboard copies; avoid per-frame map/spread cloning.

5) Accessor & GC reductions
   - Reuse flyweight arrays/objects or binary attributes for hot accessors (positions/colors).
   - `ElementMatcher`: reuse a shared Map and mutate flags instead of spreading entering/exiting elements.
   - Labels: single-pass bucket split instead of multiple filters.

6) UpdateTriggers sanity
   - Add deterministic `updateTriggers` for new partitioned layers; avoid non-deterministic triggers.

7) Perf re-measure (Green state)
   - Re-run the perf harness; targets: avg frame <16 ms, p95 <20 ms, lower `minorGC.totalTime`, no per-frame buffer reuploads unless data changes.

---
