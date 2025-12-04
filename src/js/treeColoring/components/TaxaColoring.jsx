import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Palette, X } from 'lucide-react';
import { useAppStore } from '../../core/store.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { applyColoringData } from '../utils/GroupingUtils.js';
import { TaxaColoringWindow } from '@/react/components/taxa-coloring/TaxaColoringWindow.jsx';

// Import the component's stylesheet for any remaining layout specifics (safe to keep)
// Removed legacy taxa-coloring-window.css (React/shadcn handles styling)

export function openTaxaColoringFromStore() {
  const store = useAppStore.getState?.();
  const { movieData, updateTaxaColors, setTaxaGrouping } = store || {};

  const taxaNames = movieData?.sorted_leaves || [];
  if (!taxaNames.length) {
    alert("No taxa names available for coloring.");
    return;
  }

  // Create a complete color map that includes both system colors and current taxa colors
  const completeColorMap = { ...TREE_COLOR_CATEGORIES };
  taxaNames.forEach((taxon) => {
    completeColorMap[taxon] = TREE_COLOR_CATEGORIES[taxon] || TREE_COLOR_CATEGORIES.defaultColor || "#000000";
  });

  new TaxaColoring(
    taxaNames,
    completeColorMap,
    (colorData) => {
      const newColorMap = applyColoringData(colorData, taxaNames, TREE_COLOR_CATEGORIES);
      updateTaxaColors?.(newColorMap);

      // Persist grouping info for UI (tooltips)
      try {
        setTaxaGrouping?.({
          mode: colorData?.mode || 'taxa',
          separator: colorData?.separator || null,
          strategyType: colorData?.strategyType || null,
          csvTaxaMap: colorData?.csvTaxaMap ? Object.fromEntries(colorData.csvTaxaMap) : null,
          groupColorMap: colorData?.groupColorMap ? Object.fromEntries(colorData.groupColorMap) : null,
        });
      } catch (_) { /* ignore */ }
    }
  );
}

export default class TaxaColoring {
  static currentInstance = null;
  static lastWindowState = null;

  constructor(taxaNames, originalColorMap, onComplete) {
    if (TaxaColoring.currentInstance) {
      TaxaColoring.currentInstance.close();
      TaxaColoring.currentInstance = null;
    }
    TaxaColoring.currentInstance = this;

    this.taxaNames = taxaNames || [];
    this.originalColorMap = originalColorMap || {};
    this.onComplete = onComplete || (() => {});

    this.reactRoot = null;
    this.container = null;
    this.windowState = TaxaColoring.lastWindowState || this._getDefaultWindowState();
    TaxaColoring.lastWindowState = this.windowState;
    this.createWindow();
  }

  _getDefaultWindowState() {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    return {
      x: Math.max(24, Math.round((viewportWidth - 980) / 2)),
      y: Math.max(24, Math.round((viewportHeight - 720) / 2)),
      width: Math.min(viewportWidth - 48, 1100),
      height: Math.min(viewportHeight - 48, 760),
    };
  }

  async createWindow() {
    try {
      this.container = document.createElement('div');
      this.container.id = 'taxa-coloring-rnd-root';
      this.container.style.position = 'fixed';
      this.container.style.inset = '0';
      this.container.style.zIndex = '50';
      this.container.style.pointerEvents = 'none';
      document.body.appendChild(this.container);

      this.reactRoot = createRoot(this.container);
      const persistWindowState = (partial) => {
        this.windowState = { ...this.windowState, ...(partial || {}) };
        TaxaColoring.lastWindowState = this.windowState;
      };
      const handleClose = () => this.close();

      this.reactRoot.render(
        <TaxaColoringRndWindow
          taxaNames={this.taxaNames}
          originalColorMap={this.originalColorMap}
          onApply={(result) => { this.onComplete(result); }}
          onClose={handleClose}
          initialState={this.windowState}
          onWindowChange={persistWindowState}
        />
      );
    } catch (error) {
      console.error('Failed to create taxa coloring window:', error);
      alert(`Failed to open taxa coloring window: ${error.message}`);
      try {
        if (this.container?.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      } catch {}
      this.reactRoot = null;
      this.container = null;
      TaxaColoring.currentInstance = null;
    }
  }

  close() {
    try {
      this.reactRoot?.unmount();
    } catch {}
    try {
      if (this.container?.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    } catch {}
    this.reactRoot = null;
    this.container = null;
    if (TaxaColoring.currentInstance === this) {
      TaxaColoring.currentInstance = null;
    }
  }
}

function TaxaColoringRndWindow({ taxaNames, originalColorMap, onApply, onClose, initialState, onWindowChange }) {
  const initialPosition = useMemo(() => ({
    x: initialState?.x ?? 60,
    y: initialState?.y ?? 60,
  }), [initialState?.x, initialState?.y]);
  const initialSize = useMemo(() => ({
    width: initialState?.width ?? 980,
    height: initialState?.height ?? 720,
  }), [initialState?.width, initialState?.height]);

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  const handleDragStop = (_e, data) => {
    const next = { x: data.x, y: data.y };
    setPosition(next);
    onWindowChange?.(next);
  };

  const handleResizeStop = (_e, _dir, ref, _delta, pos) => {
    const nextSize = {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
    };
    const nextPos = { x: pos.x, y: pos.y };
    setSize(nextSize);
    setPosition(nextPos);
    onWindowChange?.({ ...nextSize, ...nextPos });
  };

  return (
    <Rnd
      bounds="window"
      minWidth={760}
      minHeight={520}
      size={size}
      position={position}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      dragHandleClassName="taxa-coloring-drag-handle"
      className="fixed z-50 pointer-events-auto shadow-2xl border border-border rounded-xl bg-card overflow-hidden"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <div className="flex h-full flex-col bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/90 taxa-coloring-drag-handle cursor-move select-none">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="size-5 text-primary" aria-hidden />
            <div className="flex flex-col leading-tight">
              <span>Taxa Coloring</span>
              <span className="text-xs font-normal text-muted-foreground">Assign palettes, groups, or CSV imports.</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close taxa coloring window">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <TaxaColoringWindow
            taxaNames={taxaNames}
            originalColorMap={originalColorMap}
            onApply={onApply}
            onClose={onClose}
          />
        </div>
      </div>
    </Rnd>
  );
}

// Independent legend control (vertical list in visualization page)
export function renderTaxaLegend(grouping) {
  const el = document.getElementById('taxaLegend');
  if (!el) return;

  // Clear
  el.innerHTML = '';

  if (!grouping || grouping.mode === 'taxa') {
    el.style.display = 'none';
    return;
  }

  const colorMap = grouping.groupColorMap || {};
  const names = Object.keys(colorMap);
  if (!names.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';

  const frag = document.createDocumentFragment();
  names.forEach((name) => {
    const color = colorMap[name] || '#666';
    const item = document.createElement('div');
    item.className = 'taxa-legend-chip';
    item.innerHTML = `<span class="swatch" style="background:${color}"></span><span class="label" title="${name}">${name}</span>`;
    frag.appendChild(item);
  });

  el.appendChild(frag);
}

// Keep legend in sync with store.taxaGrouping
try {
  const store = useAppStore;
  let prev = store.getState().taxaGrouping;

  // Initial render (when page loads or refreshes)
  renderTaxaLegend(prev);

  // Subscribe to grouping changes
  store.subscribe((state) => {
    if (state.taxaGrouping !== prev) {
      prev = state.taxaGrouping;
      renderTaxaLegend(state.taxaGrouping);
    }
  });
} catch (_) { /* store may not be initialized yet */ }
