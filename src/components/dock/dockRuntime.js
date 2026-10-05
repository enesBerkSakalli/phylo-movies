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
