# Dockview Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visualization window's fixed sidebar, three floating `react-rnd` windows and
hand-docked Transition Inspector with a VS Code-style dockview workbench ported from Quirk.

**Architecture:** A `src/components/dock/` module owns the workbench: a panel registry (metadata),
pure layout helpers (placement, persistence, floating bounds), an `AdaptiveDock` port for narrow
screens, a runtime (`openPanel` / `closePanel` / `togglePanel`), and the `<Dock />` host. Existing
store flags (`isMsaViewerOpen`, `taxaColoringOpen`, `selectedTimelineSegmentIndex`) stay the
public API; a sync hook mirrors them to dock panels and back. Existing view contents become panel
bodies with their window chrome removed. The movie player bar stays a fixed strip below the dock.

**Tech Stack:** React 19.2.8, zustand 5, dockview-react 8.2.0, lucide-react, Tailwind 4 + shadcn,
vitest 4 (default environment `node`; `// @vitest-environment jsdom` for DOM tests), Vite.

**Spec:** `docs/superpowers/specs/2026-10-04-dockview-workbench-design.md`

**Reference implementation (read-only):**
`/Users/berksakalli/Projects/GitHub/EnesSakalliUniWien/Quirk` — `src/components/dock.jsx`,
`src/components/adaptive-dock.js`, `src/components/panels/panels.jsx`,
`src/components/panels/shared/panel-wrapper.jsx`, `src/browser/theme/dock.js`,
`src/styles/shell/dock.css`, `test/components/dock/adaptive-dock.test.js`.

## Global Constraints

- Dependency: `dockview-react@8.2.0` (exact version Quirk uses). Remove `react-rnd`.
- Panel ids (used in saved layouts, tests, and `data-panel-id`): `tree`, `settings`, `inspector`,
  `moved-subtrees`, `alignment`, `taxa-coloring`.
- `tree` is the only permanent panel: never closeable, always re-added if a layout lacks it.
- `tree` and `settings` use `renderer: "always"` (never unmounted while hidden).
- First visit (no saved layout): `tree` centre and `settings` on the left at 280px.
- `settings` is closeable; ☰ in the player bar and Ctrl/⌘+B toggle it.
- `taxa-coloring` opens floating at 720×560, kept inside the dock.
- `inspector` and `moved-subtrees` dock in one right-hand column (first one opened creates it,
  inspector 340px wide); `alignment` docks below the tree at 40% of the dock height.
- Layout is saved to `localStorage` key `phylo-movies.dock-layout`; floating panels are not saved.
- Below 920px dock width, all docked panels gather into one tab group (AdaptiveDock).
- The movie player bar and timeline stay a fixed strip below the dock.
- Visual world unchanged: shadcn tokens, lucide icons, existing type scale (`text-2xs` 11px,
  `text-xs` 12px, `text-sm` 13px, root 14px).
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Per-task check: `npx eslint <changed files> --max-warnings=0`, `npx prettier --check <changed files>`,
  and the task's tests. Final task runs `npm run validate:frontend` (the two existing
  demo-payload data tests may still fail; nothing else may).

## Review Focus

1. A saved layout that is corrupt JSON or references a panel id that no longer exists: the dock
   must start from the default layout, not crash or show an empty work area. (Tests in Task 2 and
   Task 5.)
2. `localStorage` throws (Safari private mode, blocked site data): no crash, default layout, no
   save attempts that throw. (Test in Task 2.)
3. The user closes Settings and reloads: Settings must stay closed; only the permanent tree is
   re-added. (Test in Task 5.)
