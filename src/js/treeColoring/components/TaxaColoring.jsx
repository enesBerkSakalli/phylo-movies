import { UIComponentFactory } from './UIComponentFactory.js';
import { useAppStore } from '../../core/store.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TaxaColoringWindow } from '@/react/components/taxa-coloring/TaxaColoringWindow.jsx';
import 'winbox/dist/css/winbox.min.css';

// Import the component's stylesheet for any remaining layout specifics (safe to keep)
// Removed legacy taxa-coloring-window.css (React/shadcn handles styling)

export default class TaxaColoring {
  static currentInstance = null;

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
    this.createWindow();
  }

  async createWindow() {
    try {
      const { windowContent, colorWin } = await UIComponentFactory.createColorAssignmentWindow(() => this.handleClose());
      this.winBoxInstance = colorWin;
      this.container = windowContent;

      // Mount React UI inside WinBox content
      this.reactRoot = createRoot(this.container);
      this.reactRoot.render(
        <TaxaColoringWindow
          taxaNames={this.taxaNames}
          originalColorMap={this.originalColorMap}
          onApply={(result) => {
            this.onComplete(result);
          }}
          onClose={() => {
            try { this.winBoxInstance?.close(); } catch {}
          }}
        />
      );
    } catch (error) {
      console.error('Failed to create taxa coloring window:', error);
      alert(`Failed to open taxa coloring window: ${error.message}`);
    }
  }

  handleClose() {
    if (TaxaColoring.currentInstance === this) {
      TaxaColoring.currentInstance = null;
    }
    // Unmount React root if mounted
    try { this.reactRoot?.unmount(); } catch {}
  }

  close() {
    try { this.winBoxInstance?.close(); } catch {}
    this.handleClose();
  }
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
