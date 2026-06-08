import React from 'react';
import { useMSA } from '../useMSA.js';

export function MSARegionOverrides() {
  const { msaRegion } = useMSA();
  const regionLabel = msaRegion ? `${msaRegion.start}-${msaRegion.end}` : 'None';

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Alignment region">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Region
      </span>
      <span
        className="inline-flex h-7 min-w-24 items-center justify-center rounded border border-border/40 bg-background/40 px-2 text-xs tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {regionLabel}
      </span>
    </div>
  );
}
