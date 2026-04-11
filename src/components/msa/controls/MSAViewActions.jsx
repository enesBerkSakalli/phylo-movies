import React from 'react';
import { useMSA } from '../MSAContext';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function MSAViewActions() {
  const { triggerViewAction } = useMSA();

  return (
    <>
      <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('ZOOM_IN')} title="Zoom In" className="text-muted-foreground hover:text-foreground hover:bg-background/80">
        <ZoomIn className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('ZOOM_OUT')} title="Zoom Out" className="text-muted-foreground hover:text-foreground hover:bg-background/80">
        <ZoomOut className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => triggerViewAction('RESET')} title="Reset View" className="text-muted-foreground hover:text-foreground hover:bg-background/80">
        <RotateCcw className="size-3.5" />
      </Button>
    </>
  );
}
