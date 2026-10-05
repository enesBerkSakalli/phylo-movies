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
