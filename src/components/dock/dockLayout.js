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
