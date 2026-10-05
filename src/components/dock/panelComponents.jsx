import React, { useEffect, useState } from 'react';
import { PanelVisibility } from './PanelVisibility.js';
import { TreePanel } from './panels/TreePanel.jsx';
import { SettingsPanel } from './panels/SettingsPanel.jsx';

function useDockVisibility(api) {
  const [visible, setVisible] = useState(() => api?.isVisible ?? true);
  useEffect(() => {
    if (!api) return undefined;
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
