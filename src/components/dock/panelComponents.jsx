import React from 'react';
import { TreePanel } from './panels/TreePanel.jsx';
import { SettingsPanel } from './panels/SettingsPanel.jsx';
import {
  AlignmentBody,
  InspectorBody,
  MovedSubtreesBody,
  TaxaColoringBody,
} from './panelBodies.jsx';

/** Wrap each body once so it keeps its state and scrolls on its own. */
function createPanelComponent(id, Component) {
  const Wrapped = () => (
    <div className="dock-panel" data-panel-id={id}>
      <React.Suspense fallback={null}>
        <Component />
      </React.Suspense>
    </div>
  );
  Wrapped.displayName = `DockPanel(${id})`;
  return Wrapped;
}

const PANEL_BODIES = {
  tree: TreePanel,
  settings: SettingsPanel,
  inspector: InspectorBody,
  'moved-subtrees': MovedSubtreesBody,
  alignment: AlignmentBody,
  'taxa-coloring': TaxaColoringBody,
};

export const PANEL_COMPONENTS = Object.fromEntries(
  Object.entries(PANEL_BODIES).map(([id, Component]) => [id, createPanelComponent(id, Component)])
);
