import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../js/core/store.js';

export function AdvancedFeatures() {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const trailsEnabled = useAppStore((s) => s.trailsEnabled);
  const trailLength = useAppStore((s) => s.trailLength);
  const trailOpacity = useAppStore((s) => s.trailOpacity);
  const trailThickness = useAppStore((s) => s.trailThickness);

  const treeController = useAppStore((s) => s.treeController);
  const toggleCameraMode = useAppStore((s) => s.toggleCameraMode);
  const setTrailLength = useAppStore((s) => s.setTrailLength);
  const setTrailOpacity = useAppStore((s) => s.setTrailOpacity);
  const setTrailThickness = useAppStore((s) => s.setTrailThickness);
  const setTrailsEnabled = useAppStore((s) => s.setTrailsEnabled);

  // Bridge Web Component events/properties for the trails toggle (md-switch)
  const trailsSwitchRef = useRef(null);
  useEffect(() => {
    const el = trailsSwitchRef.current;
    if (!el) return;
    try { el.selected = !!trailsEnabled; } catch {}
  }, [trailsEnabled]);

  useEffect(() => {
    const el = trailsSwitchRef.current;
    if (!el) return;
    const onChange = async (e) => {
      try {
        const enabled = !!e.target.selected;
        setTrailsEnabled(enabled);
        await treeController?.renderAllElements?.();
      } catch {}
    };
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [setTrailsEnabled, treeController]);

  return (
    <div>
      <h3 className="md-typescale-title-medium section-title">
        <md-icon className="icon-small">science</md-icon>
        Advanced Features
      </h3>
      <div className="section-body">
        <md-outlined-button
          id="camera-mode-button"
          has-icon
          className="full-width"
          onClick={() => {
            try {
              const newMode = toggleCameraMode();
              treeController?.setCameraMode?.(newMode);
            } catch {}
          }}
        >
          <md-icon slot="icon">3d_rotation</md-icon>
          <span id="camera-mode-text">{cameraMode === 'orbit' ? '3D View' : '2D View'}</span>
        </md-outlined-button>

        <label className="row-16" style={{ cursor: 'pointer', marginTop: 12 }}>
          <md-switch
            ref={trailsSwitchRef}
            id="trails-toggle"
            aria-labelledby="trails-label"
            aria-describedby="trails-desc"
            {...(trailsEnabled ? { selected: '' } : {})}
          ></md-switch>
          <div style={{ flex: 1 }}>
            <div id="trails-label" style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
              <md-icon className="icon-small">timeline</md-icon>
              Motion Trails
            </div>
            <div id="trails-desc" className="md-typescale-body-medium muted-text">Show faint streaming trails for moving elements</div>
          </div>
        </label>

        <div className="section-body section-body--compact" style={{ gap: 8 }}>
          <div>
            <label className="control-label" title="Number of historical positions per element">
              <md-icon className="icon-small">route</md-icon>
              <span id="trail-length-label">Trail Length</span>: <span id="trail-length-value">{trailLength}</span>
            </label>
            <md-slider
              id="trail-length"
              min="2"
              max="40"
              step="1"
              value={String(trailLength)}
              aria-labelledby="trail-length-label"
              labeled
              disabled={!trailsEnabled}
              onInput={async (e) => {
                setTrailLength(parseInt(e.target.value, 10));
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
            ></md-slider>
          </div>
          <div>
            <label className="control-label" title="Trail opacity (0–1)">
              <md-icon className="icon-small">opacity</md-icon>
              <span id="trail-opacity-label">Trail Opacity</span>: <span id="trail-opacity-value">{trailOpacity}</span>
            </label>
            <md-slider
              id="trail-opacity"
              min="0"
              max="1"
              step="0.05"
              value={String(trailOpacity)}
              aria-labelledby="trail-opacity-label"
              labeled
              disabled={!trailsEnabled}
              onInput={async (e) => {
                setTrailOpacity(parseFloat(e.target.value));
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
            ></md-slider>
          </div>
          <div>
            <label className="control-label" title="Trail thickness relative to branch width">
              <md-icon className="icon-small">line_weight</md-icon>
              <span id="trail-thickness-label">Trail Thickness</span>: <span id="trail-thickness-value">{trailThickness}</span>
            </label>
            <md-slider
              id="trail-thickness"
              min="0.1"
              max="5"
              step="0.1"
              value={String(trailThickness)}
              aria-labelledby="trail-thickness-label"
              labeled
              disabled={!trailsEnabled}
              onInput={async (e) => {
                setTrailThickness(parseFloat(e.target.value));
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
            ></md-slider>
          </div>
        </div>
      </div>
    </div>
  );
}
