# Dockview workbench for the visualization window

Date: 2026-10-04
Status: draft for review

## Goal

Replace the visualization window's hand-built window system (a fixed shadcn sidebar, three
floating `react-rnd` windows, and a hand-docked Transition Inspector) with a VS Code-style
docking workbench, using the same framework and patterns as our Quirk app
(`EnesSakalliUniWien/Quirk`, `src/components/dock.jsx`).

Success means:

- Nothing floats over the tree unless the user floats it on purpose.
- Every view, the settings sidebar included, is a tab the user can close, reopen, drag, split,
  and resize, and the arrangement is remembered between visits.
- Adding a new view later is one registry entry, not shell changes.
- It stays "easily doable": we port Quirk's working code instead of designing a new system.

## What the user asked for (vs. assumptions)

Asked for:

- The same window system as VS Code, as Quirk already implements it.
- The sidebar must be closeable too.
- Easily doable.

Assumed (open to correction in review):

- The movie player bar and timeline stay a fixed strip below the dock, like Quirk's transport
  strip, not a dock panel. It is the app's main control and must never be closed or covered.
- The tree is the one permanent panel: it cannot be closed (closing it would leave nothing to
  animate), but it can be moved and split like any other tab.
- Taxa colouring opens floating (a short task, like Quirk's gate-parameter dialog); everything
  else docks.
- Applies to the web app and the Electron app alike (same React tree).

## Framework

`dockview-react` 8.2 (the version Quirk uses; zero dependencies, MIT). It provides tab groups,
grid splits, drag-and-drop docking, floating groups, and layout serialization. Its split view is
modelled on VS Code's workbench.

## Shell

```text
┌──────────────────────── Dock (dockview) ────────────────────────┐
│ [Settings] │        [Tree] (permanent)         │ [Inspector]     │
│  tab group │                                    │ [Moved Subtrees]│
│            ├────────────────────────────────────┤                 │
│            │ [Alignment]                        │                 │
└────────────┴────────────────────────────────────┴─────────────────┘
┌──────────── Movie player bar + timeline (fixed strip) ───────────┐
└──────────────────────────────────────────────────────────────────┘
```

`App.jsx` renders `<Dock />` (fills the work area) and `<MoviePlayerBar />` below it. The
shadcn `SidebarProvider`/`SidebarInset` shell is removed from the visualization page.

## Panel registry

One map, `src/components/dock/panels.jsx`, ported from Quirk's `panels.jsx`:

| id               | Title                | Icon                | Content                                              | Kind                       | Default place                      |
| ---------------- | -------------------- | ------------------- | ---------------------------------------------------- | -------------------------- | ---------------------------------- |
| `tree`           | Tree                 | `Network`           | `DeckGLCanvas`, `TreeCanvasControls`, render overlay | permanent, always rendered | centre                             |
| `settings`       | Settings             | `SlidersHorizontal` | current `ToolsSidebar` body (all groups)             | closeable, always rendered | left, 280px                        |
| `inspector`      | Transition Inspector | `ArrowRightLeft`    | `TransitionInspectorPanel` body                      | closeable                  | right, 340px                       |
| `moved-subtrees` | Moved Subtrees       | `GitBranch`         | `AnalyticsDashboard` body                            | closeable                  | right group (tab beside Inspector) |
| `alignment`      | Alignment            | `Dna`               | MSA viewer (`MSAControls` + `MSAViewer`)             | closeable                  | below the tree, 40% height         |
| `taxa-coloring`  | Taxa colouring       | `Palette`           | taxa colouring body                                  | closeable, floating        | floating 720×560, centred          |

Each entry: `{title, icon, component, permanent?, alwaysRender?, place?, floating?}`. Every
component is wrapped once (Quirk's `createPanelComponent`) in a scrolling container with
`data-panel-id` and a visibility context, so hidden panels can pause expensive work.

`alwaysRender` uses dockview's `renderer: "always"`: the tree's deck.gl canvas and the settings
form are never unmounted when another tab is in front (no lost WebGL context, no lost form state).

## Opening and closing

`src/components/dock/dock.jsx` exports `openPanel(id, options?)`, `closePanel(id)` and
`togglePanel(id)`, ported from Quirk:

- `openPanel` focuses the panel if it is open; otherwise adds it at its registry `place`,
  never as a tab on top of the tree.
- `closePanel` refuses permanent panels; their tabs show no close button.
- The dock API is kept in the zustand store (`dockApi`), like Quirk's `appStore.dock`.

Existing entry points call these instead of setting open flags:

| Today                                                            | After                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Player bar "Toggle sidebar" (☰) and the sidebar rail            | `togglePanel('settings')`; also Ctrl/⌘+B                        |
| Sidebar "Open Alignment", player bar DNA button, `openMsaViewer` | `openPanel('alignment')`                                        |
| Sidebar "Moved Subtrees"                                         | `openPanel('moved-subtrees')`                                   |
| "Taxa colouring" buttons                                         | `openPanel('taxa-coloring')`                                    |
| Selecting a timeline segment                                     | `openPanel('inspector')` (closing the tab clears the selection) |

Store flags that other code reads (`isMsaViewerOpen`, `taxaColoringOpen`, selected segment) are
kept in sync from dockview's `onDidAddPanel` / `onDidRemovePanel` events, so MSA sync and other
readers keep working unchanged.

## Layout memory and narrow screens

- Saved to `localStorage` key `phylo-movies.dock-layout` on every layout change; floating panels
  are not saved (Quirk's `withoutFloatingPanels`).
- On load: restore the saved layout; if it fails (panels renamed or removed), warn in the console
  and fall back to the default; re-add the permanent tree if missing; refresh tab titles from the
  registry.
- Below 920px, Quirk's `AdaptiveDock` gathers all docked panels into one tab group and restores
  the wide arrangement when there is room again. This replaces the shadcn mobile sheet and the
  MSA bottom-sheet logic.

## Theming

A `dockview-theme-phylo` class whose `--dv-*` variables are mapped from our existing shadcn tokens
(`--background`, `--card`, `--border`, `--ring`, `--muted-foreground`, …) in CSS, light and dark,
following Quirk's `browser/theme/dock.js`. Tabs show the registry icon before the title.

## Removed

- `react-rnd` dependency.
- `MsaRndWindow` surface, `msaWindowPlacement.js`, the `msaWindow` store field, and their tests.
- `TaxaColoringRndWindow` and `AnalyticsDashboard` window chrome (`Rnd`, portal, geometry state).
- `floatingWindowGeometry.js`, `floating-window-layer.js` and their tests.
- `activeFloatingWindow` and the focus/open callbacks in `App.jsx`.
- The Inspector's absolute/flex docking in `App.jsx` and `data-tree-canvas-area`.
- The shadcn `SidebarProvider` shell on the visualization page (the sidebar's sections and
  controls are kept as the Settings panel body).

## Kept unchanged

- All view contents (settings sections, MSA viewer, analytics, inspector, taxa colouring).
- The movie player bar, timeline, keyboard shortcuts, and pinned-tree control.
- Camera behaviour: the tree refits when its panel resizes (existing resize handling; manual Fit
  keeps refitting).
- Workspace tour anchors (`data-tour-id`); a tour step whose anchor is in a closed panel opens
  that panel first.

## Error handling

- Corrupt or outdated saved layout: discard, warn once in the console, use the default layout.
- `localStorage` unavailable: run with the default layout and do not save.
- A panel whose data is missing (for example Alignment without an MSA) shows its existing empty
  state rather than refusing to open.

## Testing

- Unit (vitest): registry shape (unique ids, permanent tree), `withoutFloatingPanels`,
  default-placement logic, saved-layout restore fallback, store sync from add/remove events,
  `AdaptiveDock` (port Quirk's `adaptive-dock.test.js`).
- Static/contract tests updated for removed files and new entry points.
- Browser check at 1440, 1024 and 375: default layout, close and reopen Settings (button and
  Ctrl/⌘+B), open each view, drag a tab into a split, reload to confirm the layout is remembered,
  narrow-screen gathering, tree still animates and refits.
- `npm run validate:frontend` passes (apart from the existing demo-payload data tests).

## Out of scope

- Moving the movie player bar or timeline into the dock.
- Pop-out windows (separate browser or Electron windows).
- An activity bar; the Settings panel keeps its current grouped sections.
- New content in any view.

## Estimate

About 2–3 days, mostly porting `dock.jsx`, `adaptive-dock.js`, the registry, and the theme from
Quirk, then rewiring the entry points listed above.
