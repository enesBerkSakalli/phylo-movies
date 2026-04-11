import React from 'react';
import { useMSA } from '../MSAContext';
import { Separator } from '@/components/ui/separator';

export function MSAVisibleRange() {
  const { visibleRange } = useMSA();

  if (!visibleRange || !Number.isFinite(visibleRange.c0) || !Number.isFinite(visibleRange.c1)) {
    return null;
  }

  return (
    <>
      <Separator orientation="vertical" className="h-4 mx-2 opacity-40" />
      <div className="text-2xs text-muted-foreground font-medium uppercase tracking-tight">
        Cols: {visibleRange.c0 + 1}-{visibleRange.c1 + 1}
      </div>
    </>
  );
}
