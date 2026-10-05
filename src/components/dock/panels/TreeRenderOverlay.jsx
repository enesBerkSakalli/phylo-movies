import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../../state/phyloStore/store.js';

export function VisualizationTreeRenderOverlay({ visible: visibleOverride } = {}) {
  const storeVisible = useAppStore((state) => state.renderInProgress);
  const visible = typeof visibleOverride === 'boolean' ? visibleOverride : storeVisible;

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/45 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-md border border-border/70 bg-card/95 px-4 py-3 text-card-foreground shadow-lg">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Loading tree view</span>
          <span className="text-xs text-muted-foreground">Preparing the visible layout</span>
        </div>
      </div>
    </div>
  );
}
