import { useEffect } from 'react';
import { useAppStore } from '../../state/phyloStore/store.js';
import { closePanel, getDockApi, openPanel, subscribeDock } from './dockRuntime.js';

/** Store flags other code already reads, mirrored onto dock panels. */
const PANEL_STORE_BINDINGS = Object.freeze([
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
