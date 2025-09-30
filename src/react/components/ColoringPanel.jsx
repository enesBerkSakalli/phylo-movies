import React, { useEffect, useRef } from 'react';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../js/core/store.js';

export function ColoringPanel() {
  const monophyletic = useAppStore((s) => s.monophyleticColoringEnabled);
  const activeChange = useAppStore((s) => s.activeChangeEdgesEnabled);
  const marked = useAppStore((s) => s.markedComponentsEnabled);
  const treeController = useAppStore((s) => s.treeController);

  const setMonophyleticColoring = useAppStore((s) => s.setMonophyleticColoring);
  const setActiveChangeEdgesEnabled = useAppStore((s) => s.setActiveChangeEdgesEnabled);
  const setMarkedComponentsEnabled = useAppStore((s) => s.setMarkedComponentsEnabled);
  const setActiveChangeEdgeColor = useAppStore((s) => s.setActiveChangeEdgeColor);
  const setMarkedColor = useAppStore((s) => s.setMarkedColor);
  const setDimmedColor = useAppStore((s) => s.setDimmedColor);

  // Bridge Web Component md-switch events/properties for reliable behavior
  const monoRef = useRef(null);
  const activeRef = useRef(null);
  const markedRef = useRef(null);

  // Reflect store state -> switch.selected
  useEffect(() => { try { if (monoRef.current) monoRef.current.selected = !!monophyletic; } catch {} }, [monophyletic]);
  useEffect(() => { try { if (activeRef.current) activeRef.current.selected = !!activeChange; } catch {} }, [activeChange]);
  useEffect(() => { try { if (markedRef.current) markedRef.current.selected = !!marked; } catch {} }, [marked]);

  // Listen to native 'change' events and update store
  useEffect(() => {
    const el = monoRef.current; if (!el) return;
    const onChange = async (e) => { const enabled = !!e.target.selected; setMonophyleticColoring(enabled); try { await treeController?.renderAllElements?.(); } catch {} };
    el.addEventListener('change', onChange); return () => el.removeEventListener('change', onChange);
  }, [setMonophyleticColoring, treeController]);

  useEffect(() => {
    const el = activeRef.current; if (!el) return;
    const onChange = async (e) => { const enabled = !!e.target.selected; setActiveChangeEdgesEnabled(enabled); try { await treeController?.renderAllElements?.(); } catch {} };
    el.addEventListener('change', onChange); return () => el.removeEventListener('change', onChange);
  }, [setActiveChangeEdgesEnabled, treeController]);

  useEffect(() => {
    const el = markedRef.current; if (!el) return;
    const onChange = async (e) => { const enabled = !!e.target.selected; setMarkedComponentsEnabled(enabled); try { await treeController?.renderAllElements?.(); } catch {} };
    el.addEventListener('change', onChange); return () => el.removeEventListener('change', onChange);
  }, [setMarkedComponentsEnabled, treeController]);

  return (
    <div>
      <h3 className="md-typescale-title-medium section-title">
        <md-icon className="icon-small">palette</md-icon>
        Coloring & Styling
      </h3>
      <div className="section-body">
          <md-filled-button id="taxa-coloring-button" has-icon className="full-width">
            <md-icon slot="icon">palette</md-icon>
            Taxa Coloring
          </md-filled-button>

          <label className="row-16" style={{ cursor: 'pointer' }}>
          <md-switch
            ref={monoRef}
            id="monophyletic-coloring"
            aria-labelledby="monophyletic-coloring-label"
            aria-describedby="monophyletic-coloring-desc"
            {...(monophyletic ? { selected: '' } : {})}
          ></md-switch>
          <div style={{ flex: 1 }}>
            <div id="monophyletic-coloring-label" style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
              <md-icon className="icon-small">color_lens</md-icon>
              Monophyletic Group Coloring
            </div>
            <div id="monophyletic-coloring-desc" className="md-typescale-body-medium muted-text">Enable coloring for monophyletic groups in the tree</div>
          </div>
        </label>

        <div>
          <label className="control-label">
            <md-icon className="icon-small">swap_horiz</md-icon>
            <span id="change-coloring-mode-label">Change Coloring Mode</span>
          </label>
          <md-outlined-select id="red-coloring-mode" className="full-width" value="highlight_solutions" aria-labelledby="change-coloring-mode-label" aria-describedby="change-coloring-mode-help">
            <md-select-option value="highlight_solutions"><div slot="headline">Highlight Subtrees</div></md-select-option>
            <md-select-option value="subtree_tracking"><div slot="headline">Subtree Tracking</div></md-select-option>
          </md-outlined-select>
          <div id="change-coloring-mode-help" className="md-typescale-body-small muted-text" style={{ marginTop: 4 }}>
            Highlight Subtrees: Shows accumulated changes<br />
            Subtree Tracking: Shows only moving elements
          </div>
        </div>

        <div>
          <h4 className="md-typescale-title-small subtitle">
            <md-icon className="icon-small" style={{ fontSize: 16 }}>highlight</md-icon>
            Highlighting Colors
          </h4>
            <div className="section-body section-body--compact">
              <div className="row-12">
              <md-switch
                ref={activeRef}
                id="active-change-edges-toggle"
                aria-labelledby="active-change-edges-label"
                {...(activeChange ? { selected: '' } : {})}
              ></md-switch>
              <md-icon className="icon-small">timeline</md-icon>
              <span id="active-change-edges-label" style={{ flex: 1 }}>Active Change Edges</span>
              <input
                type="color"
                id="active-change-edges-color"
                defaultValue={TREE_COLOR_CATEGORIES.activeChangeEdgeColor || '#2196f3'}
                className="color-swatch"
                aria-labelledby="active-change-edges-label"
                onInput={async (e) => {
                  setActiveChangeEdgeColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </div>
              <div className="row-12">
              <md-switch
                ref={markedRef}
                id="marked-components-toggle"
                aria-labelledby="marked-components-label"
                {...(marked ? { selected: '' } : {})}
              ></md-switch>
              <md-icon className="icon-small">flag</md-icon>
              <span id="marked-components-label" style={{ flex: 1 }}>Subtrees</span>
              <input
                type="color"
                id="marked-color"
                defaultValue={TREE_COLOR_CATEGORIES.markedColor || '#ff5722'}
                className="color-swatch"
                aria-labelledby="marked-components-label"
                onInput={async (e) => {
                  setMarkedColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </div>
            <label className="row-12">
              <md-icon className="icon-small">opacity</md-icon>
              <span id="dimmed-elements-label" style={{ flex: 1 }}>Dimmed Elements</span>
              <input
                type="color"
                id="dimmed-color"
                defaultValue={TREE_COLOR_CATEGORIES.dimmedColor || '#cccccc'}
                className="color-swatch"
                aria-labelledby="dimmed-elements-label"
                onInput={async (e) => {
                  setDimmedColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
