import React from 'react';
import { useMSA } from '../useMSA.js';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function MSAViewActions() {
  const { zoomIn, zoomOut, fitAlignment } = useMSA();

  return (
    <>
      <AppTooltip content="Zoom in alignment" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={zoomIn}
          aria-label="Zoom in alignment"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ZoomIn aria-hidden />
        </Button>
      </AppTooltip>
      <AppTooltip content="Zoom out alignment" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={zoomOut}
          aria-label="Zoom out alignment"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ZoomOut aria-hidden />
        </Button>
      </AppTooltip>
      <AppTooltip content="Reset alignment view" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={fitAlignment}
          aria-label="Reset alignment view"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <RotateCcw aria-hidden />
        </Button>
      </AppTooltip>
    </>
  );
}
