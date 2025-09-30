import React, { useEffect, useRef } from 'react';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../js/core/store.js';
import { ColoringPanel } from './ColoringPanel.jsx';
import { VisualStyle } from './VisualStyle.jsx';
import { AdvancedFeatures } from './AdvancedFeatures.jsx';
import { TreeStructure } from './TreeStructure.jsx';

export function Appearance() {
  const dimming = useAppStore((s) => s.dimmingEnabled);
  const treeController = useAppStore((s) => s.treeController);
  const setDimmingEnabled = useAppStore((s) => s.setDimmingEnabled);

  // Bridge Web Component events/properties for the Focus toggle (md-switch)
  const focusSwitchRef = useRef(null);
  useEffect(() => {
    const el = focusSwitchRef.current;
    if (!el) return;
    // Reflect store state to the switch property
    try { el.selected = !!dimming; } catch {}
  }, [dimming]);

  useEffect(() => {
    const el = focusSwitchRef.current;
    if (!el) return;
    const onChange = async (e) => {
      try {
        const enabled = !!e.target.selected;
        setDimmingEnabled(enabled);
        await treeController?.renderAllElements?.();
      } catch {}
    };
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [setDimmingEnabled, treeController]);

  return (
    <div className="appearance-root" data-react-component="appearance">
      {/* Tree Structure Controls */}
      <TreeStructure />

      {/* Visual Style Controls */}
      <VisualStyle />

      {/* Coloring Features */}
      <ColoringPanel />

      {/* Focus & Highlighting Controls */}
      <div>
        <h3 className="md-typescale-title-medium section-title">
          <md-icon className="icon-small">center_focus_strong</md-icon>
          Focus & Highlighting
        </h3>
        <div className="section-body">
          <label className="row-16" style={{ cursor: 'pointer' }}>
            <md-switch
              ref={focusSwitchRef}
              id="dim-non-descendants-toggle"
              aria-labelledby="dim-non-descendants-label"
              aria-describedby="dim-non-descendants-desc"
              {...(dimming ? { selected: '' } : {})}
            ></md-switch>
            <div style={{ flex: 1 }}>
              <div id="dim-non-descendants-label" style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                <md-icon className="icon-small">visibility</md-icon>
                Focus on Active Subtree
              </div>
              <div id="dim-non-descendants-desc" className="md-typescale-body-medium muted-text">Dim all non-descendants of the active edge</div>
            </div>
          </label>
        </div>
      </div>

      {/* Advanced Features */}
      <AdvancedFeatures />

    </div>
  );
}
