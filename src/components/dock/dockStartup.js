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
  if (!restored) api.getPanel(TREE_PANEL_ID)?.api.setActive();
  for (const panel of api.panels) {
    const entry = getPanelEntry(panel.id);
    if (entry?.alwaysRender) panel.api.setRenderer('always');
    if (entry && panel.title !== entry.title) panel.api.setTitle(entry.title);
  }
}