4. Closing the Inspector tab must clear the selected timeline segment, and clearing the segment
   (Inspector's own ✕) must close the tab; selecting a segment again reopens it. (Test in Task 7.)
5. Splitting or resizing the tree panel must resize the deck.gl canvas and keep the tree framed;
   the canvas must not be remounted when other tabs come to the front. (Registry test in Task 1
   pins `alwaysRender`; browser check in Task 8.)

---

## File Structure

| File                                                                                           | Responsibility                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/dock/panelRegistry.js` (create)                                                | Panel metadata: id → `{title, icon, permanent, alwaysRender, defaultOpen, place, floating}`. No React components.                                                                                                 |
| `src/components/dock/dockLayout.js` (create)                                                   | Pure helpers: `withoutFloatingPanels`, `readSavedLayout`, `saveLayout`, `placementFor`, `floatingWithin`.                                                                                                         |
| `src/components/dock/adaptiveDock.js` (create)                                                 | Port of Quirk's `AdaptiveDock`, with anchor and pinned ids as parameters.                                                                                                                                         |
| `src/components/dock/dockRuntime.js` (create)                                                  | Holds the dock API; `openPanel`, `closePanel`, `togglePanel`, `subscribeDock`, `useIsPanelOpen`.                                                                                                                  |
| `src/components/dock/PanelVisibility.js` (create)                                              | Context + `usePanelVisibility()` for hidden-panel awareness.                                                                                                                                                      |
| `src/components/dock/panelComponents.jsx` (create)                                             | id → wrapped React component map that dockview renders.                                                                                                                                                           |
| `src/components/dock/panels/TreePanel.jsx` (create)                                            | Deck.gl canvas + canvas controls + render overlay.                                                                                                                                                                |
| `src/components/dock/panels/SettingsPanel.jsx` (create)                                        | Settings body (current `ToolsSidebar`) as a static panel.                                                                                                                                                         |
| `src/components/dock/dockStartup.js` (create)                                                  | `restoreDockLayout`: restore the saved layout or build the default one (pure, testable in node).                                                                                                                  |
| `src/components/dock/Dock.jsx` (create)                                                        | `DockviewReact` host: save on change, adaptive narrow mode, Ctrl/⌘+B.                                                                                                                                             |
| `src/components/dock/dockPanelSync.js` (create)                                                | Store ↔ dock bindings and `useDockPanelSync()`.                                                                                                                                                                   |
| `src/css/dock.css` (create)                                                                    | `dockview-theme-phylo` variables mapped to shadcn tokens; tab icon layout.                                                                                                                                        |
| `src/components/msa/MsaPanel.jsx` (rename from `MsaRndWindow.jsx`)                             | Alignment panel body.                                                                                                                                                                                             |
| `src/components/taxa-coloring/TaxaColoringPanel.jsx` (rename from `TaxaColoringRndWindow.jsx`) | Taxa colouring panel body.                                                                                                                                                                                        |
| `src/components/TreeStatsPanel/AnalyticsDashboard.tsx` (modify)                                | Export the body as `MovedSubtreesPanel`; drop window chrome.                                                                                                                                                      |
| `src/components/TransitionInspectorPanel.jsx` (modify)                                         | Fill its panel; empty state when no segment.                                                                                                                                                                      |
| `src/components/sidebar/ToolsSidebar.jsx` (modify)                                             | Static (`collapsible="none"`) body; open panels via runtime.                                                                                                                                                      |
| `src/components/movie-player/MoviePlayerBar.jsx` (modify)                                      | ☰ toggles the Settings panel.                                                                                                                                                                                    |
| `src/App.jsx` (modify)                                                                         | Shell: `<Dock />` above `<MoviePlayerBar />`.                                                                                                                                                                     |
| `src/features/tours/workspaceTour.js` (modify)                                                 | Open Settings before the tour filters its steps.                                                                                                                                                                  |
| Store slices, selectors, `src/types/store.ts` (modify)                                         | Remove window-rect state.                                                                                                                                                                                         |
| Deleted                                                                                        | `msaWindowPlacement.js`, `floatingWindowGeometry.js`, `floating-window-layer.js`, `selectMsaWindow.js`, `selectSetMsaWindow.js`, `selectTaxaColoringWindow.js`, `selectSetTaxaColoringWindow.js` and their tests. |

---

### Task 1: Panel registry and dockview dependency

**Files:**

- Modify: `package.json`, `package-lock.json` (via npm)
- Create: `src/components/dock/panelRegistry.js`
- Test: `test/vitest/domain/dock/panelRegistry.test.js`

**Interfaces:**

- Produces: `TREE_PANEL_ID: 'tree'`, `SETTINGS_PANEL_ID: 'settings'`,
  `PANEL_REGISTRY: Readonly<Record<PanelId, PanelEntry>>`, `getPanelEntry(id): PanelEntry | undefined`.
  `PanelEntry = {title: string, icon: LucideIcon, permanent?: true, alwaysRender?: true,
defaultOpen?: true, place?: {direction: 'left'|'right'|'below', width?: number, heightShare?: number},
floating?: {width: number, height: number}}`.

- [ ] **Step 1: Install dockview-react**

Run: `npm install dockview-react@8.2.0 --save-exact`
Expected: `package.json` dependencies gain `"dockview-react": "8.2.0"`.

- [ ] **Step 2: Write the failing test**

```js
// test/vitest/domain/dock/panelRegistry.test.js
import { describe, expect, it } from 'vitest';
import {
  PANEL_REGISTRY,
  SETTINGS_PANEL_ID,
  TREE_PANEL_ID,
  getPanelEntry,
} from '../../../../src/components/dock/panelRegistry.js';

describe('dock panel registry', () => {
  it('registers the workbench panels under stable ids', () => {
    expect(Object.keys(PANEL_REGISTRY)).toEqual([
      'tree',
      'settings',
      'inspector',
      'moved-subtrees',
      'alignment',
      'taxa-coloring',
    ]);
    expect(TREE_PANEL_ID).toBe('tree');
    expect(SETTINGS_PANEL_ID).toBe('settings');
  });

  it('makes only the tree permanent, and keeps tree and settings mounted while hidden', () => {
    const permanent = Object.entries(PANEL_REGISTRY).filter(([, entry]) => entry.permanent);
    expect(permanent.map(([id]) => id)).toEqual(['tree']);
    expect(PANEL_REGISTRY.tree.alwaysRender).toBe(true);
    expect(PANEL_REGISTRY.settings.alwaysRender).toBe(true);
  });

  it('opens settings on first visit, on the left at 280px', () => {
    expect(PANEL_REGISTRY.settings.defaultOpen).toBe(true);
    expect(PANEL_REGISTRY.settings.place).toEqual({ direction: 'left', width: 280 });
  });

  it('docks inspector and moved subtrees right, alignment below, taxa colouring floating', () => {
    expect(PANEL_REGISTRY.inspector.place).toEqual({ direction: 'right', width: 340 });
    expect(PANEL_REGISTRY['moved-subtrees'].place).toEqual({ direction: 'right', width: 420 });
    expect(PANEL_REGISTRY.alignment.place).toEqual({ direction: 'below', heightShare: 0.4 });
    expect(PANEL_REGISTRY['taxa-coloring'].floating).toEqual({ width: 720, height: 560 });
  });

  it('gives every panel a title and an icon', () => {
    for (const entry of Object.values(PANEL_REGISTRY)) {
      expect(typeof entry.title).toBe('string');
      expect(entry.icon).toBeTruthy();
    }
    expect(getPanelEntry('missing')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/panelRegistry.test.js`
Expected: FAIL, cannot resolve `panelRegistry.js`.

- [ ] **Step 4: Write the registry**

```js
// src/components/dock/panelRegistry.js
import { ArrowRightLeft, Dna, GitBranch, Network, Palette, SlidersHorizontal } from 'lucide-react';

export const TREE_PANEL_ID = 'tree';
export const SETTINGS_PANEL_ID = 'settings';

/**
 * Every panel the dock can show, keyed by the id dockview writes into saved layouts.
 *
 * - `permanent`: the app rather than a view of it; never closeable, re-added if missing.
 * - `alwaysRender`: kept mounted while another tab of its group is in front (the deck.gl canvas
 *   must not lose its WebGL context; the settings form must not lose its state).
 * - `defaultOpen`: added on a first visit, when there is no saved layout.
 * - `place`: where the panel docks when opened, relative to the tree.
 * - `floating`: opens as a window over the dock at this maximum size.
 */
export const PANEL_REGISTRY = Object.freeze({
  tree: { title: 'Tree', icon: Network, permanent: true, alwaysRender: true },
  settings: {
    title: 'Settings',
    icon: SlidersHorizontal,
    alwaysRender: true,
    defaultOpen: true,
    place: { direction: 'left', width: 280 },
  },
  inspector: {
    title: 'Transition Inspector',
    icon: ArrowRightLeft,
    place: { direction: 'right', width: 340 },
  },
  'moved-subtrees': {
    title: 'Moved Subtrees',
    icon: GitBranch,
    place: { direction: 'right', width: 420 },
  },
  alignment: {
    title: 'Alignment',
    icon: Dna,
    place: { direction: 'below', heightShare: 0.4 },
  },
  'taxa-coloring': {
    title: 'Taxa colouring',
    icon: Palette,
    floating: { width: 720, height: 560 },
  },
});

export function getPanelEntry(id) {
  return Object.hasOwn(PANEL_REGISTRY, id) ? PANEL_REGISTRY[id] : undefined;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/vitest/domain/dock/panelRegistry.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Register the new test folder and commit**

Run: `npm run test:structure`. If it reports `test/vitest/domain/dock` as unknown, add the folder
to the list in `scripts/list-tests.js` the same way `test/vitest/domain/workspace` is listed, and
rerun until it prints `Orphan specs (0)`.

```bash
git add package.json package-lock.json src/components/dock/panelRegistry.js test/vitest/domain/dock/panelRegistry.test.js scripts/list-tests.js
git commit -m "feat(dock): add dockview dependency and panel registry"
```

---

### Task 2: Pure layout helpers (placement, persistence, floating bounds)

**Files:**

- Create: `src/components/dock/dockLayout.js`
- Test: `test/vitest/domain/dock/dockLayout.test.js`

**Interfaces:**

- Consumes: `PANEL_REGISTRY`, `TREE_PANEL_ID`, `getPanelEntry` (Task 1).
- Produces:
  - `LAYOUT_STORAGE_KEY = 'phylo-movies.dock-layout'`
  - `withoutFloatingPanels(layout: object): object`
  - `readSavedLayout(storage: Storage | undefined): object | undefined`
  - `saveLayout(storage: Storage | undefined, layout: object): void`
  - `floatingWithin(wanted: {width, height}, dock: {width, height}): {width, height, position: {left, top}}`
  - `placementFor(id: string, api: {width, height, panels}, {narrow}: {narrow: boolean}): object`
    returning dockview `addPanel` options without `id`/`component`/`title`.

- [ ] **Step 1: Write the failing test**

```js
// test/vitest/domain/dock/dockLayout.test.js
import { describe, expect, it } from 'vitest';
import {
  LAYOUT_STORAGE_KEY,
  floatingWithin,
  placementFor,
  readSavedLayout,
  saveLayout,
  withoutFloatingPanels,
} from '../../../../src/components/dock/dockLayout.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

function gridPanel(id, group = { id: `g-${id}` }) {
  return { id, group: { ...group, api: { location: { type: 'grid' } } } };
}

describe('dock layout helpers', () => {
  it('drops floating groups and their panels from a saved layout', () => {
    const layout = {
      grid: { root: {} },
      panels: { tree: {}, 'taxa-coloring': {} },
      floatingGroups: [{ data: { views: ['taxa-coloring'] } }],
    };
    expect(withoutFloatingPanels(layout)).toEqual({ grid: { root: {} }, panels: { tree: {} } });
    const docked = { grid: {}, panels: { tree: {} } };
    expect(withoutFloatingPanels(docked)).toBe(docked);
  });

  it('round-trips a layout through storage', () => {
    const storage = memoryStorage();
    saveLayout(storage, { grid: { root: 1 }, panels: { tree: {} } });
    expect(JSON.parse(storage.data.get(LAYOUT_STORAGE_KEY))).toEqual({
      grid: { root: 1 },
      panels: { tree: {} },
    });
    expect(readSavedLayout(storage)).toEqual({ grid: { root: 1 }, panels: { tree: {} } });
  });

  it('treats corrupt or missing saved layouts as none', () => {
    expect(readSavedLayout(memoryStorage({ [LAYOUT_STORAGE_KEY]: '{not json' }))).toBeUndefined();
    expect(readSavedLayout(memoryStorage())).toBeUndefined();
    expect(readSavedLayout(undefined)).toBeUndefined();
  });

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readSavedLayout(throwing)).toBeUndefined();
    expect(() => saveLayout(throwing, { panels: {} })).not.toThrow();
  });

  it('keeps floating windows inside the dock and centred', () => {
    expect(floatingWithin({ width: 720, height: 560 }, { width: 1200, height: 700 })).toEqual({
      width: 720,
      height: 560,
      position: { left: 240, top: 70 },
    });
    expect(floatingWithin({ width: 720, height: 560 }, { width: 500, height: 400 })).toEqual({
      width: 468,
      height: 368,
      position: { left: 16, top: 16 },
    });
  });

  it('places settings left of the tree at its width', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('settings', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'left' },
      initialWidth: 280,
    });
  });

  it('opens the first right-hand panel as a new column and joins later ones to it', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('inspector', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'right' },
      initialWidth: 340,
    });
    const inspector = gridPanel('inspector', { id: 'right-column' });
    api.panels.push(inspector);
    expect(placementFor('moved-subtrees', api, { narrow: false })).toEqual({
      position: { referenceGroup: inspector.group },
    });
  });

  it('places the alignment below the tree at 40% of the dock height', () => {
    const api = { width: 1200, height: 700, panels: [gridPanel('tree')] };
    expect(placementFor('alignment', api, { narrow: false })).toEqual({
      position: { referencePanel: 'tree', direction: 'below' },
      initialHeight: 280,
    });
  });

  it('floats taxa colouring, and stacks docked panels as tabs on narrow screens', () => {
    const api = { width: 800, height: 600, panels: [gridPanel('tree')] };
    expect(placementFor('taxa-coloring', api, { narrow: true })).toEqual({
      floating: { width: 720, height: 560, position: { left: 40, top: 20 } },
    });
    expect(placementFor('alignment', api, { narrow: true })).toEqual({
      position: { referencePanel: 'tree' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/dockLayout.test.js`
Expected: FAIL, cannot resolve `dockLayout.js`.

- [ ] **Step 3: Write the helpers**

```js
// src/components/dock/dockLayout.js
import { TREE_PANEL_ID, getPanelEntry } from './panelRegistry.js';

export const LAYOUT_STORAGE_KEY = 'phylo-movies.dock-layout';
const FLOATING_MARGIN = 16;

/**
 * The arrangement worth remembering is the docked one: a floating panel answers a moment, and
 * reopening it on the next visit would answer a question nobody asked (Quirk's rule).
 */
export function withoutFloatingPanels(layout) {
  const floating = new Set(
    (layout.floatingGroups ?? []).flatMap((group) => group.data?.views ?? [])
  );
  if (floating.size === 0) return layout;
  const panels = Object.fromEntries(
    Object.entries(layout.panels ?? {}).filter(([id]) => !floating.has(id))
  );
  const { floatingGroups: _dropped, ...rest } = layout;
  return { ...rest, panels };
}

export function readSavedLayout(storage) {
  try {
    const text = storage?.getItem(LAYOUT_STORAGE_KEY);
    return text == null ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function saveLayout(storage, layout) {
  try {
    storage?.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(withoutFloatingPanels(layout)));
  } catch {
    // Blocked site data: the next visit simply gets the default arrangement.
  }
}

/** A floating window that does not fit is worse than a smaller one: its size is a maximum. */
export function floatingWithin(wanted, dock) {
  const width = Math.min(wanted.width, Math.max(1, dock.width - FLOATING_MARGIN * 2));
  const height = Math.min(wanted.height, Math.max(1, dock.height - FLOATING_MARGIN * 2));
  return {
    width,
    height,
    position: { left: (dock.width - width) / 2, top: (dock.height - height) / 2 },
  };
}

function rightColumnGroup(api) {
  const docked = api.panels.find(
    (panel) =>
      getPanelEntry(panel.id)?.place?.direction === 'right' &&
      panel.group.api.location.type === 'grid'
  );
  return docked?.group;
}

/** Where a panel goes when opened: beside the tree, never on top of it (except when narrow). */
export function placementFor(id, api, { narrow }) {
  const entry = getPanelEntry(id);
  if (entry?.floating) return { floating: floatingWithin(entry.floating, api) };
  if (narrow || !entry?.place) return { position: { referencePanel: TREE_PANEL_ID } };

  const { direction, width, heightShare } = entry.place;
  if (direction === 'right') {
    const column = rightColumnGroup(api);
    if (column) return { position: { referenceGroup: column } };
  }
  if (direction === 'below') {
    return {
      position: { referencePanel: TREE_PANEL_ID, direction },
      initialHeight: Math.round(api.height * heightShare),
    };
  }
  return { position: { referencePanel: TREE_PANEL_ID, direction }, initialWidth: width };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/vitest/domain/dock/dockLayout.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dock/dockLayout.js test/vitest/domain/dock/dockLayout.test.js
git commit -m "feat(dock): add placement, persistence and floating-bounds helpers"
```

---

### Task 3: AdaptiveDock port for narrow screens

**Files:**

- Create: `src/components/dock/adaptiveDock.js`
- Test: `test/vitest/domain/dock/adaptiveDock.test.js`

**Interfaces:**

- Produces: `class AdaptiveDock { constructor(api, wideLayout?, {anchorId, pinnedIds}); narrow: boolean;
changing: boolean; setNarrow(narrow: boolean): void; reconcile(): void; gather(): void;
layout(): object }`. Defaults: `anchorId = 'tree'`, `pinnedIds = ['tree', 'settings']`.

- [ ] **Step 1: Write the failing test** (ported from Quirk's `adaptive-dock.test.js`, with
      `tree`/`settings` in place of `circuit`/`gates`)

```js
// test/vitest/domain/dock/adaptiveDock.test.js
// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDockview } from 'dockview-react';
import { AdaptiveDock } from '../../../../src/components/dock/adaptiveDock.js';

const originalResizeObserver = globalThis.ResizeObserver;
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

function fixture() {
  const host = document.createElement('div');
  document.body.append(host);
  const elements = new Map();
  const disposed = [];
  const api = createDockview(host, {
    createComponent: ({ id }) => {
      const element = document.createElement('input');
      element.value = `draft:${id}`;
      elements.set(id, element);
      return {
        element,
        init() {},
        dispose() {
          disposed.push(id);
        },
      };
    },
  });
  api.layout(1200, 600);
  const add = (id, position) => api.addPanel({ id, component: id, renderer: 'always', position });
  add('tree');
  add('settings', { referencePanel: 'tree', direction: 'left' });
  add('inspector', { referencePanel: 'tree', direction: 'right' });
  add('moved-subtrees', { referencePanel: 'inspector' });
  api.getPanel('settings').group.api.setSize({ width: 280 });
  api.getPanel('inspector').group.api.setSize({ width: 340 });
  api.getPanel('tree').api.setActive();
  return {
    api,
    add,
    elements,
    disposed,
    close() {
      api.dispose();
      host.remove();
    },
  };
}

function shape(node) {
  return node.type === 'leaf' ? node.data.views : node.data.map(shape);
}

describe('AdaptiveDock', () => {
  it('gathers into one tab group and restores the wide grid without remounting panels', () => {
    const f = fixture();
    try {
      f.add('alignment', { referencePanel: 'tree', direction: 'below' });
      const before = f.api.toJSON();
      const drafts = new Map(f.elements);
      const adaptive = new AdaptiveDock(f.api);
      adaptive.setNarrow(true);
      expect(f.api.groups.length).toBe(1);
      expect(f.api.panels.length).toBe(5);
      expect(shape(adaptive.layout().grid.root)).toEqual(shape(before.grid.root));
      adaptive.setNarrow(false);
      expect(shape(f.api.toJSON().grid.root)).toEqual(shape(before.grid.root));
      expect(f.disposed).toEqual([]);
      for (const [id, input] of drafts) {
        expect(f.elements.get(id)).toBe(input);
        expect(input.value).toBe(`draft:${id}`);
      }
    } finally {
      f.close();
    }
  });

  it('keeps tabs opened or closed while narrow when restoring the wide layout', () => {
    const f = fixture();
    try {
      const adaptive = new AdaptiveDock(f.api);
      adaptive.setNarrow(true);
      f.api.getPanel('moved-subtrees').api.close();
      f.add('alignment', { referencePanel: 'tree' });
      adaptive.reconcile();
      expect(Object.keys(adaptive.layout().panels).sort()).toEqual([
        'alignment',
        'inspector',
        'settings',
        'tree',
      ]);
      adaptive.setNarrow(false);
      expect(f.api.getPanel('alignment').group).toBe(f.api.getPanel('inspector').group);
      expect(f.api.getPanel('settings').group).not.toBe(f.api.getPanel('tree').group);
      expect(f.api.getPanel('moved-subtrees')).toBeUndefined();
    } finally {
      f.close();
    }
  });

  it('restores a saved wide layout loaded on a narrow screen', () => {
    const f = fixture();
    try {
      const saved = f.api.toJSON();
      f.api.layout(390, 600);
      const adaptive = new AdaptiveDock(f.api, saved);
      adaptive.setNarrow(true);
      expect(f.api.groups.length).toBe(1);
      expect(adaptive.layout().grid.width).toBe(1200);
      f.api.layout(1200, 600);
      adaptive.setNarrow(false);
      expect(Math.abs(f.api.getPanel('settings').group.api.width - 280)).toBeLessThan(3);
      expect(shape(f.api.toJSON().grid.root)).toEqual(shape(saved.grid.root));
    } finally {
      f.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/adaptiveDock.test.js`
Expected: FAIL, cannot resolve `adaptiveDock.js`.

- [ ] **Step 3: Port AdaptiveDock**

Copy Quirk's `src/components/adaptive-dock.js` into `src/components/dock/adaptiveDock.js`, reformat
to this repo's Prettier style, and make exactly these changes:

```js
// src/components/dock/adaptiveDock.js (changed lines only; the rest is Quirk's code verbatim)
import { SETTINGS_PANEL_ID, TREE_PANEL_ID } from './panelRegistry.js';

export class AdaptiveDock {
  constructor(
    api,
    wideLayout,
    { anchorId = TREE_PANEL_ID, pinnedIds = [TREE_PANEL_ID, SETTINGS_PANEL_ID] } = {}
  ) {
    this.api = api;
    this.wide = wideLayout === undefined ? undefined : structuredClone(wideLayout);
    this.narrow = false;
    this.changing = false;
    this.anchorId = anchorId;
    this.pinnedIds = new Set(pinnedIds);
  }
  // reconcile(): replace
  //   leaves.find(node => !node.data.views.some(id => id === 'circuit' || id === 'gates'))
  // with
  //   leaves.find((node) => !node.data.views.some((id) => this.pinnedIds.has(id)))
  // gather(): replace both this.api.getPanel('circuit') with this.api.getPanel(this.anchorId)
  // restore(): replace api.getPanel(activeLeaf?.data.activeView ?? 'circuit')
  //   with api.getPanel(activeLeaf?.data.activeView ?? this.anchorId)
}
```

Keep the class's doc comment, adjusted to say the anchor is the tree.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/vitest/domain/dock/adaptiveDock.test.js`
Expected: PASS (3 tests). If dockview throws in jsdom because an element has no size, keep the
explicit `api.layout(1200, 600)` call (it sizes the grid without layout) and stub only what the
error names on `HTMLElement.prototype` inside `beforeAll`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dock/adaptiveDock.js test/vitest/domain/dock/adaptiveDock.test.js
git commit -m "feat(dock): port AdaptiveDock for narrow screens"
```

---

### Task 4: Dock runtime (open, close, toggle, open-state hook)

**Files:**

- Create: `src/components/dock/dockRuntime.js`
- Test: `test/vitest/domain/dock/dockRuntime.test.js`

**Interfaces:**

- Consumes: `getPanelEntry` (Task 1), `placementFor` (Task 2).
- Produces:
  - `attachDockApi(api, {isNarrow: () => boolean}): () => void` (returns detach)
  - `getDockApi(): object | null`
  - `openPanel(id: string, options?: object): void`
  - `closePanel(id: string): void`
  - `togglePanel(id: string): void`
  - `subscribeDock(listener: () => void): () => void`
  - `isPanelOpen(id: string): boolean`
  - `useIsPanelOpen(id: string): boolean`

- [ ] **Step 1: Write the failing test**

```js
// test/vitest/domain/dock/dockRuntime.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachDockApi,
  closePanel,
  isPanelOpen,
  openPanel,
  subscribeDock,
  togglePanel,
} from '../../../../src/components/dock/dockRuntime.js';

function fakeDockApi() {
  const listeners = { add: [], remove: [] };
  const panels = [];
  const api = {
    width: 1200,
    height: 700,
    panels,
    getPanel: (id) => panels.find((panel) => panel.id === id),
    addPanel: vi.fn((options) => {
      const panel = {
        id: options.id,
        group: { api: { location: { type: options.floating ? 'floating' : 'grid' } } },
        api: { setActive: vi.fn(), close: vi.fn(() => api.remove(panel)) },
      };
      panels.push(panel);
      listeners.add.forEach((listener) => listener(panel));
      return panel;
    }),
    remove(panel) {
      panels.splice(panels.indexOf(panel), 1);
      listeners.remove.forEach((listener) => listener(panel));
    },
    onDidAddPanel: (listener) => {
      listeners.add.push(listener);
      return { dispose: () => {} };
    },
    onDidRemovePanel: (listener) => {
      listeners.remove.push(listener);
      return { dispose: () => {} };
    },
  };
  return api;
}

let detach = () => {};
afterEach(() => detach());

describe('dock runtime', () => {
  it('opens a panel at its registry placement with its title, and focuses it if open', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    openPanel('settings');
    expect(api.addPanel).toHaveBeenCalledWith({
      id: 'settings',
      component: 'settings',
      title: 'Settings',
      renderer: 'always',
      position: { referencePanel: 'tree', direction: 'left' },
      initialWidth: 280,
    });
    openPanel('settings');
    expect(api.addPanel).toHaveBeenCalledTimes(1);
    expect(api.getPanel('settings').api.setActive).toHaveBeenCalledTimes(1);
  });

  it('closes closeable panels but never the permanent tree', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    api.addPanel({ id: 'tree' });
    openPanel('alignment');
    closePanel('alignment');
    closePanel('tree');
    expect(isPanelOpen('alignment')).toBe(false);
    expect(isPanelOpen('tree')).toBe(true);
  });

  it('toggles a panel and notifies subscribers when panels come and go', () => {
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    const listener = vi.fn();
    const unsubscribe = subscribeDock(listener);
    togglePanel('settings');
    expect(isPanelOpen('settings')).toBe(true);
    togglePanel('settings');
    expect(isPanelOpen('settings')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('ignores calls before the dock exists and unknown panel ids', () => {
    expect(() => openPanel('settings')).not.toThrow();
    const api = fakeDockApi();
    detach = attachDockApi(api, { isNarrow: () => false });
    openPanel('not-a-panel');
    expect(api.addPanel).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/dockRuntime.test.js`
Expected: FAIL, cannot resolve `dockRuntime.js`.

- [ ] **Step 3: Write the runtime**

```js
// src/components/dock/dockRuntime.js
import { useSyncExternalStore } from 'react';
import { placementFor } from './dockLayout.js';
import { getPanelEntry } from './panelRegistry.js';

let dockApi = null;
let isNarrow = () => false;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

/** Called by <Dock /> once dockview is ready; returns a function that detaches it. */
export function attachDockApi(api, options = {}) {
  dockApi = api;
  isNarrow = options.isNarrow ?? (() => false);
  const added = api.onDidAddPanel(notify);
  const removed = api.onDidRemovePanel(notify);
  notify();
  return () => {
    added.dispose();
    removed.dispose();
    if (dockApi === api) {
      dockApi = null;
      isNarrow = () => false;
      notify();
    }
  };
}

export function getDockApi() {
  return dockApi;
}

export function isPanelOpen(id) {
  return Boolean(dockApi?.getPanel(id));
}

/** Shows a panel by id, or brings it to the front if it is already open. */
export function openPanel(id, options = {}) {
  const entry = getPanelEntry(id);
  if (!dockApi || !entry) return;
  const existing = dockApi.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return;
  }
  dockApi.addPanel({
    id,
    component: id,
    title: entry.title,
    ...(entry.alwaysRender ? { renderer: 'always' } : {}),
    ...placementFor(id, dockApi, { narrow: isNarrow() }),
    ...options,
  });
}

export function closePanel(id) {
  if (getPanelEntry(id)?.permanent) return;
  dockApi?.getPanel(id)?.api.close();
}

export function togglePanel(id) {
  if (isPanelOpen(id)) closePanel(id);
  else openPanel(id);
}

export function subscribeDock(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsPanelOpen(id) {
  return useSyncExternalStore(
    subscribeDock,
    () => isPanelOpen(id),
    () => false
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/vitest/domain/dock/dockRuntime.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dock/dockRuntime.js test/vitest/domain/dock/dockRuntime.test.js
git commit -m "feat(dock): add runtime to open, close and toggle panels"
```

---

### Task 5: Dock host, panel wrapper, theme, and Tree/Settings panels

**Files:**

- Create: `src/components/dock/PanelVisibility.js`
- Create: `src/components/dock/panelComponents.jsx`
- Create: `src/components/dock/panels/TreePanel.jsx`
- Create: `src/components/dock/panels/SettingsPanel.jsx`
- Create: `src/components/dock/dockStartup.js`
- Create: `src/components/dock/Dock.jsx`
- Create: `src/css/dock.css`
- Modify: `src/components/sidebar/ToolsSidebar.jsx`
- Test: `test/vitest/domain/dock/dockStartup.test.js`

**Interfaces:**

- Consumes: Tasks 1–4.
- Produces:
  - `PanelVisibility` (React context, default `true`), `usePanelVisibility(): boolean`
  - `PANEL_COMPONENTS: Record<PanelId, React.ComponentType>` (Tasks 6 adds the remaining bodies)
  - `restoreDockLayout(api, saved: object | undefined): void` (from `dockStartup.js`)
  - `<Dock />`
  - `ToolsSidebar` props become `{fileName, datasetProvenance, error}`.

- [ ] **Step 1: Write the failing startup test**

```js
// test/vitest/domain/dock/dockStartup.test.js
import { describe, expect, it, vi } from 'vitest';
import { restoreDockLayout } from '../../../../src/components/dock/dockStartup.js';

function fakeApi({ fromJSONThrows = false } = {}) {
  const panels = [];
  return {
    panels,
    width: 1200,
    height: 700,
    getPanel: (id) => panels.find((panel) => panel.id === id),
    fromJSON: vi.fn((layout) => {
      if (fromJSONThrows) throw new Error('unknown panel');
      for (const id of Object.keys(layout.panels)) {
        panels.push({ id, title: `old ${id}`, api: { setTitle: vi.fn(), setRenderer: vi.fn() } });
      }
    }),
    clear: vi.fn(() => panels.splice(0)),
    addPanel: vi.fn((options) => {
      panels.push({
        id: options.id,
        title: options.title,
        api: { setTitle: vi.fn(), setRenderer: vi.fn() },
      });
    }),
  };
}

describe('dock startup', () => {
  it('opens tree and settings on a first visit', () => {
    const api = fakeApi();
    restoreDockLayout(api, undefined);
    expect(api.panels.map((panel) => panel.id)).toEqual(['tree', 'settings']);
  });

  it('keeps settings closed when the saved layout closed it, but always re-adds the tree', () => {
    const api = fakeApi();
    restoreDockLayout(api, { grid: {}, panels: { alignment: {} } });
    expect(api.panels.map((panel) => panel.id).sort()).toEqual(['alignment', 'tree']);
  });

  it('falls back to the default layout when the saved one cannot be restored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = fakeApi({ fromJSONThrows: true });
    restoreDockLayout(api, { grid: {}, panels: { removed: {} } });
    expect(api.clear).toHaveBeenCalled();
    expect(api.panels.map((panel) => panel.id)).toEqual(['tree', 'settings']);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('shows current registry titles on restored tabs', () => {
    const api = fakeApi();
    restoreDockLayout(api, { grid: {}, panels: { tree: {}, inspector: {} } });
    expect(api.getPanel('inspector').api.setTitle).toHaveBeenCalledWith('Transition Inspector');
    expect(api.getPanel('tree').api.setRenderer).toHaveBeenCalledWith('always');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/dockStartup.test.js`
Expected: FAIL, cannot resolve `dockStartup.js`.

- [ ] **Step 3: Visibility context**

```js
// src/components/dock/PanelVisibility.js
import { createContext, useContext } from 'react';

/** Whether the dock panel around a component is on screen. Outside the dock: visible. */
export const PanelVisibility = createContext(true);

export function usePanelVisibility() {
  return useContext(PanelVisibility);
}
```

- [ ] **Step 4: Tree and Settings panel bodies**

```jsx
// src/components/dock/panels/TreePanel.jsx
import React from 'react';
import { DeckGLCanvas } from '../../deckgl/DeckGLCanvas.jsx';
import { TreeCanvasControls } from '../../deckgl/TreeCanvasControls.jsx';
import { VisualizationTreeRenderOverlay } from '../../../App.jsx';

export function TreePanel() {
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden" data-tree-canvas-area>
      <DeckGLCanvas />
      <TreeCanvasControls />
      <VisualizationTreeRenderOverlay />
    </div>
  );
}
```

Move `VisualizationTreeRenderOverlay` out of `App.jsx` into
`src/components/dock/panels/TreeRenderOverlay.jsx` (same code, named export
`VisualizationTreeRenderOverlay`) and import it from there in `TreePanel.jsx`, so the dock does not
import `App.jsx`. Update any test that imports it from `App.jsx`
(`grep -rn "VisualizationTreeRenderOverlay" test`).

```jsx
// src/components/dock/panels/SettingsPanel.jsx
import React from 'react';
import { ToolsSidebar } from '../../sidebar/ToolsSidebar.jsx';
import {
  selectDatasetProvenance,
  selectFileName,
  useAppStore,
} from '../../../state/phyloStore/store.js';

export function SettingsPanel() {
  const fileName = useAppStore(selectFileName) || 'Loading...';
  const datasetProvenance = useAppStore(selectDatasetProvenance);
  return <ToolsSidebar fileName={fileName} datasetProvenance={datasetProvenance} />;
}
```

- [ ] **Step 5: Make ToolsSidebar a static panel body**

In `src/components/sidebar/ToolsSidebar.jsx`:

1. Change the props to `{ fileName, datasetProvenance, error }` and delete `sprAnalyticsOpen`,
   `isSprAnalyticsActive`, `onOpenSprAnalytics`, `onCloseSprAnalytics`, `onFocusSprAnalytics`,
   `onOpenTaxaColoring`, `onPreloadTaxaColoring`.
2. Replace `<Sidebar id="app-sidebar" collapsible="icon" data-tour-id="workspace-sidebar">` with
   `<Sidebar id="app-sidebar" collapsible="none" className="h-full w-full" data-tour-id="workspace-sidebar">`
   and delete `<SidebarRail />` and its import.
3. Delete the trailing `{sprAnalyticsOpen ? (...AnalyticsDashboard...) : null}` block, the
   `AnalyticsDashboard` lazy import, and wrap the remaining `<Sidebar>` without the fragment.
4. Replace the Moved Subtrees button handler:

```jsx
<SidebarMenuItem>
  <SidebarMenuButton
    tooltip={SPR_ANALYTICS_COPY.openLabel}
    aria-label={SPR_ANALYTICS_COPY.openLabel}
    aria-pressed={movedSubtreesOpen}
    isActive={movedSubtreesOpen}
    onClick={() => openPanel('moved-subtrees')}
  >
    <Activity className="text-primary" />
    <span>{SPR_ANALYTICS_COPY.title}</span>
  </SidebarMenuButton>
</SidebarMenuItem>
```

with `const movedSubtreesOpen = useIsPanelOpen('moved-subtrees');` at the top of the component
and `import { openPanel, useIsPanelOpen } from '../dock/dockRuntime.js';`. 5. Pass `onOpenTaxaColoring={() => setTaxaColoringOpen(true)}` to `TaxaAndHighlightsSection`, with
`const setTaxaColoringOpen = useAppStore(selectSetTaxaColoringOpen);` (selector already exists
in `src/state/phyloStore/store.js`). Drop `onPreloadTaxaColoring`; if
`TaxaAndHighlightsSection` requires it, pass `undefined` and make the prop optional there.

- [ ] **Step 6: Panel component map**

```jsx
// src/components/dock/panelComponents.jsx
import React, { useEffect, useState } from 'react';
import { PanelVisibility } from './PanelVisibility.js';
import { TreePanel } from './panels/TreePanel.jsx';
import { SettingsPanel } from './panels/SettingsPanel.jsx';

function useDockVisibility(api) {
  const [visible, setVisible] = useState(() => api?.isVisible ?? true);
  useEffect(() => {
    if (!api) return undefined;
    setVisible(api.isVisible);
    const subscription = api.onDidVisibilityChange((event) => setVisible(event.isVisible));
    return () => subscription.dispose();
  }, [api]);
  return visible;
}

/** Wrap each body once so it keeps its state, scrolls on its own and knows if it is visible. */
function createPanelComponent(id, Component) {
  const Wrapped = ({ api }) => {
    const visible = useDockVisibility(api);
    return (
      <PanelVisibility.Provider value={visible}>
        <div className="dock-panel" data-panel-id={id}>
          <React.Suspense fallback={null}>
            <Component />
          </React.Suspense>
        </div>
      </PanelVisibility.Provider>
    );
  };
  Wrapped.displayName = `DockPanel(${id})`;
  return Wrapped;
}

const PANEL_BODIES = {
  tree: TreePanel,
  settings: SettingsPanel,
};

export const PANEL_COMPONENTS = Object.fromEntries(
  Object.entries(PANEL_BODIES).map(([id, Component]) => [id, createPanelComponent(id, Component)])
);
```

If `react-hooks/set-state-in-effect` warns on `setVisible(api.isVisible)`, remove that line: the
initial state already reads `api.isVisible`, and the subscription covers later changes.

- [ ] **Step 7: Theme CSS**

```css
/* src/css/dock.css — dockview theme from the shadcn tokens, in light and dark. */
.dockview-theme-phylo {
  --dv-paneview-active-outline-color: var(--ring);
  --dv-tabs-and-actions-container-font-size: 12px;
  --dv-tabs-and-actions-container-height: 32px;
  --dv-drag-over-background-color: color-mix(in oklch, var(--ring) 20%, transparent);
  --dv-drag-over-border-color: var(--ring);
  --dv-edge-dock-indicator-color: var(--ring);
  --dv-tabs-container-scrollbar-color: var(--border);
  --dv-icon-hover-background-color: var(--accent);
  --dv-floating-box-shadow: 0 8px 32px color-mix(in oklch, var(--foreground) 18%, transparent);
  --dv-floating-border: 1px solid var(--border);
  --dv-overlay-z-index: 999;
  --dv-tab-font-size: inherit;
  --dv-border-radius: 0px;
  --dv-tab-margin: 0;
  --dv-active-sash-transition-duration: 0.1s;
  --dv-active-sash-transition-delay: 0.5s;
  --dv-spacing-padding: 0px;
  --dv-tab-border-radius: 0px;
  --dv-sash-border-radius: 0px;
  --dv-dropdown-border-radius: 0px;
  --dv-tab-close-icon-size: inherit;
  --dv-floating-group-border: none;
  --dv-drag-over-border: none;
  --dv-floating-group-dragging-opacity: 0.5;
  --dv-floating-titlebar-height: 22px;
  --dv-floating-titlebar-background-color: var(--card);
  --dv-floating-titlebar-border-bottom: 1px solid var(--border);
  --dv-group-view-background-color: var(--card);
  --dv-tabs-and-actions-container-background-color: var(--background);
  --dv-activegroup-visiblepanel-tab-background-color: var(--card);
  --dv-activegroup-hiddenpanel-tab-background-color: var(--background);
  --dv-inactivegroup-visiblepanel-tab-background-color: var(--card);
  --dv-inactivegroup-hiddenpanel-tab-background-color: var(--background);
  --dv-activegroup-visiblepanel-tab-color: var(--foreground);
  --dv-activegroup-hiddenpanel-tab-color: var(--muted-foreground);
  --dv-inactivegroup-visiblepanel-tab-color: var(--muted-foreground);
  --dv-inactivegroup-hiddenpanel-tab-color: var(--muted-foreground);
  --dv-tab-divider-color: var(--border);
  --dv-separator-border: var(--border);
  --dv-paneview-header-border-color: var(--border);
  --dv-context-menu-background-color: var(--card);
  --dv-sash-color: var(--border);
  --dv-active-sash-color: var(--ring);
}

.app-dock {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}

.app-dock .dock-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 100%;
}

.app-dock .dock-tab-icon {
  flex: none;
  width: 14px;
  height: 14px;
  margin-left: 0.5rem;
}

.app-dock .dv-default-panel,
.app-dock .dock-panel {
  height: 100%;
}

.app-dock .dock-panel {
  min-width: 0;
  overflow: auto;
  container: dock-panel / inline-size;
}
```

- [ ] **Step 8: Startup (restore or default layout)**

```js
// src/components/dock/dockStartup.js
import { PANEL_REGISTRY, TREE_PANEL_ID, getPanelEntry } from './panelRegistry.js';

function addPanelFromRegistry(api, id) {
  const entry = getPanelEntry(id);
  api.addPanel({
    id,
    component: id,
    title: entry.title,
    ...(entry.alwaysRender ? { renderer: 'always' } : {}),
    ...(entry.place
      ? {
          position: { referencePanel: TREE_PANEL_ID, direction: entry.place.direction },
          initialWidth: entry.place.width,
        }
      : {}),
  });
}

/** Restore the saved arrangement, or build the default one; exported for tests. */
export function restoreDockLayout(api, saved) {
  let restored = false;
  if (saved !== undefined) {
    try {
      api.fromJSON(saved);
      restored = true;
    } catch (error) {
      console.warn('Could not restore the dock layout; starting from the default.', error);
      api.clear();
    }
  }
  for (const [id, entry] of Object.entries(PANEL_REGISTRY)) {
    if (api.getPanel(id)) continue;
    if (entry.permanent || (!restored && entry.defaultOpen)) addPanelFromRegistry(api, id);
  }
  for (const panel of api.panels) {
    const entry = getPanelEntry(panel.id);
    if (entry?.alwaysRender) panel.api.setRenderer('always');
    if (entry && panel.title !== entry.title) panel.api.setTitle(entry.title);
  }
}
```

- [ ] **Step 9: Dock host**

```jsx
// src/components/dock/Dock.jsx
import React, { useEffect, useRef } from 'react';
import { DockviewDefaultTab, DockviewReact } from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';
import '../../css/dock.css';
import { AdaptiveDock } from './adaptiveDock.js';
import { readSavedLayout, saveLayout, withoutFloatingPanels } from './dockLayout.js';
import { attachDockApi, togglePanel } from './dockRuntime.js';
import { PANEL_COMPONENTS } from './panelComponents.jsx';
import { SETTINGS_PANEL_ID, getPanelEntry } from './panelRegistry.js';
import { restoreDockLayout } from './dockStartup.js';

const NARROW_WIDTH = 920;
const DOCK_THEME = { name: 'phylo', className: 'dockview-theme-phylo' };

function storage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function DockTab(props) {
  const entry = getPanelEntry(props.api.id);
  const Icon = entry?.icon;
  return (
    <span className="dock-tab">
      {Icon ? <Icon className="dock-tab-icon" aria-hidden /> : null}
      <DockviewDefaultTab {...props} hideClose={entry?.permanent === true} />
    </span>
  );
}

export function Dock() {
  const hostRef = useRef(null);
  const cleanupRef = useRef(() => {});
  useEffect(() => () => cleanupRef.current(), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        togglePanel(SETTINGS_PANEL_ID);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onReady = ({ api }) => {
    const host = hostRef.current;
    if (host)
      api.layout(host.clientWidth <= NARROW_WIDTH ? 1200 : host.clientWidth, host.clientHeight);

    restoreDockLayout(api, readSavedLayout(storage()));

    const adaptive = new AdaptiveDock(api, withoutFloatingPanels(api.toJSON()));
    const detach = attachDockApi(api, { isNarrow: () => adaptive.narrow });

    const resize = () => {
      if (!host) return;
      const narrow = host.clientWidth <= NARROW_WIDTH;
      if (narrow) adaptive.setNarrow(true);
      api.layout(host.clientWidth, host.clientHeight);
      if (!narrow) adaptive.setNarrow(false);
    };
    resize();

    const layoutSubscription = api.onDidLayoutChange(() => {
      if (adaptive.changing || (!adaptive.narrow && api.width <= NARROW_WIDTH)) return;
      if (adaptive.narrow) {
        adaptive.reconcile();
        if (api.groups.filter((group) => group.api.location.type === 'grid').length > 1) {
          adaptive.gather();
        }
      }
      saveLayout(storage(), adaptive.layout());
    });
    const observer = new ResizeObserver(resize);
    if (host) observer.observe(host);

    cleanupRef.current = () => {
      observer.disconnect();
      layoutSubscription.dispose();
      detach();
    };
  };

  return (
    <main className="app-dock" aria-label="Phylo-Movies workspace" ref={hostRef}>
      <DockviewReact
        theme={DOCK_THEME}
        floatingGroupBounds="boundedWithinViewport"
        components={PANEL_COMPONENTS}
        defaultTabComponent={DockTab}
        onReady={onReady}
      />
    </main>
  );
}
```

- [ ] **Step 10: Run tests and lint**

Run: `npx vitest run test/vitest/domain/dock`
Expected: PASS (all dock tests, including the 4 startup tests).
Run: `npx eslint src/components/dock src/components/sidebar/ToolsSidebar.jsx test/vitest/domain/dock --max-warnings=0`
Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add src/components/dock src/css/dock.css src/components/sidebar/ToolsSidebar.jsx test/vitest/domain/dock
git commit -m "feat(dock): add dock host, theme, and tree and settings panels"
```

(The app does not use `<Dock />` yet; Task 7 switches it on.)

---

### Task 6: Inspector, Moved Subtrees, Alignment and Taxa colouring as panel bodies

**Files:**

- Modify: `src/components/TransitionInspectorPanel.jsx`
- Modify: `src/components/TreeStatsPanel/AnalyticsDashboard.tsx`, `AnalyticsDashboard.contract.ts`
- Rename + modify: `src/components/msa/MsaRndWindow.jsx` → `src/components/msa/MsaPanel.jsx`
- Rename + modify: `src/components/taxa-coloring/TaxaColoringRndWindow.jsx` → `src/components/taxa-coloring/TaxaColoringPanel.jsx`
- Modify: `src/components/dock/panelComponents.jsx`
- Test: `test/vitest/integration/contracts/dockPanelBodiesStatic.test.js`

**Interfaces:**

- Consumes: `PANEL_COMPONENTS`, `createPanelComponent` (Task 5).
- Produces: `TransitionInspectorPanel` (fills its panel; empty state), `MovedSubtreesPanel`
  (named export from `AnalyticsDashboard.tsx`), default exports `MsaPanel` and
  `TaxaColoringPanel`. `PANEL_COMPONENTS` gains `inspector`, `moved-subtrees`, `alignment`,
  `taxa-coloring`.

- [ ] **Step 1: Write the failing static contract test**

```js
// test/vitest/integration/contracts/dockPanelBodiesStatic.test.js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

describe('dock panel bodies', () => {
  it('drops floating-window chrome from every view', () => {
    for (const file of [
      ['src', 'components', 'msa', 'MsaPanel.jsx'],
      ['src', 'components', 'taxa-coloring', 'TaxaColoringPanel.jsx'],
      ['src', 'components', 'TreeStatsPanel', 'AnalyticsDashboard.tsx'],
    ]) {
      const source = read(...file);
      expect(source).not.toContain('react-rnd');
      expect(source).not.toContain('createPortal');
      expect(source).not.toContain('floatingWindowGeometry');
    }
    expect(existsSync(join(root, 'src', 'components', 'msa', 'MsaRndWindow.jsx'))).toBe(false);
    expect(
      existsSync(join(root, 'src', 'components', 'taxa-coloring', 'TaxaColoringRndWindow.jsx'))
    ).toBe(false);
  });

  it('registers every registry panel with a dock component', () => {
    const components = read('src', 'components', 'dock', 'panelComponents.jsx');
    for (const id of [
      'tree',
      'settings',
      'inspector',
      'moved-subtrees',
      'alignment',
      'taxa-coloring',
    ]) {
      expect(components).toContain(`'${id}'`);
    }
  });

  it('gives the inspector an empty state instead of rendering nothing', () => {
    const inspector = read('src', 'components', 'TransitionInspectorPanel.jsx');
    expect(inspector).toContain('Select a timeline segment');
    expect(inspector).not.toContain('if (!segment) return null;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/integration/contracts/dockPanelBodiesStatic.test.js`
Expected: FAIL (files not renamed yet).

- [ ] **Step 3: Transition Inspector fills its panel**

In `src/components/TransitionInspectorPanel.jsx`:

1. Replace `if (!segment) return null;` with:

```jsx
if (!segment) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
      Select a timeline segment to inspect its transition.
    </div>
  );
}
```

2. Replace the `<aside className="z-[70] flex w-[22rem] shrink-0 flex-col overflow-hidden border-l border-border bg-card text-card-foreground max-md:absolute max-md:inset-x-3 max-md:bottom-3 max-md:max-h-[50%] max-md:w-auto max-md:rounded-lg max-md:border max-md:shadow-xl"`
   attribute with `className="flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground"`.
3. Delete the panel's own header `h2` "Transition Inspector" title and the close `Button` (the dock
   tab carries the title and the close control); keep the badge and "Segment N of M" line.

- [ ] **Step 4: Moved Subtrees body**

In `src/components/TreeStatsPanel/AnalyticsDashboard.tsx`:

1. Delete the `AnalyticsDashboard` component (the `Rnd`/`createPortal` window, its window-rect
   state, `fitAnalyticsWindowRect`, `getInitialWindowRect`) and the imports it alone used:
   `createPortal`, `Rnd`, `X`, `fitFloatingWindowRect` and the other `floatingWindowGeometry`
   imports, `FLOATING_WINDOW_SURFACE_CLASS`, `getFloatingWindowLayerClass`, `ANALYTICS_WINDOW_BOUNDS`.
2. Rename `const AnalyticsDashboardBody = () => {` to `export const MovedSubtreesPanel = () => {` and
   add `export default MovedSubtreesPanel;` at the end of the file.
3. In `AnalyticsDashboard.contract.ts`, delete `ANALYTICS_WINDOW_BOUNDS`.

- [ ] **Step 5: Alignment body**

```bash
git mv src/components/msa/MsaRndWindow.jsx src/components/msa/MsaPanel.jsx
```

Replace the file's body below the imports with:

```jsx
// src/components/msa/MsaPanel.jsx
import React from 'react';
import { useMSA } from './useMSA.js';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';
import { MSAProvider } from './MSAContext.jsx';

function AlignmentSummary() {
  const { processedData } = useMSA();
  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';
  return (
    <p
      id="msa-window-description"
      className="shrink-0 truncate border-b border-border px-2 py-1 text-2xs text-muted-foreground"
    >
      {summary}
    </p>
  );
}

export default function MsaPanel() {
  return (
    <MSAProvider>
      <div
        className="flex h-full flex-col overflow-hidden bg-card"
        role="region"
        aria-label="Sequence alignment"
        aria-describedby="msa-window-description"
      >
        <AlignmentSummary />
        <MSAControls />
        <MSAViewer />
      </div>
    </MSAProvider>
  );
}
```

Delete `src/components/msa/msaWindowPlacement.js` and
`test/vitest/domain/msa/msaWindowPlacement.test.js` (`git rm`).

- [ ] **Step 6: Taxa colouring body**

```bash
git mv src/components/taxa-coloring/TaxaColoringRndWindow.jsx src/components/taxa-coloring/TaxaColoringPanel.jsx
```

In the renamed file:

1. Rename `export function TaxaColoringRndWindow({ isActive = false, onFocus } = {})` to
   `export function TaxaColoringPanel()` and the default export to `TaxaColoringPanel`.
2. Delete `windowState`, `setWindowState`, `fittedWindow`, `fitTaxaColoringWindowRect`,
   `onDragStop`, `onResizeStop`, `handleClose`, and the `isOpen` early return (keep the
   `!taxaNames.length` return, rendering `<p className="p-4 text-xs text-muted-foreground">No taxa
loaded.</p>` instead of `null`).
3. Replace the returned `<Rnd …>…</Rnd>` with only its inner content, without the drag-handle
   header (the dock tab carries the title):

```jsx
return (
  <div className="h-full min-h-0 overflow-hidden bg-background/50">
    <TaxaColoringWindow
      taxaNames={taxaNames}
      originalColorMap={baselineColorMap}
      onApply={handleApply}
      initialState={initialState}
      metadataSources={metadataSources}
    />
  </div>
);
```

4. Delete the now-unused imports (`Rnd`, `Palette`, `X`, `AppTooltip`, `Button`, `cn`, the
   `floatingWindowGeometry` and `floating-window-layer` imports, `selectTaxaColoringOpen`,
   `selectSetTaxaColoringOpen`, `selectTaxaColoringWindow`, `selectSetTaxaColoringWindow`).

- [ ] **Step 7: Register the bodies**

In `src/components/dock/panelComponents.jsx` replace `PANEL_BODIES` with:

```jsx
const InspectorBody = React.lazy(() =>
  import('../TransitionInspectorPanel.jsx').then((module) => ({
    default: module.TransitionInspectorPanel,
  }))
);
const MovedSubtreesBody = React.lazy(() => import('../TreeStatsPanel/AnalyticsDashboard.tsx'));
const AlignmentBody = React.lazy(() => import('../msa/MsaPanel.jsx'));
const TaxaColoringBody = React.lazy(() => import('../taxa-coloring/TaxaColoringPanel.jsx'));

const PANEL_BODIES = {
  tree: TreePanel,
  settings: SettingsPanel,
  inspector: InspectorBody,
  'moved-subtrees': MovedSubtreesBody,
  alignment: AlignmentBody,
  'taxa-coloring': TaxaColoringBody,
};
```

- [ ] **Step 8: Run tests and lint**

Run: `npx vitest run test/vitest/integration/contracts/dockPanelBodiesStatic.test.js test/vitest/integration/msa test/vitest/domain/msa test/vitest/domain/taxa`
Expected: PASS. Fix any test still importing `MsaRndWindow`, `TaxaColoringRndWindow`, or
`AnalyticsDashboard` by name (`grep -rn "MsaRndWindow\|TaxaColoringRndWindow\|AnalyticsDashboard\b" test`):
point them at `MsaPanel`, `TaxaColoringPanel`, `MovedSubtreesPanel`.
Run: `npx eslint src/components test/vitest --max-warnings=0`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add -A src/components test/vitest
git commit -m "refactor(dock): turn inspector, moved subtrees, alignment and taxa colouring into panel bodies"
```

---

### Task 7: Wire the shell, store sync, player bar toggle, tour; remove the old window system

**Files:**

- Create: `src/components/dock/dockPanelSync.js`
- Modify: `src/App.jsx`
- Modify: `src/components/movie-player/MoviePlayerBar.jsx`
- Modify: `src/features/tours/workspaceTour.js`
- Modify: `src/state/phyloStore/slices/msa/msaSync.slice.js`,
  `src/state/phyloStore/slices/coloring/taxonomyColoringPanel.slice.js`, `src/types/store.ts`,
  `src/state/phyloStore/store.js` (re-exports)
- Delete: `src/components/ui/floatingWindowGeometry.js`, `src/components/ui/floating-window-layer.js`,
  `src/state/phyloStore/selectors/selectMsaWindow.js`, `selectSetMsaWindow.js`,
  `selectTaxaColoringWindow.js`, `selectSetTaxaColoringWindow.js`,
  `test/vitest/domain/ui/FloatingWindowGeometry.test.js`
- Modify: `package.json` (remove `react-rnd`)
- Test: `test/vitest/domain/dock/dockPanelSync.test.js`

**Interfaces:**

- Consumes: `openPanel`, `closePanel`, `getDockApi`, `subscribeDock` (Task 4); `<Dock />` (Task 5).
- Produces: `PANEL_STORE_BINDINGS`, `syncPanelsFromStore(state, previous, actions)`,
  `syncStoreFromClosedPanel(panelId, state)`, `useDockPanelSync()`.

- [ ] **Step 1: Write the failing sync test**

```js
// test/vitest/domain/dock/dockPanelSync.test.js
import { describe, expect, it, vi } from 'vitest';
import {
  syncPanelsFromStore,
  syncStoreFromClosedPanel,
} from '../../../../src/components/dock/dockPanelSync.js';

const closed = {
  isMsaViewerOpen: false,
  taxaColoringOpen: false,
  selectedTimelineSegmentIndex: null,
};

describe('dock and store stay in step', () => {
  it('opens and closes panels when the store flags change', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    syncPanelsFromStore({ ...closed, isMsaViewerOpen: true }, closed, actions);
    expect(actions.openPanel).toHaveBeenCalledWith('alignment');
    syncPanelsFromStore(closed, { ...closed, selectedTimelineSegmentIndex: 4 }, actions);
    expect(actions.closePanel).toHaveBeenCalledWith('inspector');
  });

  it('reopens the inspector when a segment is selected again, not on every segment change', () => {
    const actions = { openPanel: vi.fn(), closePanel: vi.fn() };
    syncPanelsFromStore({ ...closed, selectedTimelineSegmentIndex: 0 }, closed, actions);
    syncPanelsFromStore(
      { ...closed, selectedTimelineSegmentIndex: 7 },
      { ...closed, selectedTimelineSegmentIndex: 0 },
      actions
    );
    expect(actions.openPanel).toHaveBeenCalledTimes(1);
    expect(actions.openPanel).toHaveBeenCalledWith('inspector');
  });

  it('clears the matching store flag when the user closes a panel tab', () => {
    const state = {
      ...closed,
      selectedTimelineSegmentIndex: 3,
      taxaColoringOpen: true,
      isMsaViewerOpen: true,
      setSelectedTimelineSegment: vi.fn(),
      setTaxaColoringOpen: vi.fn(),
      closeMsaViewer: vi.fn(),
    };
    syncStoreFromClosedPanel('inspector', state);
    syncStoreFromClosedPanel('taxa-coloring', state);
    syncStoreFromClosedPanel('alignment', state);
    syncStoreFromClosedPanel('settings', state);
    expect(state.setSelectedTimelineSegment).toHaveBeenCalledWith(null);
    expect(state.setTaxaColoringOpen).toHaveBeenCalledWith(false);
    expect(state.closeMsaViewer).toHaveBeenCalledTimes(1);
  });

  it('does not write the store when the flag is already clear', () => {
    const state = { ...closed, closeMsaViewer: vi.fn() };
    syncStoreFromClosedPanel('alignment', state);
    expect(state.closeMsaViewer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/vitest/domain/dock/dockPanelSync.test.js`
Expected: FAIL, cannot resolve `dockPanelSync.js`.

- [ ] **Step 3: Write the sync module**

```js
// src/components/dock/dockPanelSync.js
import { useEffect } from 'react';
import { useAppStore } from '../../state/phyloStore/store.js';
import { closePanel, getDockApi, openPanel, subscribeDock } from './dockRuntime.js';

/** Store flags other code already reads, mirrored onto dock panels. */
export const PANEL_STORE_BINDINGS = Object.freeze([
  {
    panelId: 'alignment',
    isOpen: (state) => state.isMsaViewerOpen === true,
    clear: (state) => state.closeMsaViewer(),
  },
  {
    panelId: 'taxa-coloring',
    isOpen: (state) => state.taxaColoringOpen === true,
    clear: (state) => state.setTaxaColoringOpen(false),
  },
  {
    panelId: 'inspector',
    isOpen: (state) =>
      state.selectedTimelineSegmentIndex !== null &&
      state.selectedTimelineSegmentIndex !== undefined,
    clear: (state) => state.setSelectedTimelineSegment(null),
  },
]);

export function syncPanelsFromStore(state, previous, actions) {
  for (const binding of PANEL_STORE_BINDINGS) {
    const now = binding.isOpen(state);
    if (now === binding.isOpen(previous)) continue;
    if (now) actions.openPanel(binding.panelId);
    else actions.closePanel(binding.panelId);
  }
}

export function syncStoreFromClosedPanel(panelId, state) {
  const binding = PANEL_STORE_BINDINGS.find((candidate) => candidate.panelId === panelId);
  if (binding && binding.isOpen(state)) binding.clear(state);
}

/** Mount once inside the visualization shell, below <Dock />. */
export function useDockPanelSync() {
  useEffect(() => {
    let removal = null;
    const bindDock = () => {
      removal?.dispose();
      removal = null;
      const api = getDockApi();
      if (!api) return;
      removal = api.onDidRemovePanel((panel) =>
        syncStoreFromClosedPanel(panel.id, useAppStore.getState())
      );
      // Flags already set before the dock existed (e.g. MSA opened from the sidebar early).
      const state = useAppStore.getState();
      for (const binding of PANEL_STORE_BINDINGS) {
        if (binding.isOpen(state) && !api.getPanel(binding.panelId)) openPanel(binding.panelId);
      }
    };
    bindDock();
    const unsubscribeDock = subscribeDock(() => {
      if (removal === null && getDockApi()) bindDock();
    });
    const unsubscribeStore = useAppStore.subscribe((state, previous) =>
      syncPanelsFromStore(state, previous, { openPanel, closePanel })
    );
    return () => {
      removal?.dispose();
      unsubscribeDock();
      unsubscribeStore();
    };
  }, []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/vitest/domain/dock/dockPanelSync.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewire App.jsx**

Replace the `App` component's open/focus state and returned tree. Remove the imports of
`ToolsSidebar`, `DeckGLCanvas`, `TreeCanvasControls`, `TransitionInspectorPanel`, `SidebarInset`,
`selectIsMsaViewerOpen`, `selectTaxaColoringOpen`, `selectSetTaxaColoringOpen`,
`selectFileName`, `selectDatasetProvenance`; the `MsaRndWindow` and `TaxaColoringRndWindow` lazy
imports; and `sprAnalyticsOpen`, `activeFloatingWindow` and every focus/open/close callback. Keep
the bootstrap effect and `VisualizationBootstrapState`. The ready branch becomes:

```jsx
  return (
    <TooltipProvider>
      {/* Context for the settings panel's shadcn menu primitives; the dock owns visibility. */}
      <SidebarProvider open onOpenChange={() => {}} className="min-h-0 flex-col">
        <VisualizationShell />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function VisualizationShell() {
  useDockPanelSync();
  return (
    <div className="flex h-svh min-h-0 w-full flex-col overflow-hidden">
      <Dock />
      <MoviePlayerBar />
      <NodeContextMenu />
      <Toaster />
    </div>
  );
}
```

with `import { Dock } from './components/dock/Dock.jsx';` and
`import { useDockPanelSync } from './components/dock/dockPanelSync.js';`. Delete the
`VisualizationTreeRenderOverlay` function from `App.jsx` (moved in Task 5) and re-export it for
existing importers: `export { VisualizationTreeRenderOverlay } from './components/dock/panels/TreeRenderOverlay.jsx';`
— then remove that re-export once `grep -rn "VisualizationTreeRenderOverlay" src test` shows no
importer of `App.jsx` for it.

- [ ] **Step 6: Player bar ☰ toggles Settings**

In `src/components/movie-player/MoviePlayerBar.jsx` replace

```jsx
const { open, toggleSidebar } = useSidebar();
```

and `handleNavigationToggle` with

```jsx
const settingsOpen = useIsPanelOpen(SETTINGS_PANEL_ID);
const handleNavigationToggle = useCallback(() => togglePanel(SETTINGS_PANEL_ID), []);
```

change the button's `aria-label`/tooltip to "Toggle settings (Ctrl/⌘+B)",
`aria-expanded={settingsOpen ? 'true' : 'false'}`, delete `aria-controls="app-sidebar"`, and
replace the `useSidebar` import with
`import { togglePanel, useIsPanelOpen } from '../dock/dockRuntime.js';` and
`import { SETTINGS_PANEL_ID } from '../dock/panelRegistry.js';`.
Update `test/vitest/integration/timeline/timelinePlayerBarStatic.test.js` if it asserts on
`useSidebar` or `aria-controls="app-sidebar"` (`grep -n "useSidebar\|app-sidebar" test -r`).

- [ ] **Step 7: Tour opens Settings first**

In `src/features/tours/workspaceTour.js`, at the start of `startWorkspaceTour()` after the
`document` guard, add:

```js
// The settings step points into the Settings panel; make sure it is open.
openPanel(SETTINGS_PANEL_ID);
```

with `import { openPanel } from '../../components/dock/dockRuntime.js';` and
`import { SETTINGS_PANEL_ID } from '../../components/dock/panelRegistry.js';`.
Run `npm run check:architecture`; if a rule forbids `features → components`, move the two imports
behind a `startWorkspaceTour({ beforeStart })` option and pass
`() => openPanel(SETTINGS_PANEL_ID)` from `TourLauncher.jsx` instead.

- [ ] **Step 8: Remove window-rect state and dead files**

1. `msaSync.slice.js`: delete `msaWindow` and `setMsaWindow`.
2. `taxonomyColoringPanel.slice.js`: delete `taxaColoringWindow` and `setTaxaColoringWindow`.
3. `src/types/store.ts`: delete `msaWindow`, `taxaColoringWindow`, their setters, and
   `FloatingWindowRect` if nothing else uses it.
4. `git rm` the four selector files and remove their re-exports from
   `src/state/phyloStore/store.js` / `selectors/treeSelectors.js`.
5. `git rm src/components/ui/floatingWindowGeometry.js src/components/ui/floating-window-layer.js test/vitest/domain/ui/FloatingWindowGeometry.test.js`.
6. `npm uninstall react-rnd`.
7. Update `test/vitest/integration/state/phyloStoreNormalization.test.js` and
   `test/vitest/domain/taxa/taxaColoringBehavior.test.js` where they reference the removed fields
   (`grep -n "msaWindow\b\|taxaColoringWindow\|MsaRndWindow\|TaxaColoringRndWindow" test -r`).

- [ ] **Step 9: Run the whole suite**

Run: `npx vitest run && npm run test:mocha && npm run test:structure && npm run typecheck && npm run check:architecture && npx knip`
Expected: only the two existing demo-payload data tests fail; knip reports nothing under
`src/components/dock`, `src/components/msa`, `src/components/taxa-coloring`.
Run: `npm run lint:strict && npx prettier --check src test`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add -A src test package.json package-lock.json
git commit -m "feat(dock): switch the visualization window to the dockview workbench"
```

---

### Task 8: Docs and browser verification

**Files:**

- Modify: `docs/web-interface.md`, `manual/docs/web-interface.md`,
  `manual/docs/feature-reference/workspace-controls.md`

- [ ] **Step 1: Update the docs**

In each file, replace descriptions of the fixed sidebar and floating windows with the workbench:
the tree is centre and cannot be closed; Settings, Transition Inspector, Moved Subtrees and
Alignment are tabs that can be closed, dragged, split and resized; Taxa colouring opens as a
floating window; ☰ or Ctrl/⌘+B toggles Settings; the arrangement is remembered in the browser;
below 920px all views share one tab group. Run
`npx markdownlint docs/web-interface.md manual/docs/web-interface.md manual/docs/feature-reference/workspace-controls.md`
and `npx prettier --check` on the same files.

- [ ] **Step 2: Browser check**

Start the app (`npm run dev -- --port 5174`; backend not required), open `/demo`, open the
"IQ-TREE Bootstrap Trees (24 taxa)" example, then the "Quick MSA Demo" example. At 1440×900,
1024×768 and 375×812 confirm:

1. First visit (clear `localStorage` key `phylo-movies.dock-layout`): tree centre, Settings left.
2. ☰ and Ctrl/⌘+B close and reopen Settings; the tree refits into the freed width.
3. Selecting a timeline segment opens the Inspector on the right; closing its tab clears the
   selection; selecting again reopens it.
4. Moved Subtrees opens as a tab beside the Inspector; Alignment opens below the tree and follows
   the timeline (window range visible).
5. Taxa colouring opens floating inside the dock and closes with its tab.
6. Dragging the Alignment tab beside the tree creates a split; reload keeps it; Settings closed
   before reload stays closed.
7. Below 920px all docked views share one tab group and the wide arrangement returns when widened.
8. Playback, keyboard shortcuts and the tree canvas keep working; the canvas is never blank after
   tab switches.

- [ ] **Step 3: Full validation and commit**

Run: `npm run validate:frontend`
Expected: only the two existing demo-payload data tests fail.

```bash
git add docs/web-interface.md manual/docs/web-interface.md manual/docs/feature-reference/workspace-controls.md
git commit -m "docs: describe the dockview workbench"
```
