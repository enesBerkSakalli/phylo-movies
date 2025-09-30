import React from 'react';
import { useAppStore } from '../../js/core/store.js';

export function VisualStyle() {
  const fontSize = useAppStore((s) => s.fontSize);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const treeController = useAppStore((s) => s.treeController);

  const fontSizeNumber = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize || 1.8);

  return (
    <div>
      <h3 className="md-typescale-title-medium section-title">
        <md-icon className="icon-small">tune</md-icon>
        Visual Style
      </h3>
      <div className="section-body">
        <div>
          <label className="control-label" title="Adjust label text size" aria-label="Label size control">
            <md-icon className="icon-small">text_fields</md-icon>
            <span id="font-size-label">Label Size</span>: <span id="font-size-value">{(fontSizeNumber || 1.8).toFixed(1)}em</span>
          </label>
          <md-slider
            id="font-size"
            min="0.5"
            max="10"
            step="0.1"
            value={String(fontSizeNumber || 1.8)}
            aria-labelledby="font-size-label"
            labeled
            onInput={(e) => {
              setFontSize(e.target.value);
            }}
          ></md-slider>
        </div>

        <div>
          <label className="control-label" title="Adjust branch line width" aria-label="Branch width control">
            <md-icon className="icon-small">brush</md-icon>
            <span id="stroke-width-label">Branch Width</span>: <span id="stroke-width-value">{strokeWidth}</span>
          </label>
          <md-slider
            id="stroke-width"
            min="1"
            max="30"
            step="0.2"
            value={String(strokeWidth || 3)}
            aria-labelledby="stroke-width-label"
            labeled
            onInput={async (e) => {
              setStrokeWidth(e.target.value);
              try { await treeController?.renderAllElements?.(); } catch {}
            }}
          ></md-slider>
        </div>
      </div>
    </div>
  );
}

