import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Palette, X } from 'lucide-react';
import { useAppStore } from '../../core/store.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { applyColoringData } from '../utils/GroupingUtils.js';
import { TaxaColoringWindow } from '@/react/components/taxa-coloring/TaxaColoringWindow.jsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function openTaxaColoringFromStore() {
  const store = useAppStore.getState?.();
  const { movieData, updateTaxaColors, setTaxaGrouping, taxaGrouping } = store || {};

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
      setTaxaGrouping?.({
        mode: colorData?.mode || 'taxa',
          separators: colorData?.separators || null,
          strategyType: colorData?.strategyType || null,
          segmentIndex: colorData?.segmentIndex,
          useRegex: colorData?.useRegex,
          regexPattern: colorData?.regexPattern,
          csvTaxaMap: colorData?.csvTaxaMap ? Object.fromEntries(colorData.csvTaxaMap) : null,
          groupColorMap: colorData?.groupColorMap || null,
      });
    },
    taxaGrouping || {}
  );
}

export default class TaxaColoring {
  static currentInstance = null;
  static lastWindowState = null;

  constructor(taxaNames, originalColorMap, onComplete, initialSettings = {}) {
    if (TaxaColoring.currentInstance) {
      TaxaColoring.currentInstance.close();
      TaxaColoring.currentInstance = null;
    }
    TaxaColoring.currentInstance = this;

    this.taxaNames = taxaNames || [];
    this.originalColorMap = originalColorMap || {};
    this.onComplete = onComplete || (() => {});
    this.initialSettings = initialSettings;

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

  createWindow() {
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
          initialSettings={this.initialSettings}
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

function TaxaColoringRndWindow({ taxaNames, originalColorMap, onApply, onClose, initialState, onWindowChange, initialSettings }) {
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
      className="fixed z-50 pointer-events-auto shadow-2xl border border-border/60 rounded-xl bg-card/95 overflow-hidden"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/40 bg-card/50 taxa-coloring-drag-handle cursor-move select-none transition-colors hover:bg-card/70 group/header">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner group-hover/header:rotate-12 transition-transform duration-300">
               <Palette className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-foreground">Taxa Coloring</span>
              <span className="text-[10px] font-normal text-muted-foreground/80 tracking-wide uppercase">Assignment Manager</span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent variant="destructive">Close Coloring Window</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-background/50">
          <TaxaColoringWindow
            taxaNames={taxaNames}
            originalColorMap={originalColorMap}
            onApply={onApply}
            onClose={onClose}
            initialState={initialSettings}
          />
        </div>
      </div>
    </Rnd>
  );
}
