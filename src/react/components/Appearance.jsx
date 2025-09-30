import React, { useEffect, useRef } from 'react';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../js/core/store.js';
import { ColoringPanel } from './ColoringPanel.jsx';
import { VisualStyle } from './VisualStyle.jsx';
import { AdvancedFeatures } from './AdvancedFeatures.jsx';
import { TreeStructure } from './TreeStructure.jsx';

export function Appearance() {
  const fontSize = useAppStore((s) => s.fontSize);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const monophyletic = useAppStore((s) => s.monophyleticColoringEnabled);
  const activeChange = useAppStore((s) => s.activeChangeEdgesEnabled);
  const marked = useAppStore((s) => s.markedComponentsEnabled);
  const dimming = useAppStore((s) => s.dimmingEnabled);
  const trailsEnabled = useAppStore((s) => s.trailsEnabled);
  const trailLength = useAppStore((s) => s.trailLength);
  const trailOpacity = useAppStore((s) => s.trailOpacity);
  const trailThickness = useAppStore((s) => s.trailThickness);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const branchTransformation = useAppStore((s) => s.branchTransformation);
  const treeController = useAppStore((s) => s.treeController);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const setMonophyleticColoring = useAppStore((s) => s.setMonophyleticColoring);
  const setActiveChangeEdgesEnabled = useAppStore((s) => s.setActiveChangeEdgesEnabled);
  const setMarkedComponentsEnabled = useAppStore((s) => s.setMarkedComponentsEnabled);
  const setDimmingEnabled = useAppStore((s) => s.setDimmingEnabled);
  const setTrailLength = useAppStore((s) => s.setTrailLength);
  const setTrailOpacity = useAppStore((s) => s.setTrailOpacity);
  const setTrailThickness = useAppStore((s) => s.setTrailThickness);
  const toggleCameraMode = useAppStore((s) => s.toggleCameraMode);
  const setBranchTransformation = useAppStore((s) => s.setBranchTransformation);
  const setActiveChangeEdgeColor = useAppStore((s) => s.setActiveChangeEdgeColor);
  const setMarkedColor = useAppStore((s) => s.setMarkedColor);
  const setDimmedColor = useAppStore((s) => s.setDimmedColor);

  const fontSizeNumber = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize || 1.8);

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
